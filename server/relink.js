import { closeDb, getPendingPosts, updatePostMedia } from "./cache.js";
import { resolvePostsMedia } from "./media.js";

const BATCH_SIZE = 50;

// Resolve every cached post that doesn't have direct file links yet
const posts = getPendingPosts();
const totals = {};

console.info(`Resolving media for ${posts.length} posts...`);

for (let i = 0; i < posts.length; i += BATCH_SIZE) {
  const resolvedPosts = await resolvePostsMedia(posts.slice(i, i + BATCH_SIZE));

  for (const post of resolvedPosts) {
    updatePostMedia(post);
    totals[post.media_status] = (totals[post.media_status] ?? 0) + 1;
  }

  console.info(`Processed ${Math.min(i + BATCH_SIZE, posts.length)} of ${posts.length}`);
}

console.info("Done:", totals);
closeDb();
