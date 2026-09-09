"use client";

import { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
};

// A friendly, illustrated placeholder for genuinely-empty lists (as opposed
// to a search/filter returning nothing — pass a different `description` for
// that case and omit the action button).
export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="mb-6">
        {icon ?? (
          <svg
            width="180"
            height="140"
            viewBox="0 0 180 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <ellipse cx="90" cy="122" rx="60" ry="8" className="fill-gray-100 dark:fill-gray-800" />
            <rect
              x="35"
              y="28"
              width="110"
              height="80"
              rx="10"
              className="fill-blue-50 dark:fill-gray-800 stroke-blue-200 dark:stroke-gray-700"
              strokeWidth="2"
            />
            <rect x="50" y="46" width="70" height="8" rx="4" className="fill-blue-200 dark:fill-gray-700" />
            <rect x="50" y="62" width="50" height="8" rx="4" className="fill-blue-100 dark:fill-gray-700" />
            <rect x="50" y="78" width="60" height="8" rx="4" className="fill-blue-100 dark:fill-gray-700" />
            <circle cx="132" cy="34" r="16" className="fill-purple-500" />
            <path
              d="M126 34l4 4 8-8"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
