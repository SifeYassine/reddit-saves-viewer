import * as React from "react";
import { Loader2, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { GLASS_PILL } from "@/lib/media";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 1.25, 1.5, 2];
const HIDE_CONTROLS_DELAY = 2500;
const DEFAULT_ASPECT_RATIO = 16 / 9;

// The hover preview's largest size, as a share of the player and in pixels
const PREVIEW_MAX_SHARE = 0.52;
const PREVIEW_MAX_WIDTH = 350;
const PREVIEW_MAX_HEIGHT = 260;
// Room for the preview's time label and the controls beneath it, so it never leaves the player
const PREVIEW_RESERVED_HEIGHT = 100;
const PREVIEW_EDGE_GAP = 8;

function formatTime(time) {
  const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0;
  const hours = Math.floor(safeTime / 3600);
  const minutes = Math.floor((safeTime % 3600) / 60);
  const seconds = String(Math.floor(safeTime % 60)).padStart(2, "0");

  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

function getPreviewSize(playerWidth, playerHeight, aspectRatio) {
  const maxWidth = Math.min(playerWidth * PREVIEW_MAX_SHARE, PREVIEW_MAX_WIDTH);
  const maxHeight = Math.max(
    0,
    Math.min(playerHeight * PREVIEW_MAX_SHARE, playerHeight - PREVIEW_RESERVED_HEIGHT, PREVIEW_MAX_HEIGHT),
  );
  const width = Math.min(maxWidth, maxHeight * aspectRatio);

  return { width, height: width / aspectRatio };
}

// A frame from the video, shown above the timeline while hovering it.
// It uses its own video element so hovering never moves the real playback position
function SeekPreview({ src, time, size, left }) {
  const videoRef = React.useRef(null);
  const isSeekingRef = React.useRef(false);
  const latestTimeRef = React.useRef(time);

  latestTimeRef.current = time;

  const seekToLatest = React.useCallback(() => {
    const video = videoRef.current;

    if (!video || isSeekingRef.current || video.readyState < 1) {
      return;
    }

    if (Math.abs(video.currentTime - latestTimeRef.current) > 0.1) {
      isSeekingRef.current = true;
      video.currentTime = latestTimeRef.current;
    }
  }, []);

  React.useEffect(seekToLatest, [time, seekToLatest]);

  return (
    <div
      className="pointer-events-none absolute bottom-full z-20 mb-1.5 flex -translate-x-1/2 flex-col items-center gap-2"
      style={{ left }}
    >
      <div
        className="overflow-hidden rounded-lg bg-black shadow-2xl ring-2 ring-white"
        style={{ width: size.width, height: size.height }}
      >
        <video
          className="h-full w-full object-contain"
          muted
          onLoadedMetadata={seekToLatest}
          onSeeked={() => {
            isSeekingRef.current = false;
            seekToLatest();
          }}
          playsInline
          preload="metadata"
          ref={videoRef}
          src={src}
        />
      </div>
      <span className={cn(GLASS_PILL, "px-2.5 py-1 text-xs font-medium tabular-nums text-white")}>
        {formatTime(time)}
      </span>
    </div>
  );
}

function Timeline({ value, max, buffered, onChange, src, getPlayerSize, aspectRatio }) {
  const trackRef = React.useRef(null);
  const [hover, setHover] = React.useState(null);

  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const bufferedPercent = max > 0 ? Math.min(100, (buffered / max) * 100) : 0;

  const handleMouseMove = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, e.clientX - rect.left));

    setHover({ x, trackWidth: rect.width, trackLeft: rect.left });
  };

  const hoverTime = hover && max > 0 ? (hover.x / hover.trackWidth) * max : null;
  const player = hover ? getPlayerSize() : null;
  const previewSize = player ? getPreviewSize(player.width, player.height, aspectRatio) : null;

  // Keep the preview inside the player, even when hovering near either end of the timeline
  const previewHalfWidth = previewSize ? previewSize.width / 2 + PREVIEW_EDGE_GAP : 0;
  const previewLeft =
    hover && player
      ? Math.min(
          player.right - previewHalfWidth - hover.trackLeft,
          Math.max(player.left + previewHalfWidth - hover.trackLeft, hover.x),
        )
      : 0;

  return (
    <div
      className="group/timeline relative flex h-4 items-center"
      onMouseLeave={() => setHover(null)}
      onMouseMove={handleMouseMove}
      ref={trackRef}
    >
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-neutral-500/70 shadow-[0_0_2px_rgba(0,0,0,0.4)] transition-[height] duration-100 group-hover/timeline:h-1.5">
        <div className="absolute inset-y-0 left-0 bg-neutral-300/80" style={{ width: `${bufferedPercent}%` }} />
        {hover && <div className="absolute inset-y-0 left-0 bg-neutral-200/90" style={{ width: hover.x }} />}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff0033] to-[#ff2d78]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div
        className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-[#ff0033] shadow transition-transform duration-100 group-hover/timeline:scale-125"
        style={{ left: `${percent}%` }}
      />

      {hoverTime !== null && <SeekPreview left={previewLeft} size={previewSize} src={src} time={hoverTime} />}

      {/* An invisible native range input keeps it draggable and keyboard accessible */}
      <input
        aria-label="Seek"
        className="absolute inset-0 w-full cursor-pointer opacity-0"
        max={max || 0}
        min={0}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        step="any"
        type="range"
        value={value}
      />
    </div>
  );
}

