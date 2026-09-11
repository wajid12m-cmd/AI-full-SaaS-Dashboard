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
    // middleware.ts already redirects unauthenticated requests away from
    // /dashboard/* server-side (before this even renders) if there's no
    // access-token cookie at all. This hydrates the actual user object —
    // and doubles as the real check for the case where the cookie is
    // present but expired/invalid, since /auth/me will 401 in that case.
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
    <div className="relative h-screen overflow-hidden bg-gray-100 dark:bg-[#05070d] transition-colors flex flex-col">
      {/* Ambient background blobs — fixed positioning, no parent overflow needed */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="dash-blob-a absolute -top-40 -left-32 h-[500px] w-[500px] rounded-full bg-[#5b6ef5] opacity-[0.08] dark:opacity-[0.12] blur-[130px]" />
        <div className="dash-blob-b absolute top-1/2 -right-40 h-[460px] w-[460px] rounded-full bg-[#22d3ee] opacity-[0.07] dark:opacity-[0.10] blur-[130px]" />
        <div className="dash-blob-a absolute bottom-[-200px] left-1/3 h-[400px] w-[400px] rounded-full bg-[#8b5cf6] opacity-[0.06] dark:opacity-[0.08] blur-[130px]" style={{ animationDelay: "-4s" }} />
      </div>

      <div className="relative z-10 flex flex-col h-full min-h-0">
        <div className="shrink-0">
          <Navbar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            onLogout={handleLogout}
          />
        </div>

        {/* This row is capped to "whatever height is left under the navbar"
            (flex-1 min-h-0) — the sidebar and the page content below each
            get their OWN overflow-y-auto within that fixed row, instead of
            the whole document growing/scrolling. That's what keeps the
            navbar + sidebar visually pinned while each panel scrolls on
            its own, independently, on hover. */}
        <div className="flex flex-1 min-h-0">
          <Sidebar isSidebarOpen={isSidebarOpen} />

          <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
