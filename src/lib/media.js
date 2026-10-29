// Mid-gray glass shared by video and carousel controls, readable over both white and black media
export const GLASS_PILL = "rounded-full bg-neutral-700/60 shadow-sm ring-1 ring-white/15 backdrop-blur-md";

// Redgifs publishes a thumbnail beside each video. Other hosts have no predictable one
export function getPosterUrl(url) {
  return url.includes("media.redgifs.com") ? url.replace(/\.mp4$/i, "-poster.jpg") : undefined;
}
