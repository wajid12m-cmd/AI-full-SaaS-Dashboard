"use client";

import { useEffect, useState } from "react";

import Card from "@/components/Card";
import RecentActivity from "@/components/RecentActivity";
import QuickStats from "@/components/QuickStats";
import ProgressBar from "@/components/ProgressBar";
import { SkeletonCards } from "@/components/Skeleton";

import { getAnalytics, AnalyticsData } from "@/services/analyticsService";
import { getUsage, Usage } from "@/services/aiService";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [analyticsRes, usageRes] = await Promise.all([
          getAnalytics(),
          getUsage().catch(() => null),
        ]);
        setAnalytics(analyticsRes.data);
        setUsage(usageRes);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-gray-50">Dashboard</h1>

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            title="Total Users"
            value={String(analytics?.totalUsers ?? 0)}
          />
          <Card
            title="Revenue"
            value={
              analytics?.revenueEnabled
                ? `$${analytics.monthlyRevenue.reduce((sum, m) => sum + m.amount, 0)}`
                : "N/A"
            }
          />
          <Card
            title="AI Requests"
            value={String(analytics?.totalAiRequests ?? 0)}
          />
          <Card
            title="Projects"
            value={String(analytics?.totalProjects ?? 0)}
          />
        </div>
      )}

      {!loading && usage && (
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border dark:border-gray-700 transition-colors">
          <ProgressBar
            label="Your Monthly AI Usage"
            used={usage.used}
            limit={usage.limit}
            unit="Requests"
          />
        </div>
      )}

      <div className="mt-8">
        <RecentActivity activities={analytics?.recentActivity ?? []} />
      </div>

      <div className="mt-8">
        <QuickStats />
      </div>
    </div>
  );
}