// Initials-based avatar (no file-upload backend is configured in this
// project) — falls back to a colored circle with the user's initials, or
// renders an image if avatarUrl is set (e.g. a Gravatar/hosted URL).
function colorFromName(name: string) {
  const colors = [
    "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-emerald-500",
    "bg-amber-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  avatarUrl,
  size = 80,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover border-2 border-white dark:border-gray-800 shadow"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shadow ${colorFromName(name || "?")}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name || "?")}
    </div>
  );
}
