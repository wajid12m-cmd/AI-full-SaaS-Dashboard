"use client";

import { useRef, useState } from "react";
import { Sora, Inter } from "next/font/google";
import Link from "next/link";

const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function Home() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -14, y: px * 16 });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      className={`${inter.className} relative min-h-screen overflow-hidden bg-[#05070d] text-[#eef1f7]`}
    >
      {/* Ambient background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="blob-a absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-[#5b6ef5] opacity-25 blur-[120px]" />
        <div className="blob-b absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-[#22d3ee] opacity-20 blur-[130px]" />
        <div className="blob-c absolute bottom-[-200px] left-1/3 h-[420px] w-[420px] rounded-full bg-[#8b5cf6] opacity-20 blur-[120px]" />
        <div className="grid-overlay absolute inset-0 opacity-[0.05]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        {/* 3D AI Core Card */}
        <div
          className="perspective-container mb-10 fade-item"
          style={{ animationDelay: "0.05s" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={resetTilt}
        >
          <div
            ref={cardRef}
            className="core-card relative flex h-32 w-32 items-center justify-center rounded-[28px] transition-transform duration-200 ease-out"
            style={{
              transform: `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            }}
          >
            <div className="ring-orbit ring-1" />
            <div className="ring-orbit ring-2" />
            <span className="relative z-10 text-5xl select-none">🤖</span>
            <div className="core-glow absolute inset-0 rounded-[28px]" />
          </div>
        </div>

        {/* Headline */}
        <h1
          className={`${sora.className} fade-item text-center text-5xl font-extrabold leading-tight tracking-tight md:text-6xl`}
          style={{ animationDelay: "0.15s" }}
        >
          AI SaaS{" "}
          <span className="bg-gradient-to-r from-[#5b6ef5] via-[#8b5cf6] to-[#22d3ee] bg-clip-text text-transparent">
            Dashboard
          </span>
        </h1>

        <p
          className="fade-item mt-6 max-w-xl text-center text-lg text-[#94a3b8]"
          style={{ animationDelay: "0.25s" }}
        >
          Manage projects, chat with AI, track analytics, and grow your
          business — all in one place.
        </p>

        {/* CTA Buttons */}
        <div
          className="fade-item mt-10 flex flex-col gap-4 sm:flex-row"
          style={{ animationDelay: "0.35s" }}
        >
          <Link
            href="/signup"
            className="cta-primary rounded-xl bg-[#5b6ef5] px-8 py-3 text-center font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4a5ce0]"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="cta-secondary rounded-xl border border-white/15 px-8 py-3 text-center font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/5"
          >
            Login
          </Link>
        </div>
      </div>

      <style >{`
        @keyframes floatBlobA {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(40px, 30px) scale(1.08);
          }
        }
        @keyframes floatBlobB {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-30px, 40px) scale(1.05);
          }
        }
        @keyframes floatBlobC {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(20px, -30px) scale(1.1);
          }
        }
        .blob-a {
          animation: floatBlobA 12s ease-in-out infinite;
        }
        .blob-b {
          animation: floatBlobB 14s ease-in-out infinite;
        }
        .blob-c {
          animation: floatBlobC 16s ease-in-out infinite;
        }
        .grid-overlay {
          background-image: linear-gradient(
              to right,
              #ffffff08 1px,
              transparent 1px
            ),
            linear-gradient(to bottom, #ffffff08 1px, transparent 1px);
          background-size: 44px 44px;
        }

        .perspective-container {
          perspective: 700px;
        }

        .core-card {
          background: linear-gradient(
            145deg,
            rgba(91, 110, 245, 0.25),
            rgba(139, 92, 246, 0.15)
          );
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 60px -20px rgba(91, 110, 245, 0.55);
          animation: floatCore 5s ease-in-out infinite;
        }
        @keyframes floatCore {
          0%,
          100% {
            margin-top: 0px;
          }
          50% {
            margin-top: -10px;
          }
        }

        .core-glow {
          box-shadow: inset 0 0 40px rgba(34, 211, 238, 0.25);
        }

        .ring-orbit {
          position: absolute;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .ring-1 {
          width: 160%;
          height: 160%;
          animation: spin 9s linear infinite;
          border-top-color: #22d3ee;
        }
        .ring-2 {
          width: 190%;
          height: 190%;
          animation: spin 14s linear infinite reverse;
          border-top-color: #8b5cf6;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .fade-item {
          opacity: 0;
          animation: fadeUp 0.7s ease-out forwards;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .blob-a,
          .blob-b,
          .blob-c,
          .core-card,
          .ring-1,
          .ring-2,
          .fade-item {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}