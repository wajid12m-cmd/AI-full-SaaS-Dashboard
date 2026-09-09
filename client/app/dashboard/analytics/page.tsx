"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { FaChartBar, FaUsers, FaRobot, FaFolder } from "react-icons/fa";
import Loader from "@/components/Loader";
import { getAnalytics, AnalyticsData } from "@/services/analyticsService";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getAnalytics();
      setData(res.data || res);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader />
      </div>
    );
  }

  // Mock data agar backend se data nahi aaya
  const mockData: AnalyticsData = data || {
    totalUsers: 12,
    totalProjects: 28,
    totalAiRequests: 156,
    monthlyRequests: [
      { month: "Jan", count: 20 },
      { month: "Feb", count: 35 },
      { month: "Mar", count: 45 },
      { month: "Apr", count: 30 },
      { month: "May", count: 50 },
      { month: "Jun", count: 65 },
    ],
    monthlyUsers: [
      { month: "Jan", count: 2 },
      { month: "Feb", count: 1 },
      { month: "Mar", count: 3 },
      { month: "Apr", count: 2 },
      { month: "May", count: 1 },
      { month: "Jun", count: 3 },
    ],
    monthlyRevenue: [
      { month: "Jan", amount: 0 },
      { month: "Feb", amount: 0 },
      { month: "Mar", amount: 0 },
      { month: "Apr", amount: 0 },
      { month: "May", amount: 0 },
      { month: "Jun", amount: 0 },
    ],
    revenueEnabled: false,
    projectStatus: [
      { name: "Active", value: 18 },
      { name: "Completed", value: 6 },
      { name: "Pending", value: 4 },
    ],
    recentActivity: [
      { action: "New project created", date: "2024-01-15" },
      { action: "AI request made", date: "2024-01-14" },
      { action: "User registered", date: "2024-01-13" },
    ],
  };

  const stats = [
    {
      title: "Total Users",
      value: mockData.totalUsers,
      icon: <FaUsers className="text-blue-600 dark:text-blue-400" />,
      color: "bg-blue-100 dark:bg-blue-900/40",
    },
    {
      title: "Total Projects",
      value: mockData.totalProjects,
      icon: <FaFolder className="text-green-600 dark:text-green-400" />,
      color: "bg-green-100 dark:bg-green-900/40",
    },
    {
      title: "AI Requests",
      value: mockData.totalAiRequests,
      icon: <FaRobot className="text-purple-600 dark:text-purple-400" />,
      color: "bg-purple-100 dark:bg-purple-900/40",
    },
    {
      title: "Active Projects",
      value: mockData.projectStatus[0]?.value || 0,
      icon: <FaChartBar className="text-orange-600 dark:text-orange-400" />,
      color: "bg-orange-100 dark:bg-orange-900/40",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-gray-50">
        Analytics Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 flex items-center gap-4 transition-colors"
          >
            <div className={`${stat.color} p-3 rounded-lg`}>{stat.icon}</div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly AI Requests Bar Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-50">Monthly AI Requests</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData.monthlyRequests}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status Pie Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-50">Project Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockData.projectStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {mockData.projectStatus.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 mb-8 transition-colors">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-50">Usage Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData.monthlyRequests}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: "#3B82F6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* New Users + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* New Users Bar Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-50">New Users (Monthly)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mockData.monthlyUsers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-50">Revenue (Monthly)</h3>
          {mockData.revenueEnabled ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mockData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">
                Revenue tracking abhi available nahi hai.
              </p>
              <p className="text-xs mt-1">
                Yeh Stripe payments integrate hone ke baad (Phase 8) yahan
                dikhega.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-50">Recent Activity</h3>
        <div className="space-y-3">
          {mockData.recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <span className="text-gray-700 dark:text-gray-200">{activity.action}</span>
              <span className="text-gray-400 dark:text-gray-500 text-sm">
                {new Date(activity.date).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}