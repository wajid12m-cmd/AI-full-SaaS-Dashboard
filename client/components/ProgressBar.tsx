type ProgressBarProps = {
  label: string;
  used: number;
  limit: number | null; // null = unlimited
  unit?: string;
};

// Real-time usage bar, e.g. "8,500 / 10,000 Tokens Used". Renders an
// "Unlimited" pill instead of a bar when limit is null (Pro plan).
export default function ProgressBar({ label, used, limit, unit = "Tokens" }: ProgressBarProps) {
  if (limit === null) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
          <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
            Unlimited
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-[length:200%_100%] animate-[shimmerBar_2.5s_linear_infinite]" />
      </div>
    );
  }

  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isNearLimit = pct >= 80 && pct < 100;
  const isAtLimit = pct >= 100;

  const barColor = isAtLimit
    ? "bg-red-500"
    : isNearLimit
    ? "bg-amber-500"
    : "bg-blue-600";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <span
          className={`text-xs font-medium ${
            isAtLimit
              ? "text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {used.toLocaleString()} / {limit.toLocaleString()} {unit} Used
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-500 mt-1">
          You&apos;ve hit this month&apos;s limit — upgrade to Pro for unlimited usage.
        </p>
      )}
    </div>
  );
}
