import { useState, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, ChevronDown, Check, ListFilter, Search } from "lucide-react";
import { getCommunityLabel } from "@/lib/reddit";
import { cn } from "@/lib/utils";

// Thousands of rows make the menu slow, so more are added only as the list is scrolled
const ROWS_PER_LOAD = 100;
const LOAD_MORE_DISTANCE = 300;
const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "posts", label: "Most posts" },
];

export function SubredditFilter({ subreddits, selectedSubreddits, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(ROWS_PER_LOAD);
  const [sortBy, setSortBy] = useState("name");
  const listRef = useRef(null);

  // Filter subreddits by search query, then sort. They arrive sorted by name
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = query
      ? subreddits.filter((subreddit) => getCommunityLabel(subreddit.name).toLowerCase().includes(query))
      : subreddits;

    return sortBy === "posts" ? [...matches].sort((a, b) => b.count - a.count) : matches;
  }, [subreddits, search, sortBy]);

  function handleSortChange(value) {
    setSortBy(value);
    setVisibleCount(ROWS_PER_LOAD);
    listRef.current?.scrollTo({ top: 0 });
  }

  function handleListScroll(event) {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;

    if (scrollTop + clientHeight >= scrollHeight - LOAD_MORE_DISTANCE && visibleCount < filtered.length) {
      setVisibleCount((count) => count + ROWS_PER_LOAD);
    }
  }

  function handleSelect(name) {
    if (selectedSubreddits.includes(name)) {
      onChange(selectedSubreddits.filter((subreddit) => subreddit !== name));
    } else {
      onChange([...selectedSubreddits, name]);
    }
  }

  return (
    <div className="w-full space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="group w-full justify-between pl-4 pr-3 font-normal text-muted-foreground data-[state=open]:ring-1 data-[state=open]:ring-ring"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <ListFilter className="text-muted-foreground" />
              <span className="truncate">Filter by subreddit</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {selectedSubreddits.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-semibold tabular-nums text-background">
                  {selectedSubreddits.length}
                </span>
              )}
              <ChevronDown className="transition-transform duration-150 group-data-[state=open]:rotate-180" />
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="gap-0 overflow-hidden p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
          sideOffset={8}
        >
          {/* Search input */}
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search subreddits"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(ROWS_PER_LOAD);
                }}
                placeholder="Search subreddits..."
                className="h-9 pl-9"
              />
            </div>
          </div>

          {/* Count hint */}
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pb-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="tabular-nums">
                {filtered.length.toLocaleString()} {filtered.length === 1 ? "subreddit" : "subreddits"}
              </span>
              {selectedSubreddits.length > 0 && (
                <button
                  className="rounded-sm transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onClick={() => onChange([])}
                  type="button"
                >
                  Clear all
                </button>
              )}
            </div>

            <div
              aria-label="Sort subreddits"
              className="flex items-center gap-0.5 rounded-full bg-secondary p-0.5 ring-1 ring-inset ring-white/10"
              role="radiogroup"
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  aria-checked={sortBy === value}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                    sortBy === value ? "bg-accent text-foreground" : "hover:text-foreground",
                  )}
                  key={value}
                  onClick={() => handleSortChange(value)}
                  role="radio"
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Subreddit list with counts */}
          <div className="max-h-[300px] overflow-y-auto p-1.5 pt-0.5" onScroll={handleListScroll} ref={listRef}>
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No subreddits found.</p>
            ) : (
              filtered.slice(0, visibleCount).map(({ name, count }) => {
                const selected = selectedSubreddits.includes(name);

                return (
                  <button
                    aria-pressed={selected}
                    key={name}
                    onClick={() => handleSelect(name)}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                      selected ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
                          selected ? "bg-foreground text-background" : "ring-1 ring-inset ring-white/25",
                        )}
                      >
                        {selected && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="truncate">{getCommunityLabel(name)}</span>
                    </span>
                    <span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">
                      {count.toLocaleString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected badges */}
      {selectedSubreddits.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedSubreddits.map((sub) => {
            const subredditData = subreddits.find((s) => s.name === sub);
            const count = subredditData?.count || 0;

            return (
              <Badge key={sub} variant="secondary" className="gap-1.5 pr-1.5">
                {getCommunityLabel(sub)}
                <span className="font-normal tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
                <button
                  aria-label={`Remove ${getCommunityLabel(sub)}`}
                  className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onClick={() => onChange(selectedSubreddits.filter((s) => s !== sub))}
                  type="button"
                >
                  <X size={12} />
                </button>
              </Badge>
            );
          })}
          <Button variant="link" className="h-auto px-1 text-xs" onClick={() => onChange([])}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
