import { useState, useEffect, useMemo, useCallback } from "react";
import { loadCSVFile } from "@/lib/loadCSV";
import { api } from "@/lib/api";
import Fuse from "fuse.js";

export function useRedditData() {
  const [allRows, setAllRows] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [error, setError] = useState(null);
  const [postsError, setPostsError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  // Search and filter states
  const [searchQuery, setSearchQueryState] = useState("");
  const [selectedSubreddits, setSelectedSubredditsState] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 20;

  // Changing a filter returns to page 1 in the same update, so only one request is made
  const setSearchQuery = useCallback((query) => {
    setSearchQueryState(query);
    setCurrentPage(1);
  }, []);

  const setSelectedSubreddits = useCallback((subreddits) => {
    setSelectedSubredditsState(subreddits);
    setCurrentPage(1);
  }, []);

  const reloadPosts = useCallback(() => setReloadCount((count) => count + 1), []);

  // Load CSV on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const rows = await loadCSVFile("/db.csv");
        setAllRows(rows);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading CSV:", err);
        setError(err.message);
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Fuzzy search config
  const fuse = useMemo(() => {
    if (allRows.length === 0) {
      return null;
    }

    return new Fuse(allRows, {
      keys: ["title"],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [allRows]);

  // Filter and search rows
  const filteredRows = useMemo(() => {
    let result = allRows;

    if (searchQuery.trim() && fuse) {
      result = fuse.search(searchQuery).map((rslt) => rslt.item);
    }

    if (selectedSubreddits.length > 0) {
      const subredditSet = new Set(selectedSubreddits);
      result = result.filter((row) => subredditSet.has(row.subreddit));
    }

    return result;
  }, [allRows, selectedSubreddits, searchQuery, fuse]);

  // Get unique subreddits with post counts
  const subreddits = useMemo(() => {
    const counts = new Map();

    allRows.forEach(({ subreddit }) => {
      if (!subreddit) {
        return;
      }

      counts.set(subreddit, (counts.get(subreddit) || 0) + 1);
    });

    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allRows]);

  // Paginate filtered rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return filteredRows.slice(startIndex, startIndex + postsPerPage);
  }, [filteredRows, currentPage, postsPerPage]);

  const totalPages = Math.ceil(filteredRows.length / postsPerPage);

  // Fetch Reddit posts from server (with SQLite caching)
  useEffect(() => {
    if (paginatedRows.length === 0) {
      setPosts([]);
      setPostsError(null);
      setIsLoadingPosts(false);
      return undefined;
    }

    // Aborting when the page changes means an outdated response can never replace a newer one
    const controller = new AbortController();

    async function fetchPosts() {
      setIsLoadingPosts(true);
      setPostsError(null);

      try {
        const urls = paginatedRows.map((row) => row.url);
        const response = await api.post("/api/fetch-posts", { urls }, { signal: controller.signal });
        setPosts(response.data.posts);
        setIsLoadingPosts(false);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Error fetching posts:", err);
        setPosts([]);
        setPostsError(err.message);
        setIsLoadingPosts(false);
      }
    }

    fetchPosts();

    return () => controller.abort();
  }, [paginatedRows, reloadCount]);

  return {
    posts,
    isLoading: isLoading || isLoadingPosts,
    isLoadingPosts,
    error,
    postsError,
    reloadPosts,
    searchQuery,
    setSearchQuery,
    selectedSubreddits,
    setSelectedSubreddits,
    subreddits,
    currentPage,
    setCurrentPage,
    totalPages,
    totalPosts: filteredRows.length,
    allPostsCount: allRows.length,
  };
}
