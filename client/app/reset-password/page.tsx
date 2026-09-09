"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sora, Inter } from "next/font/google";
import { resetPassword } from "@/services/authService";
import { getErrorMessage } from "@/lib/errors";
import PasswordInput from "@/components/PasswordInput";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

type Step = "code" | "password" | "success";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("code");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 → Step 2 is purely client-side (just checks the code LOOKS
  // right); the code is only actually verified against the database when
  // the final submit combines it with the new password in one request —
  // avoids a separate "is this code valid" endpoint that would just be an
  // extra way to brute-force codes without ever committing to a change.
  const handleCodeNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      setStep("success");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong"));
      // Wrong/expired code surfaces here (backend only checks it now) —
      // send them back to step 1 to re-enter it rather than stranding
      // them on a password form that can never succeed.
      setStep("code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${inter.className} flex min-h-screen bg-[#05070d] text-[#eef1f7]`}>
      {/* Left branding panel */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="blob-a absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[#8b5cf6] opacity-25 blur-[110px]" />
          <div className="blob-b absolute bottom-[-160px] right-[-80px] h-[380px] w-[380px] rounded-full bg-[#22d3ee] opacity-20 blur-[110px]" />
          <div className="grid-overlay absolute inset-0 opacity-[0.05]" />
        </div>

        <div className="relative z-10 flex flex-col items-center px-10 text-center">
          <div className="core-card relative mb-8 flex h-28 w-28 items-center justify-center rounded-[26px]">
            <div className="ring-orbit ring-1" />
            <div className="ring-orbit ring-2" />
            <span className="relative z-10 text-4xl">🔒</span>
          </div>
          <h2 className={`${sora.className} text-3xl font-extrabold`}>
            Set a new password
          </h2>
          <p className="mt-3 max-w-xs text-[#94a3b8]">
            Choose a strong new password to secure your account.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="form-card fade-item w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
          <h1 className={`${sora.className} mb-1 text-2xl font-bold`}>
            Reset Password
          </h1>
          <p className="mb-6 text-sm text-[#94a3b8]">
            {step === "code" && "Enter the code we emailed you."}
            {step === "password" && "Choose your new password."}
            {step === "success" && "All set."}
          </p>

          {step === "success" ? (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
              Password reset successfully! Redirecting to login...
            </div>
          ) : (
            <>
              {error && (
                <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              {step === "code" ? (
                <form onSubmit={handleCodeNext}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#eef1f7] placeholder-[#6b7280] outline-none transition-colors focus:border-[#5b6ef5]"
                    required
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.5em] text-[#eef1f7] placeholder-[#6b7280] placeholder:tracking-normal placeholder:text-base outline-none transition-colors focus:border-[#5b6ef5]"
                    required
                  />

                  <button
                    type="submit"
                    disabled={code.length !== 6}
                    className="w-full rounded-lg bg-[#5b6ef5] py-2.5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4a5ce0] disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    Next
                  </button>

                  <p className="mt-4 text-center text-sm text-[#94a3b8]">
                    Didn&apos;t get a code?{" "}
                    <a href="/forgot-password" className="font-medium text-[#5b6ef5] hover:underline">
                      Send again
                    </a>
                  </p>
                </form>
              ) : (
                <form onSubmit={handlePasswordSubmit}>
                  <PasswordInput
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    wrapperClassName="mb-4"
                    required
                  />

                  <PasswordInput
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    wrapperClassName="mb-4"
                    required
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-[#5b6ef5] py-2.5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4a5ce0] disabled:opacity-60"
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("code")}
                    className="mt-4 w-full text-center text-sm font-medium text-[#94a3b8] hover:text-[#eef1f7]"
                  >
                    ← Back
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes floatBlobA { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,20px) scale(1.06); } }
        @keyframes floatBlobB { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,30px) scale(1.05); } }
        .blob-a { animation: floatBlobA 12s ease-in-out infinite; }
        .blob-b { animation: floatBlobB 14s ease-in-out infinite; }
        .grid-overlay {
          background-image: linear-gradient(to right, #ffffff08 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff08 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .core-card {
          background: linear-gradient(145deg, rgba(139,92,246,0.25), rgba(34,211,238,0.15));
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 20px 60px -20px rgba(139,92,246,0.55);
          animation: floatCore 5s ease-in-out infinite;
        }
        @keyframes floatCore { 0%,100% { margin-top: 0px; } 50% { margin-top: -10px; } }
        .ring-orbit { position: absolute; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.15); }
        .ring-1 { width: 150%; height: 150%; animation: spin 9s linear infinite; border-top-color: #22d3ee; }
        .ring-2 { width: 180%; height: 180%; animation: spin 14s linear infinite reverse; border-top-color: #5b6ef5; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-item { opacity: 0; animation: fadeUp 0.6s ease-out forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .blob-a, .blob-b, .core-card, .ring-1, .ring-2, .fade-item { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
