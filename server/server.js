import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import path from "path";
import { fetchBatchFromReddit } from "./reddit.js";
import { resolvePostsMedia } from "./media.js";
import { retryPendingPosts } from "./retry.js";
import { getPosts, insertPosts, getPostsCount, deletePosts, closeDb, dbPath } from "./cache.js";

const rootPath = path.join(import.meta.dirname, "..", "public");
const PORT = process.env.PORT ?? 3000;
const BATCH_SIZE = 60;

// Initialize Fastify server instance
const fastify = Fastify({ logger: true });
// Register CORS
await fastify.register(fastifyCors, { origin: process.env.CLIENT_URL });
await fastify.register(fastifyStatic, { root: rootPath, prefix: "/public/" });

// Fetch posts with Batching & Caching
fastify.post("/api/fetch-posts", async (request) => {
  const { urls } = request.body;
  const postMap = getPosts(urls);
  const missingUrls = urls.filter((url) => !postMap.has(url));

  request.log.info(`Fetching ${urls.length} posts: ${postMap.size} cached, ${missingUrls.length} missing`);

  retryPendingPosts([...postMap.values()]);

  // Fetch missing posts in batches
  for (let i = 0; i < missingUrls.length; i += BATCH_SIZE) {
    const batch = missingUrls.slice(i, i + BATCH_SIZE);
    const batchPosts = await resolvePostsMedia(await fetchBatchFromReddit(batch));

    if (batchPosts.length > 0) {
      insertPosts(batchPosts);
    }

    for (const post of batchPosts) {
      postMap.set(post.url, post);
    }
  }

  // Return posts in the exact order requested
  return { posts: urls.map((url) => postMap.get(url)).filter(Boolean) };
});

// Get cache statistics
fastify.get("/api/cache-stats", async () => ({ cachedPosts: getPostsCount() }));

// Clear cache
fastify.delete("/api/cache", async () => {
  deletePosts();
  return { message: "Cache cleared successfully" };
});

// Server Lifecycle
async function start() {
  try {
    await fastify.listen({ port: PORT });
    fastify.log.info(`SQLite cache initialized at: ${dbPath}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  fastify.log.info(`Received ${signal}, closing server...`);
  await fastify.close();
  closeDb();
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

start();
