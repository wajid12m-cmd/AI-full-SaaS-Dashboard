"use client";

import { useState } from "react";
import { FaRegCopy, FaCheck } from "react-icons/fa";

type CopyButtonProps = {
  text: string;
  className?: string;
  label?: string;
};

// 1-click copy icon with a brief "Copied!" confirmation. Falls back
// gracefully if the Clipboard API isn't available (e.g. insecure context).
export default function CopyButton({ text, className = "", label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : label || "Copy to clipboard"}
      title={copied ? "Copied!" : label || "Copy"}
      className={`inline-flex items-center gap-1 text-xs transition ${className}`}
    >
      {copied ? (
        <>
          <FaCheck className="text-green-500" />
          <span className="text-green-500">Copied!</span>
        </>
      ) : (
        <>
          <FaRegCopy />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
