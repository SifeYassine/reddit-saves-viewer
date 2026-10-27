import { updatePostMedia } from "./cache.js";
import { resolvePostsMedia } from "./media.js";

const RETRY_INTERVAL = 60 * 60 * 1000;

const lastAttempts = new Map();
let isRetrying = false;

// Retry pending posts in the background, so they never hold up a page.
// Each post is attempted at most once per interval, and only one retry runs at a time
export function retryPendingPosts(posts) {
  const now = Date.now();
  const duePosts = posts.filter(
    (post) => post.media_status === "pending" && now - (lastAttempts.get(post.url) ?? 0) >= RETRY_INTERVAL,
  );

  if (isRetrying || duePosts.length === 0) {
    return;
  }

  isRetrying = true;
  duePosts.forEach((post) => lastAttempts.set(post.url, now));

  resolvePostsMedia(duePosts)
    .then((resolvedPosts) => {
      for (const post of resolvedPosts) {
        updatePostMedia(post);

        if (post.media_status !== "pending") {
          lastAttempts.delete(post.url);
        }
      }
    })
    .catch((error) => console.error(`Error retrying pending posts: ${error.message}`))
    .finally(() => {
      isRetrying = false;
    });
}
