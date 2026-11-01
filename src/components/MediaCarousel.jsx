import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { MediaItem } from "@/components/MediaItem";
import { GLASS_PILL } from "@/lib/media";
import { cn } from "@/lib/utils";

// Beyond this many slides dots stop being useful, so only the counter is shown
const MAX_DOTS = 10;
const DEFAULT_RATIO = 1;
const VIDEO_RATIO = 16 / 9;
const MIN_RATIO = 0.5;
const MAX_RATIO = 2.2;

function ArrowButton({ label, className, disabled, children, ...props }) {
  return (
    <button
      aria-label={label}
      className={cn(
        GLASS_PILL,
        "absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center text-white opacity-0 transition-[opacity,background-color] duration-150 hover:bg-neutral-600/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover/carousel:opacity-100",
        disabled && "invisible",
        className,
      )}
      disabled={disabled}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function MediaCarousel({ mediaItems }) {
  const [api, setApi] = useState();
  const [current, setCurrent] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // The first slide decides the frame's shape, so it always fills it
  const [frameRatio, setFrameRatio] = useState(() => (mediaItems[0].type === "video" ? VIDEO_RATIO : DEFAULT_RATIO));

  useEffect(() => {
    if (!api) {
      return undefined;
    }

    const onChange = () => {
      setCurrent(api.selectedScrollSnap());
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    // A video left behind on another slide shouldn't keep playing out of view
    const pauseVideos = () => {
      api.rootNode().querySelectorAll("video").forEach((video) => video.pause());
    };

    onChange();
    api.on("select", onChange);
    api.on("select", pauseVideos);
    api.on("reInit", onChange);

    return () => {
      api.off("select", onChange);
      api.off("select", pauseVideos);
      api.off("reInit", onChange);
    };
  }, [api]);

  const isVideoSlide = mediaItems[current]?.type === "video";

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Carousel
        className="group/carousel overflow-hidden rounded-xl bg-black"
        setApi={setApi}
        style={{ aspectRatio: frameRatio }}
      >
        <CarouselContent className="ml-0 h-full">
          {mediaItems.map((media, index) => (
            <CarouselItem className="h-full pl-0" key={media.url}>
              <MediaItem
                frameRatio={frameRatio}
                media={media}
                onImageRatio={
                  index === 0
                    ? (ratio) => setFrameRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio)))
                    : undefined
                }
              />
            </CarouselItem>
          ))}
        </CarouselContent>

        <ArrowButton
          className="left-2.5"
          disabled={!canScrollPrev}
          label="Previous slide"
          onClick={() => api?.scrollPrev()}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </ArrowButton>
        <ArrowButton
          className="right-2.5"
          disabled={!canScrollNext}
          label="Next slide"
          onClick={() => api?.scrollNext()}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </ArrowButton>

        <span
          className={cn(
            GLASS_PILL,
            "pointer-events-none absolute right-2.5 top-2.5 z-10 px-2.5 py-1 text-xs font-medium tabular-nums text-white",
          )}
        >
          {current + 1} / {mediaItems.length}
        </span>

        {/* A video's own controls sit here, so the dots step aside on video slides */}
        {mediaItems.length <= MAX_DOTS && !isVideoSlide && (
          <div
            className={cn(
              GLASS_PILL,
              "absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 px-1.5 py-1",
            )}
          >
            {mediaItems.map((media, index) => (
              <button
                aria-current={index === current}
                aria-label={`Go to slide ${index + 1}`}
                className="flex size-4 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                key={media.url}
                onClick={() => api?.scrollTo(index)}
                type="button"
              >
                <span
                  className={cn(
                    "rounded-full transition-all duration-150",
                    index === current ? "size-2 bg-white" : "size-1.5 bg-white/55",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </Carousel>
    </div>
  );
}
