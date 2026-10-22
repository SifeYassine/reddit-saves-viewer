import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  url: text("url").primaryKey(),
  author: text("author"),
  title: text("title"),
  subreddit: text("subreddit"),
  content: text("content"),
  media_links: text("media_links").default("[]"),
  // available | none | unavailable | pending (still holds raw links, retried later)
  media_status: text("media_status").default("pending"),
  // Reddit's own copy of the media, kept so retries can still fall back to it
  preview_url: text("preview_url"),
  created_at: integer("created_at"),
});
