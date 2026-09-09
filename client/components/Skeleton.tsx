// Shimmering loading placeholders — used instead of blank screens / plain
// "Loading..." text while real data is being fetched.

function shimmerClass(extra = "") {
  return `animate-pulse bg-gray-200 dark:bg-gray-700/60 rounded ${extra}`;
}

export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return <div className={shimmerClass("h-3")} style={{ width }} />;
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={shimmerClass(className)} />;
}

// A row of stat cards, e.g. dashboard top row.
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border dark:border-gray-700"
        >
          <SkeletonLine width="60%" />
          <div className="mt-3">
            <div className={shimmerClass("h-8 w-24")} />
          </div>
        </div>
      ))}
    </div>
  );
}

// A generic table skeleton — header bar + N shimmering rows.
export function SkeletonTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 overflow-hidden">
      <div className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 flex gap-6">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className={shimmerClass("h-3 flex-1")} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="border-b dark:border-gray-700 last:border-0 p-3 flex gap-6 items-center"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className={shimmerClass("h-3 flex-1")}
              style={{ animationDelay: `${(r * columns + c) * 30}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// A grid of card-shaped skeletons — used for e.g. Projects grid.
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-5"
        >
          <SkeletonLine width="70%" />
          <div className="mt-3 space-y-2">
            <SkeletonLine width="100%" />
            <SkeletonLine width="85%" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className={shimmerClass("h-6 w-16 rounded-full")} />
            <div className={shimmerClass("h-6 w-16 rounded-full")} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Chat bubble skeletons for the AI Assistant while history loads.
export function SkeletonChat() {
  return (
    <div className="space-y-4 p-2">
      <div className="flex justify-end">
        <div className={shimmerClass("h-10 w-1/3 rounded-2xl rounded-br-none")} />
      </div>
      <div className="flex justify-start">
        <div className={shimmerClass("h-16 w-2/3 rounded-2xl rounded-bl-none")} />
      </div>
      <div className="flex justify-end">
        <div className={shimmerClass("h-8 w-1/4 rounded-2xl rounded-br-none")} />
      </div>
      <div className="flex justify-start">
        <div className={shimmerClass("h-20 w-3/5 rounded-2xl rounded-bl-none")} />
      </div>
    </div>
  );
}
