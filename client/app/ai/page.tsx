"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AIChat from "@/components/AIChat";
import { useAuth } from "@/context/AuthContext";

export default function AIPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">AI Assistant</h1>
      <AIChat />
    </div>
  );
}