import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { count, eq, inArray } from "drizzle-orm";
import { posts as postsTable } from "./schema.js";

const baseDir = import.meta.dirname;
export const dbPath = path.join(baseDir, "cache.db");

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

function parsePost(post) {
  return { ...post, media_links: JSON.parse(post.media_links) };
}

// Get all cached posts
export function getPosts(urls) {
  const posts = db.select().from(postsTable).where(inArray(postsTable.url, urls)).all();
  return new Map(posts.map((post) => [post.url, parsePost(post)]));
}

// Get posts whose media links still need resolving
export function getPendingPosts() {
  return db.select().from(postsTable).where(eq(postsTable.media_status, "pending")).all().map(parsePost);
}

// Insert posts into the cache database
export function insertPosts(posts) {
  const postsToInsert = posts.map((post) => ({ ...post, media_links: JSON.stringify(post.media_links) }));
  db.insert(postsTable).values(postsToInsert).onConflictDoNothing().run();
}

// Update a post's resolved media
export function updatePostMedia({ url, media_links, media_status }) {
  db.update(postsTable)
    .set({ media_links: JSON.stringify(media_links), media_status })
    .where(eq(postsTable.url, url))
    .run();
}

// Get posts count
export function getPostsCount() {
  return db.select({ count: count() }).from(postsTable).get().count;
}

// Clear cache
export function deletePosts() {
  db.delete(postsTable).run();
}

// Close database connection
export function closeDb() {
  sqlite.close();
}
