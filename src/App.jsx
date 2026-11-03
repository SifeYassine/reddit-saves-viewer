import { useState, useEffect } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SubredditFilter } from "@/components/SubredditFilter";
import { PostCard } from "@/components/PostCard";
import { Pagination } from "@/components/Pagination";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useRedditData } from "@/hooks/useRedditData";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Trash2, BookOpen, Filter } from "lucide-react";

export default function App() {
  const {
    posts,
    isLoading,
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
    totalPosts,
    allPostsCount,
  } = useRedditData();

  const [cacheSize, setCacheSize] = useState(0);
  const [showFilters, setShowFilters] = useState(true);

  // Calculate columns based on viewport
  function getColumnCount() {
    if (window.innerWidth >= 1536) return 4;
    if (window.innerWidth >= 1280) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  }

  const [columns, setColumns] = useState(getColumnCount());

  // Get cache size from server and setup resize listener
  useEffect(() => {
    async function fetchCacheStats() {
      try {
        const response = await api.get("/api/cache-stats");
        setCacheSize(response.data.cachedPosts);
      } catch (error) {
        console.error("Error fetching cache stats:", error);
      }
    }

    fetchCacheStats();

    const handleResize = () => setColumns(getColumnCount());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function handleClearCache() {
    if (confirm("Are you sure you want to clear all cached data?")) {
      try {
        await api.delete("/api/cache");
        setCacheSize(0);
        window.location.reload();
      } catch (error) {
        console.error("Error clearing cache:", error);
        alert("Failed to clear cache");
      }
    }
  }

  let emptyTitle = "No posts found";
  let emptyMessage = "Try adjusting your search or filters";

  if (postsError) {
    emptyTitle = "Couldn't load posts";
    emptyMessage = "The server didn't respond. Check that it's running, then try again.";
  } else if (totalPosts > 0) {
    emptyTitle = "Nothing to show on this page";
    emptyMessage = "These posts couldn't be read, but other pages may still work.";
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-destructive">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-6">
            {/* Title and Stats */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">Reddit Saves</h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                  <BookOpen size={16} />
                  {isLoading ? (
                    "Loading..."
                  ) : (
                    <>
                      {totalPosts.toLocaleString()} of {allPostsCount.toLocaleString()} posts
                      {selectedSubreddits.length > 0 &&
                        ` • Filtered by ${selectedSubreddits.length} subreddit${selectedSubreddits.length > 1 ? "s" : ""}`}
                      {searchQuery && ` • Searching for "${searchQuery}"`}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                  <Filter size={16} />
                  {showFilters ? "Hide" : "Show"} Filters
                </Button>
                {cacheSize > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearCache} className="gap-2">
                    <Trash2 size={16} />
                    Clear Cache ({cacheSize})
                  </Button>
                )}
              </div>
            </div>

            {/* Search and Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start animate-fade-in">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by title..." />
                <SubredditFilter
                  subreddits={subreddits}
                  selectedSubreddits={selectedSubreddits}
                  onChange={setSelectedSubreddits}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading && !posts.length ? (
          <div className="masonry" style={{ columnCount: columns }}>
            <LoadingSkeleton count={20} />
          </div>
        ) : (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-20">
                <h2 className="text-2xl font-semibold text-muted-foreground">{emptyTitle}</h2>
                <p className="text-muted-foreground mt-2">{emptyMessage}</p>
                {postsError && (
                  <Button variant="outline" className="mt-6" onClick={reloadPosts}>
                    Try again
                  </Button>
                )}
              </div>
            ) : (
              <div className="masonry" style={{ columnCount: columns }}>
                {posts.map((post) => (
                  <PostCard key={post.url} post={post} />
                ))}
              </div>
            )}

            {/* Pagination stays available, so an empty page never traps you */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              isLoading={isLoadingPosts}
            />
          </>
        )}
      </main>
    </div>
  );
}
