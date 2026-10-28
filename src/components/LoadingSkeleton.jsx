import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton({ count = 20 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="masonry-item overflow-hidden">
          <CardHeader className="space-y-3 p-4 pb-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-0 space-y-4">
            {index % 2 === 1 && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
            {index % 3 !== 1 && <Skeleton className="h-48 w-full rounded-xl" />}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
