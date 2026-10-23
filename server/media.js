import axios from "axios";
import { fetchGalleryLinks } from "./reddit.js";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) reddit-saves-browser";
const CONCURRENCY = 5;

const IMAGE_EXTENSION = /\.(png|jpe?g|jfif|webp|gif|avif)$/i;
const VIDEO_EXTENSION = /\.(mp4|webm)$/i;


const NONE = { status: "none", links: [] };
const UNAVAILABLE = { status: "unavailable", links: [] };
const available = (links) => ({ status: "available", links });
const pending = (link) => ({ status: "pending", links: [link] });

// Each resolved link records its type, since not every file URL has a telling extension
const image = (url) => ({ url, type: "image" });
const video = (url) => ({ url, type: "video" });
const fromContentType = (url, contentType) => (contentType.startsWith("video/") ? video(url) : image(url));

// Requests never throw on a status code here, as each caller decides what a status means
const http = axios.create({
  headers: { "User-Agent": USER_AGENT },
  timeout: 15000,
  validateStatus: () => true,
});

const isTransient = (status) => status === 0 || status === 429 || status >= 500;
const isRawLink = (link) => typeof link === "string";

function parseUrl(link) {
  try {
    return new URL(link);
  } catch {
    return null;
  }
}

function hostMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

// Saved posts can link anywhere, so never probe the local network
function isPublicHttpUrl(parsed) {
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return false;
  }

  const host = parsed.hostname;
  return !(
    host === "localhost" ||
    host.endsWith(".local") ||
    host.startsWith("[") ||
    /^(127|10|0|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host)
  );
}

// Ask for one byte: enough to learn what a URL really serves without downloading it
async function probe(url) {
  try {
    const response = await http.get(url, {
      headers: { Range: "bytes=0-0" },
      responseType: "stream",
      maxRedirects: 5,
    });

    response.data.destroy();

    const type = (response.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    const finalUrl = response.request?.res?.responseUrl ?? url;
    const isOk = response.status >= 200 && response.status < 300;

    return {
      type,
      finalUrl,
      isOk,
      // Imgur answers for deleted files with a placeholder image or its homepage
      isMedia: isOk && /^(image|video)\//.test(type) && !/\/removed\.[a-z]+$/i.test(finalUrl),
      isTransient: isTransient(response.status),
    };
  } catch {
    return { type: "", finalUrl: url, isOk: false, isMedia: false, isTransient: true };
  }
}

// Reddit video
async function resolveRedditVideo(link, parsed) {
  const [id, file] = parsed.pathname.split("/").filter(Boolean);

  if (!id) {
    return NONE;
  }

  // Older file names have no extension, like /abc/DASH_720, and adding one breaks them
  if (file) {
    return available([video(`https://v.redd.it${parsed.pathname}`)]);
  }

  // A bare v.redd.it link redirects to the post page, but its playlist names the files
  try {
    const response = await http.get(`https://v.redd.it/${id}/DASHPlaylist.mpd`);

    if (isTransient(response.status)) {
      return pending(link);
    }

    if (response.status !== 200) {
      return UNAVAILABLE;
    }

    const files = [...String(response.data).matchAll(/<BaseURL>([^<]+)<\/BaseURL>/g)]
      .map((match) => match[1])
      .filter((name) => !/audio/i.test(name));
    const quality = (name) => parseInt(name.match(/_(\d+)/)?.[1] ?? "0", 10);
    const best = files.sort((a, b) => quality(b) - quality(a))[0];

    return best ? available([video(`https://v.redd.it/${id}/${best}`)]) : UNAVAILABLE;
  } catch {
    return pending(link);
  }
}

function getGalleryId(parsed) {
  return hostMatches(parsed.hostname, "reddit.com") ? parsed.pathname.match(/^\/gallery\/([a-z0-9]+)/i)?.[1] : undefined;
}

// Reddit links are never files: either the post itself, or a gallery whose image data was missing
function resolveRedditLink(link, parsed, context) {
  const galleryId = getGalleryId(parsed);

  if (!galleryId) {
    return NONE;
  }

  if (galleryId === context.postId) {
    return UNAVAILABLE;
  }

  if (!context.galleries) {
    return pending(link);
  }

  const images = context.galleries.get(galleryId);
  return images?.length ? available(images.map(image)) : UNAVAILABLE;
}

async function resolveOtherLink(link, parsed) {
  if (!isPublicHttpUrl(parsed)) {
    return NONE;
  }

  if (IMAGE_EXTENSION.test(parsed.pathname)) {
    return available([image(link)]);
  }

  if (VIDEO_EXTENSION.test(parsed.pathname)) {
    return available([video(link)]);
  }

  const result = await probe(link);

  if (result.isMedia) {
    return available([fromContentType(link, result.type)]);
  }

  if (result.isTransient) {
    return pending(link);
  }

  // A page that loads is an article or site, while an error means the media is gone
  return result.isOk ? NONE : UNAVAILABLE;
}

async function resolveLink(link, context) {
  // Already resolved on an earlier attempt, while another link in the post stayed pending
  if (!isRawLink(link)) {
    return available([link]);
  }

  const parsed = parseUrl(link);

  if (!parsed) {
    return NONE;
  }

  const host = parsed.hostname;

  if (hostMatches(host, "reddit.com")) return resolveRedditLink(link, parsed, context);
  if (host === "v.redd.it") return resolveRedditVideo(link, parsed);

  return resolveOtherLink(link, parsed);
}

function getPostId(post) {
  return post.url?.match(/\/comments\/([^/]+)/)?.[1] ?? null;
}

async function resolvePost(post, sharedContext) {
  const context = { ...sharedContext, postId: getPostId(post) };

  try {
    const outcomes = [];

    for (const link of post.media_links) {
      outcomes.push(await resolveLink(link, context));
    }

    const links = outcomes.flatMap((outcome) => outcome.links);
    const hasStatus = (status) => outcomes.some((outcome) => outcome.status === status);
    let status = "none";

    if (hasStatus("pending")) status = "pending";
    else if (links.length > 0) status = "available";
    else if (hasStatus("unavailable")) status = "unavailable";

    return { ...post, media_links: links, media_status: status };
  } catch (error) {
    console.error(`Error resolving media for ${post.url}: ${error.message}`);
    return { ...post, media_status: "pending" };
  }
}

// A crosspost can point at a gallery under another id, which may still have its images
async function fetchOtherGalleries(posts) {
  const ids = new Set();

  for (const post of posts) {
    for (const link of post.media_links.filter(isRawLink)) {
      const parsed = parseUrl(link);
      const galleryId = parsed && getGalleryId(parsed);

      if (galleryId && galleryId !== getPostId(post)) {
        ids.add(galleryId);
      }
    }
  }

  return ids.size > 0 ? fetchGalleryLinks([...ids]) : new Map();
}

// Turn each post's raw links into direct file links and record what happened
export async function resolvePostsMedia(posts) {
  const sharedContext = {
    galleries: await fetchOtherGalleries(posts),
  };
  const resolved = new Array(posts.length);
  let next = 0;

  async function worker() {
    while (next < posts.length) {
      const index = next++;
      resolved[index] = await resolvePost(posts[index], sharedContext);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return resolved;
}
