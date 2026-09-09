"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sora, Inter } from "next/font/google";
import { registerUser } from "@/services/authService";
import PasswordInput from "@/components/PasswordInput";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await registerUser(name, email, password);
      // Seedha code-entry page par bhej dein, email pehle se bhara hua
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError?.response?.data?.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className={`${inter.className} flex min-h-screen bg-[#05070d] text-[#eef1f7]`}>
      {/* Left branding panel */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="blob-a absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[#8b5cf6] opacity-25 blur-[110px]" />
          <div className="blob-b absolute bottom-[-160px] right-[-80px] h-[380px] w-[380px] rounded-full bg-[#5b6ef5] opacity-20 blur-[110px]" />
          <div className="grid-overlay absolute inset-0 opacity-[0.05]" />
        </div>

        <div className="relative z-10 flex flex-col items-center px-10 text-center">
          <div className="core-card relative mb-8 flex h-28 w-28 items-center justify-center rounded-[26px]">
            <div className="ring-orbit ring-1" />
            <div className="ring-orbit ring-2" />
            <span className="relative z-10 text-4xl">🤖</span>
          </div>
          <h2 className={`${sora.className} text-3xl font-extrabold`}>
            Join the platform
          </h2>
          <p className="mt-3 max-w-xs text-[#94a3b8]">
            Create an account to start managing projects and chatting with
            AI.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <form
          onSubmit={handleSubmit}
          className="form-card fade-item w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl"
        >
          <h1 className={`${sora.className} mb-1 text-2xl font-bold`}>
            Create Account
          </h1>
          <p className="mb-6 text-sm text-[#94a3b8]">
            Fill in your details to get started
          </p>

          {error && (
            <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#eef1f7] placeholder-[#6b7280] outline-none transition-colors focus:border-[#5b6ef5]"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[#eef1f7] placeholder-[#6b7280] outline-none transition-colors focus:border-[#5b6ef5]"
            required
          />

          <PasswordInput
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            wrapperClassName="mb-6"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#5b6ef5] py-2.5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4a5ce0] disabled:opacity-60"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>

          <p className="mt-5 text-center text-sm text-[#94a3b8]">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-[#5b6ef5]">
              Login
            </a>
          </p>
        </form>
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
          background: linear-gradient(145deg, rgba(139,92,246,0.25), rgba(91,110,245,0.15));
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