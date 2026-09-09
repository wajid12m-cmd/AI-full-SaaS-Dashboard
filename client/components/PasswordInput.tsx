"use client";

import { useState, InputHTMLAttributes } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  wrapperClassName?: string;
}

/**
 * Password field with a click-to-reveal eye icon.
 * Reuses the same dark glassy input styling used across auth pages.
 */
export default function PasswordInput({
  wrapperClassName = "",
  className = "",
  ...inputProps
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={`w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-11 text-[#eef1f7] placeholder-[#6b7280] outline-none transition-colors focus:border-[#5b6ef5] ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] transition-colors hover:text-[#94a3b8]"
      >
        {visible ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
      </button>
    </div>
  );
}
