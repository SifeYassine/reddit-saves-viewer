import axios from "axios";

const DELAY_BTW_REQUESTS = 1000;
const MAX_RETRIES = 3;
const MIN_REMAINING_REQUESTS = 5;
const USER_AGENT = "windows:reddit-saves-browser:v0.1 (personal use)";
const ARCHIVE_URL = "https://arctic-shift.photon-reddit.com/api/posts/ids";
const ARCHIVE_TIMEOUT = 30000;

const rateLimit = { remaining: 1000, resetTime: Date.now() };

// Extract media links
function extractMediaLinks(mediaData) {
  if (!mediaData) {
    return [];
  }

  return Object.entries(mediaData).map(([key, item]) => {
    const extension = item?.m?.split("/")[1] || "jpg";
    return `https://i.redd.it/${key}.${extension}`;
  });
}

// Extract video media links
function extractVideoMediaLinks(postData, url) {
  const fallbackUrl = postData.media?.reddit_video?.fallback_url || postData.secure_media?.reddit_video?.fallback_url;

  return [fallbackUrl ?? url];
}

// Determine media type
function determineMediaType(postData) {
  const { url, is_video, is_self, media_metadata, crosspost_parent_list } = postData;

  if (crosspost_parent_list?.[0]) return "crosspost";
  if (is_self) return "none";
  if (is_video) return "video";
  if (media_metadata) return "gallery";
  if (url) return "direct";

  return "none";
}

// Collect each post's raw links: media.js turns them into direct file links
function resolveMediaLinks(postData) {
  const { url, media_metadata, crosspost_parent_list } = postData;
  const mediaType = determineMediaType(postData);

  switch (mediaType) {
    case "crosspost":
      return resolveMediaLinks(crosspost_parent_list[0]);

    case "video":
      return extractVideoMediaLinks(postData, url);

    case "gallery":
      return extractMediaLinks(media_metadata);

    case "direct":
      return [url];

    default:
      return [];
  }
}

// Reddit's own copy of the media, used if the original host no longer has it
function getPreviewUrl(postData) {
  const source = postData.crosspost_parent_list?.[0] ?? postData;

  return source.preview?.reddit_video_preview?.fallback_url ?? source.preview?.images?.[0]?.source?.url ?? null;
}

// Format post data directly from the post object
function formatPostData(postData, url) {
  if (!postData) {
    return null;
  }

  const { author, title, subreddit, selftext, created_utc } = postData;

  return {
    url,
    author,
    title,
    subreddit,
    content: selftext || "",
    media_links: resolveMediaLinks(postData),
    preview_url: getPreviewUrl(postData),
    created_at: created_utc,
  };
}

// Remember the limits Reddit reports with each response
function recordRateLimit(headers) {
  rateLimit.remaining = parseInt(headers["x-ratelimit-remaining"] ?? "1000", 10);
  rateLimit.resetTime = Date.now() + parseInt(headers["x-ratelimit-reset"] ?? "0", 10) * 1000;
}

// Before each request, wait out the window if it's nearly used up, then space requests apart
async function waitForRateLimit() {
  const now = Date.now();

  if (rateLimit.remaining < MIN_REMAINING_REQUESTS && now < rateLimit.resetTime) {
    const waitTime = rateLimit.resetTime - now;
    console.info(`Rate limit low (${rateLimit.remaining}). Waiting ${waitTime}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  await new Promise((resolve) => setTimeout(resolve, DELAY_BTW_REQUESTS));
}

// Network security answers with an HTML page, while a private subreddit's 403 is JSON
function isNetworkSecurityBlock(error) {
  return error.response?.status === 403 && String(error.response.headers["content-type"]).includes("text/html");
}

// Fetch one post by Id. Returns null if it can't be read
async function requestPost(id, retries = MAX_RETRIES) {
  await waitForRateLimit();

  try {
    // Reddit's network security blocks the bulk endpoints (/api/info, /by_id) for cookie sessions.
    // raw_json stops Reddit from escaping "&" as "&amp;" in links and text
    const response = await axios.get(`https://www.reddit.com/comments/${id}.json`, {
      headers: { Cookie: `reddit_session=${process.env.REDDIT_COOKIE}`, "User-Agent": USER_AGENT },
      params: { raw_json: 1, limit: 1 },
    });

    recordRateLimit(response.headers);

    return response.data?.[0]?.data?.children?.[0]?.data ?? null;
  } catch (error) {
    const isBlocked = isNetworkSecurityBlock(error);

    // Missing, or in a private or banned subreddit
    if (error.response?.status === 404 || (error.response?.status === 403 && !isBlocked)) {
      return null;
    }

    if (error.response?.status === 429 && retries > 0) {
      recordRateLimit(error.response.headers);
      return await requestPost(id, retries - 1);
    }

    throw error;
  }
}

// Fetch posts in bulk from the Arctic Shift archive, as a Map of Id -> post.
// It also keeps posts that Reddit no longer serves, but can lag behind very recent ones
async function fetchFromArchive(ids, retries = MAX_RETRIES) {
  try {
    const response = await axios.get(ARCHIVE_URL, {
      headers: { "User-Agent": USER_AGENT },
      params: { ids: ids.join(",") },
      timeout: ARCHIVE_TIMEOUT,
    });

    return new Map((response.data?.data ?? []).map((post) => [post.id, post]));
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      const reset = parseInt(error.response.headers["x-ratelimit-reset"] ?? "5", 10);

      console.info(`Archive rate limit reached. Waiting ${reset}s`);
      await new Promise((resolve) => setTimeout(resolve, reset * 1000));

      return await fetchFromArchive(ids, retries - 1);
    }

    console.error(`Error fetching from archive: ${error.message}`);
    return new Map();
  }
}

// Fetch the image links of galleries by Id. Returns null if a request failed
export async function fetchGalleryLinks(ids) {
  const archived = await fetchFromArchive(ids);
  const galleries = new Map();

  try {
    for (const id of ids) {
      const post = archived.get(id) ?? (await requestPost(id));

      if (post) {
        galleries.set(id, extractMediaLinks(post.media_metadata));
      }
    }

    return galleries;
  } catch (error) {
    console.error(`Error fetching galleries: ${error.message}`);
    return null;
  }
}

// Fetch multiple posts: in bulk from the archive, then one by one from Reddit for any it lacks
export async function fetchBatchFromReddit(urls) {
  const idsByUrl = new Map();

  for (const url of urls) {
    const id = url.match(/\/comments\/([^/]+)/)?.[1];

    if (id) {
      idsByUrl.set(url, id);
    }
  }

  if (idsByUrl.size === 0) {
    return [];
  }

  const archived = await fetchFromArchive([...idsByUrl.values()]);
  const posts = [];

  console.info(`Fetched ${archived.size} of ${idsByUrl.size} posts from the archive`);

  for (const [url, id] of idsByUrl) {
    if (archived.has(id)) {
      posts.push(formatPostData(archived.get(id), url));
      continue;
    }

    try {
      const post = await requestPost(id);

      if (post) {
        posts.push(formatPostData(post, url));
      }
    } catch (error) {
      console.error(`Error fetching ${url}: ${error.message}`);

      // Stop instead of repeating requests Reddit has refused
      if (isNetworkSecurityBlock(error)) {
        break;
      }
    }
  }

  return posts;
}
