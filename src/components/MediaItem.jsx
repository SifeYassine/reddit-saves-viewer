import { useState } from "react";
import { VideoPlayer } from "@/components/ui/video-player";
import { getPosterUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

// How different an image's shape can be from its frame and still fill it, cropping the edges
const FILL_TOLERANCE = 1.2;

function isCloseToFrame(imageRatio, frameRatio) {
  return Math.max(imageRatio / frameRatio, frameRatio / imageRatio) <= FILL_TOLERANCE;
}

// `frameRatio` is the shape of the fixed frame this sits in, such as a carousel. Without one, media sets its own height
export function MediaItem({ media, frameRatio, onImageRatio }) {
  const [imageRatio, setImageRatio] = useState(null);
  const [hasFailed, setHasFailed] = useState(false);

  if (media.type === "video") {
    return <VideoPlayer src={media.url} poster={getPosterUrl(media.url)} muted fill={Boolean(frameRatio)} />;
  }

  if (hasFailed) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center bg-black text-sm text-white/60",
          frameRatio ? "h-full" : "aspect-video",
        )}
      >
        Image unavailable
      </div>
    );
  }

  const shouldFill = frameRatio && imageRatio && isCloseToFrame(imageRatio, frameRatio);

  return (
    <img
      src={media.url}
      alt="Post media"
      loading="lazy"
      draggable={false}
      className={cn("h-full w-full", shouldFill ? "object-cover" : "object-contain")}
      onLoad={(e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;

        if (naturalWidth && naturalHeight) {
          setImageRatio(naturalWidth / naturalHeight);
          onImageRatio?.(naturalWidth / naturalHeight);
        }
      }}
      onError={() => setHasFailed(true)}
    />
  );
}
