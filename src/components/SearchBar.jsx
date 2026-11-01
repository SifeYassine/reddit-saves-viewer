import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export function SearchBar({ value, onChange, placeholder = "Search by title..." }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  return (
    <div className="relative w-full">
      <Search
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground pointer-events-none"
        size={16}
      />
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-11"
      />

      {localValue && (
        <Button
          aria-label="Clear search"
          variant="ghost"
          size="icon"
          className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
        >
          <X size={14} />
        </Button>
      )}
    </div>
  );
}
