"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, refreshUser, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Frontend and backend live on different domains (this app on
    // Vercel/localhost, the API on Supabase) — a server-side check here
    // could never see the httpOnly auth cookie anyway, since browsers
    // never send domain A's cookies to domain B's server. So this
    // client-side check (which talks to the real API domain directly,
    // where the cookie IS visible) is the actual auth gate for this
    // route, not just a hydration nicety. /auth/me also naturally
    // handles the "cookie present but expired" case via its 401.
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-100 dark:bg-[#05070d] transition-colors">
      {/* Ambient background blobs — fixed positioning, no parent overflow needed */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="dash-blob-a absolute -top-40 -left-32 h-[500px] w-[500px] rounded-full bg-[#5b6ef5] opacity-[0.08] dark:opacity-[0.12] blur-[130px]" />
        <div className="dash-blob-b absolute top-1/2 -right-40 h-[460px] w-[460px] rounded-full bg-[#22d3ee] opacity-[0.07] dark:opacity-[0.10] blur-[130px]" />
        <div className="dash-blob-a absolute bottom-[-200px] left-1/3 h-[400px] w-[400px] rounded-full bg-[#8b5cf6] opacity-[0.06] dark:opacity-[0.08] blur-[130px]" style={{ animationDelay: "-4s" }} />
      </div>

      <div className="relative z-10">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onLogout={handleLogout}
        />

        <div className="flex">
          <Sidebar isSidebarOpen={isSidebarOpen} />

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
