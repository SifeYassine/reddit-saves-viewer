import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronsLeft, ChevronsRight, ArrowRight } from "lucide-react";
import {
  Pagination as PaginationContainer,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function Pagination({ currentPage, totalPages, onPageChange, isLoading }) {
  const [pageInput, setPageInput] = useState("");

  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < totalPages && !isLoading;

  function navigate(page) {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePageJump() {
    const page = Number(pageInput);

    if (pageInput && Number.isInteger(page) && page >= 1 && page <= totalPages) {
      navigate(page);
    }

    setPageInput("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      handlePageJump();
    }
  }

  if (totalPages === 0) return null;

  return (
    <PaginationContainer className="py-8">
      <div className="flex flex-col items-center gap-4">
        {/* First page button */}
        <PaginationContent className="flex-wrap gap-2 justify-center">
          <PaginationItem>
            <Button
              aria-label="First page"
              variant="outline"
              size="icon"
              onClick={() => navigate(1)}
              disabled={currentPage === 1 || isLoading}
              className="hidden sm:inline-flex"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </PaginationItem>

          {/* Previous page button */}
          <PaginationItem>
            <PaginationPrevious
              onClick={() => canGoPrevious && navigate(currentPage - 1)}
              aria-disabled={!canGoPrevious}
              className={!canGoPrevious ? "pointer-events-none opacity-40" : "cursor-pointer"}
            />
          </PaginationItem>

          {/* Current page indicator */}
          <PaginationItem>
            <span className="whitespace-nowrap px-3 text-sm font-medium tabular-nums text-muted-foreground">
              Page <span className="text-foreground">{currentPage.toLocaleString()}</span> of{" "}
              {totalPages.toLocaleString()}
            </span>
          </PaginationItem>

          {/* Next page button */}
          <PaginationItem>
            <PaginationNext
              onClick={() => canGoNext && navigate(currentPage + 1)}
              aria-disabled={!canGoNext}
              className={!canGoNext ? "pointer-events-none opacity-40" : "cursor-pointer"}
            />
          </PaginationItem>

          {/* Last page button */}
          <PaginationItem>
            <Button
              aria-label="Last page"
              variant="outline"
              size="icon"
              onClick={() => navigate(totalPages)}
              disabled={currentPage === totalPages || isLoading}
              className="hidden sm:inline-flex"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>

        {/* Jump to page input */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Jump to</span>
          <Input
            aria-label="Page number"
            type="number"
            min="1"
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`1-${totalPages}`}
            disabled={isLoading}
            className="h-9 w-24 text-center"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handlePageJump}
            disabled={!pageInput || isLoading}
          >
            Go
          </Button>
        </div>
      </div>
    </PaginationContainer>
  );
}
