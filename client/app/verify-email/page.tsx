"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sora, Inter } from "next/font/google";
import { verifyEmail, resendVerification } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

type Status = "idle" | "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const autoSentRef = useRef(false);

  // Page khulte hi ek code bhej do — Sign Up ke turant baad bhi (register
  // ka pehla code overwrite ho jata hai, koi masla nahi), aur Login page
  // se "Enter verification code" se aane par bhi (jahan koi code pehle se
  // bheja hi nahi gaya tha). Isi wajah se pehle load par code na aana aur
  // Resend dabane par hi aana wala masla theek ho jata hai.
  useEffect(() => {
    if (autoSentRef.current || !email) return;
    autoSentRef.current = true;
    resendVerification(email.trim()).catch(() => {});
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("verifying");
    setMessage("");

    try {
      // Backend sets the httpOnly auth cookies on this same response —
      // verifying the code logs you in too, no separate login step.
      await verifyEmail(email.trim(), code.trim());
      setStatus("success");
      await refreshUser();
      router.push("/dashboard");
    } catch (err) {
      setStatus("error");
      const axiosError = err as { response?: { data?: { message?: string } } };
      setMessage(axiosError?.response?.data?.message || "Verification failed. Please try again.");
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await resendVerification(email.trim());
      setResent(true);
    } catch {
      // resend is best-effort; backend never reveals whether email exists
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={`${inter.className} flex min-h-screen bg-[#05070d] text-[#eef1f7]`}>
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="blob-a absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[#22d3ee] opacity-25 blur-[110px]" />
          <div className="blob-b absolute bottom-[-160px] right-[-80px] h-[380px] w-[380px] rounded-full bg-[#8b5cf6] opacity-20 blur-[110px]" />
          <div className="grid-overlay absolute inset-0 opacity-[0.05]" />
        </div>

        <div className="relative z-10 flex flex-col items-center px-10 text-center">
          <div className="core-card relative mb-8 flex h-28 w-28 items-center justify-center rounded-[26px]">
            <div className="ring-orbit ring-1" />
            <div className="ring-orbit ring-2" />
            <span className="relative z-10 text-4xl">✅</span>
          </div>
          <h2 className={`${sora.className} text-3xl font-extrabold`}>
            Almost there
          </h2>
          <p className="mt-3 max-w-xs text-[#94a3b8]">
            Enter the code we emailed you to activate your account.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="form-card fade-item w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
          <h1 className={`${sora.className} mb-1 text-2xl font-bold`}>
            Email Verification
          </h1>
          <p className="mb-6 text-sm text-[#94a3b8]">
            We sent a 6-digit code to your email. Enter it below.
          </p>

          {status === "success" ? (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
              Your email has been verified! Taking you to your dashboard...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {status === "error" && (
                <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {message}
                </p>
              )}

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
                disabled={status === "verifying" || code.length !== 6}
                className="w-full rounded-lg bg-[#5b6ef5] py-2.5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4a5ce0] disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {status === "verifying" ? "Verifying..." : "Verify Email"}
              </button>

              <div className="mt-4 text-center">
                {resent ? (
                  <p className="text-sm text-green-300">
                    A new code has been sent (if this email is registered and not yet verified).
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || !email}
                    className="text-sm font-medium text-[#5b6ef5] hover:underline disabled:opacity-60"
                  >
                    {resending ? "Sending..." : "Didn't get a code? Resend"}
                  </button>
                )}
              </div>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-[#94a3b8]">
            <a href="/login" className="font-medium text-[#5b6ef5]">
              Back to Login
            </a>
          </p>
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
          background: linear-gradient(145deg, rgba(34,211,238,0.25), rgba(139,92,246,0.15));
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 20px 60px -20px rgba(34,211,238,0.55);
          animation: floatCore 5s ease-in-out infinite;
        }
        @keyframes floatCore { 0%,100% { margin-top: 0px; } 50% { margin-top: -10px; } }
        .ring-orbit { position: absolute; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.15); }
        .ring-1 { width: 150%; height: 150%; animation: spin 9s linear infinite; border-top-color: #22d3ee; }
        .ring-2 { width: 180%; height: 180%; animation: spin 14s linear infinite reverse; border-top-color: #8b5cf6; }
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
