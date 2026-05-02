import { memo } from "react";

const ProductSkeleton = memo(function ProductSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-2xl border border-emerald-100/70 bg-white shadow-lg shadow-emerald-100/60 ring-1 ring-emerald-100/60"
    >
      <div className="skeleton-shimmer aspect-[4/3] w-full shrink-0 bg-neutral-200" />
      <div className="flex flex-col gap-3 p-4">
        <div className="skeleton-shimmer h-4 w-[85%] rounded-md bg-neutral-200" />
        <div className="skeleton-shimmer h-3 w-[40%] rounded-md bg-neutral-200" />
      </div>
    </div>
  );
});

export default ProductSkeleton;
