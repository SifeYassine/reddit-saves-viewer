import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MediaCarousel } from "@/components/MediaCarousel";
import { MediaItem } from "@/components/MediaItem";
import { getCommunityLabel, getCommunityUrl } from "@/lib/reddit";
import { ExternalLink } from "lucide-react";

export function PostCard({ post }) {
  if (!post) {
    return null;
  }

  // Links that are still being resolved are plain strings, with no type to display
  const validMedia = post.media_links?.filter((media) => media.type);
  const authorLabel = `u/${post.author}`;
  const communityLabel = getCommunityLabel(post.subreddit);

  return (
    <Card className="masonry-item overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.55),0_16px_40px_rgba(0,0,0,0.55)] hover:ring-white/25">
      <CardHeader className="pb-2">
        <a href={post.url} target="_blank" rel="noopener noreferrer" className="group">
          <CardTitle className="text-base font-semibold leading-snug line-clamp-3 group-hover:text-foreground/70 transition-colors duration-150">
            {post.title}
            <ExternalLink
              className="inline-block ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              size={14}
            />
          </CardTitle>
        </a>

        {/* Author & Subreddit */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
          <a
            href={`https://www.reddit.com/user/${post.author}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors duration-150 font-medium"
          >
            {authorLabel}
          </a>
          {/* A post on someone's own profile would otherwise name them twice */}
          {communityLabel !== authorLabel && (
            <>
              <span>·</span>
              <a
                href={getCommunityUrl(post.subreddit)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors duration-150 font-medium"
              >
                {communityLabel}
              </a>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Text content */}
        {post.content?.trim() && (
          <p className="text-sm text-muted-foreground line-clamp-5 leading-relaxed">{post.content}</p>
        )}

        {/* Media */}
        {validMedia?.length === 1 && (
          <div className="rounded-xl overflow-hidden bg-black">
            <MediaItem media={validMedia[0]} />
          </div>
        )}

        {/* Media Carousel */}
        {validMedia?.length > 1 && <MediaCarousel mediaItems={validMedia} />}
      </CardContent>
    </Card>
  );
}