function VolumeSlider({ value, onChange }) {
  const percent = value * 100;

  return (
    <div className="relative ml-0.5 mr-3 flex h-9 w-14 items-center">
      <div className="relative h-1 w-full rounded-full bg-white/35">
        <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${percent}%` }} />
      </div>
      <div
        className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-white shadow"
        style={{ left: `clamp(6px, ${percent}%, calc(100% - 6px))` }}
      />
      <input
        aria-label="Volume"
        className="absolute inset-0 w-full cursor-pointer opacity-0"
        max={1}
        min={0}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        step={0.05}
        type="range"
        value={value}
      />
    </div>
  );
}

function ControlButton({ label, shortcut, tooltip, tooltipAlign = "center", className, children, ...props }) {
  return (
    <div className="group/button relative shrink-0">
      <button
        aria-label={label}
        className={cn(
          "flex size-9 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          className,
        )}
        type="button"
        {...props}
      >
        {children}
      </button>

      <div
        className={cn(
          "pointer-events-none absolute bottom-full z-30 mb-2 flex items-center gap-2 whitespace-nowrap rounded-md bg-neutral-800/90 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/button:opacity-100",
          tooltipAlign === "start" && "left-0",
          tooltipAlign === "center" && "left-1/2 -translate-x-1/2",
          tooltipAlign === "end" && "right-0",
        )}
      >
        {tooltip ?? label}
        {shortcut && <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-sans text-[10px] leading-none">{shortcut}</kbd>}
      </div>
    </div>
  );
}

// `fill` makes the player take its parent's shape, for slides in a carousel, instead of the video's own
const VideoPlayer = React.forwardRef(function VideoPlayer(
  { className, src, poster, muted = false, fill = false, ...props },
  ref,
) {
  const containerRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const controlsRef = React.useRef(null);
  const hideTimeoutRef = React.useRef(null);

  const [hasStarted, setHasStarted] = React.useState(false);
  const [hasEnded, setHasEnded] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isControlsVisible, setIsControlsVisible] = React.useState(true);
  const [posterFailed, setPosterFailed] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState(DEFAULT_ASPECT_RATIO);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [buffered, setBuffered] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(muted);
  const [speed, setSpeed] = React.useState(1);

  React.useImperativeHandle(ref, () => videoRef.current);

  // With a thumbnail nothing is downloaded until play. Without one, load just enough to show the first frame
  const hasPoster = Boolean(poster) && !posterFailed;
  const showCover = !hasStarted || hasEnded;

  const clearHideTimeout = () => window.clearTimeout(hideTimeoutRef.current);

  const showControls = React.useCallback(() => {
    setIsControlsVisible(true);
    clearHideTimeout();

    hideTimeoutRef.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) {
        setIsControlsVisible(false);
      }
    }, HIDE_CONTROLS_DELAY);
  }, []);

  const togglePlay = React.useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = React.useCallback(() => {
    const video = videoRef.current;

    if (video) {
      video.muted = !video.muted;
    }
  }, []);

  const changeVolume = React.useCallback((newVolume) => {
    const video = videoRef.current;

    if (video) {
      video.volume = newVolume;
      video.muted = newVolume === 0;
    }
  }, []);

  const seek = React.useCallback((time) => {
    const video = videoRef.current;

    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const toggleFullscreen = React.useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }, []);

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];

    setSpeed(next);

    if (videoRef.current) {
      videoRef.current.playbackRate = next;
    }
  };

  const getPlayerSize = React.useCallback(() => {
    const rect = containerRef.current.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right };
  }, []);

  const handleKeyDown = (e) => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const actions = {
      " ": togglePlay,
      k: togglePlay,
      m: toggleMute,
      f: toggleFullscreen,
      ArrowLeft: () => seek(Math.max(0, video.currentTime - 5)),
      ArrowRight: () => seek(Math.min(video.duration || 0, video.currentTime + 5)),
      ArrowUp: () => changeVolume(Math.min(1, Math.round((video.volume + 0.1) * 10) / 10)),
      ArrowDown: () => changeVolume(Math.max(0, Math.round((video.volume - 0.1) * 10) / 10)),
    };

    if (actions[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      actions[e.key]();
      showControls();
    }
  };

  const updateBuffered = () => {
    const video = videoRef.current;

    if (video?.buffered.length) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  };

  React.useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);

    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      clearHideTimeout();
    };
  }, []);

  // Stop drags on the controls from also swiping a surrounding carousel, which listens natively
  React.useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return undefined;
    }

    const stop = (e) => e.stopPropagation();
    const events = ["pointerdown", "mousedown", "touchstart"];

    events.forEach((event) => controls.addEventListener(event, stop));

    return () => events.forEach((event) => controls.removeEventListener(event, stop));
  }, [showCover, hasError]);

  if (hasError) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-xl bg-black text-sm text-white/60", className)}
        style={{ aspectRatio: DEFAULT_ASPECT_RATIO }}
      >
        Video unavailable
      </div>
    );
  }

  return (
    <div
      aria-label="Video player"
      data-video-player
      className={cn(
        "group/player relative w-full overflow-hidden bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white",
        !isFullscreen && (fill ? "h-full" : "max-h-[75vh] rounded-xl"),
        className,
      )}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => {
        if (isPlaying) {
          clearHideTimeout();
          setIsControlsVisible(false);
        }
      }}
      onMouseMove={showControls}
      ref={containerRef}
      role="region"
      style={isFullscreen || fill ? undefined : { aspectRatio }}
      tabIndex={0}
    >
      <video
        className="absolute inset-0 h-full w-full object-contain"
        muted={muted}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => {
          setHasEnded(true);
          setIsPlaying(false);
          setIsControlsVisible(true);
        }}
        onError={() => setHasError(true)}
        onLoadedMetadata={(e) => {
          const { videoWidth, videoHeight, duration: videoDuration } = e.currentTarget;

          setDuration(videoDuration || 0);

          if (videoWidth && videoHeight) {
            setAspectRatio(videoWidth / videoHeight);
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          setIsControlsVisible(true);
          clearHideTimeout();
        }}
        onPlay={() => {
          setHasStarted(true);
          setHasEnded(false);
          setIsPlaying(true);
          showControls();
        }}
        onPlaying={() => setIsBuffering(false)}
        onProgress={updateBuffered}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setIsMuted(e.currentTarget.muted);
        }}
        onWaiting={() => setIsBuffering(true)}
        playsInline
        preload={hasPoster ? "none" : "metadata"}
        ref={videoRef}
        src={hasPoster ? src : `${src}#t=0.1`}
        {...props}
      />

      {/* Thumbnail and play button, until playback starts and again at the end */}
      {showCover && (
        <button
          aria-label={hasEnded ? "Replay video" : "Play video"}
          className="group/cover absolute inset-0 flex items-center justify-center focus-visible:outline-none"
          onClick={togglePlay}
          type="button"
        >
          {hasPoster && (
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              loading="lazy"
              onError={() => setPosterFailed(true)}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;

                if (naturalWidth && naturalHeight && !hasStarted) {
                  setAspectRatio(naturalWidth / naturalHeight);
                }
              }}
              src={poster}
            />
          )}
          <span
            className={cn(
              GLASS_PILL,
              "relative flex size-16 items-center justify-center text-white transition-all duration-200 group-hover/cover:scale-105 group-hover/cover:bg-neutral-700/80 group-focus-visible/cover:ring-2 group-focus-visible/cover:ring-white",
            )}
          >
            {hasEnded ? (
              <RotateCcw aria-hidden="true" className="size-6" />
            ) : (
              <Play aria-hidden="true" className="ml-1 size-7 fill-current" />
            )}
          </span>
        </button>
      )}

      {isBuffering && isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 aria-hidden="true" className="size-10 animate-spin text-white drop-shadow-lg" />
        </div>
      )}

      {/* Controls */}
      {!showCover && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent px-3 pb-2.5 pt-14 transition-opacity duration-200",
            isControlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          ref={controlsRef}
        >
          <Timeline
            aspectRatio={aspectRatio}
            buffered={buffered}
            getPlayerSize={getPlayerSize}
            max={duration}
            onChange={seek}
            src={src}
            value={currentTime}
          />

          <div className="video-controls mt-1 flex items-center gap-1.5">
            <div className={GLASS_PILL}>
              <ControlButton
                label={isPlaying ? "Pause" : "Play"}
                onClick={togglePlay}
                shortcut="K"
                tooltipAlign="start"
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" className="size-5 fill-current" />
                ) : (
                  <Play aria-hidden="true" className="ml-0.5 size-5 fill-current" />
                )}
              </ControlButton>
            </div>

            <div className={cn(GLASS_PILL, "video-volume group/volume flex shrink-0 items-center")}>
              <ControlButton label={isMuted ? "Unmute" : "Mute"} onClick={toggleMute} shortcut="M" tooltipAlign="start">
                {isMuted || volume === 0 ? (
                  <VolumeX aria-hidden="true" className="size-5" />
                ) : (
                  <Volume2 aria-hidden="true" className="size-5" />
                )}
              </ControlButton>
              <div className="w-0 overflow-hidden transition-[width] duration-200 focus-within:w-[4.375rem] group-hover/volume:w-[4.375rem]">
                <VolumeSlider onChange={changeVolume} value={isMuted ? 0 : volume} />
              </div>
            </div>

            <span
              className={cn(
                GLASS_PILL,
                "video-time min-w-0 truncate px-3 py-2 text-xs font-medium leading-5 tabular-nums text-white",
              )}
            >
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <div className={cn(GLASS_PILL, "flex shrink-0 items-center")}>
              <ControlButton
                className="text-xs font-semibold tabular-nums"
                label={`Playback speed ${speed}x`}
                onClick={cycleSpeed}
                tooltip="Playback speed"
                tooltipAlign="end"
              >
                {speed}x
              </ControlButton>
              <ControlButton
                label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                onClick={toggleFullscreen}
                shortcut="F"
                tooltipAlign="end"
              >
                {isFullscreen ? (
                  <Minimize aria-hidden="true" className="size-5" />
                ) : (
                  <Maximize aria-hidden="true" className="size-5" />
                )}
              </ControlButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export { VideoPlayer };
