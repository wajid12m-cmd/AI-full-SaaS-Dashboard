"use client";

import { useEffect, useState } from "react";
import {
  getAdminStats,
  getAllUsers,
  getAllProjects,
  AdminStats,
  AdminUser,
  AdminProject,
  Pagination,
} from "@/services/adminService";
import { getErrorStatus } from "@/lib/errors";

const emptyPagination: Pagination = { page: 1, limit: 20, total: 0, totalPages: 1 };

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination>(emptyPagination);

  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [projectsPagination, setProjectsPagination] = useState<Pagination>(emptyPagination);

  const [tab, setTab] = useState<"users" | "projects">("users");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatsAndFirstPage = async () => {
    try {
      setLoading(true);
      const [statsData, usersData, projectsData] = await Promise.all([
        getAdminStats(),
        getAllUsers(1),
        getAllProjects(1),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setUsersPagination(usersData.pagination);
      setProjects(projectsData.projects);
      setProjectsPagination(projectsData.pagination);
    } catch (err) {
      console.error("Admin load error:", err);
      if (getErrorStatus(err) === 403) {
        setError("Access denied. Only admins can view this page.");
      } else {
        setError("Failed to load data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatsAndFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsersPage = async (page: number) => {
    const data = await getAllUsers(page);
    setUsers(data.users);
    setUsersPagination(data.pagination);
  };

  const loadProjectsPage = async (page: number) => {
    const data = await getAllProjects(page);
    setProjects(data.projects);
    setProjectsPagination(data.pagination);
  };

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-gray-50">Admin Panel</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-4 transition-colors">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats?.totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-4 transition-colors">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Total Projects</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats?.totalProjects}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-4 transition-colors">
          <p className="text-gray-400 dark:text-gray-500 text-sm">AI Requests</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats?.totalAiRequests}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-4 transition-colors">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Active Pro Subs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {stats?.totalActiveSubscriptions}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-4 transition-colors">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Revenue (actual)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            ${stats?.totalRevenue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 mb-8 transition-colors">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-50">Recent Payments</h3>
        {stats?.recentPayments.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">No payments yet.</p>
        ) : (
          <div className="space-y-3">
            {stats?.recentPayments.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span className="text-gray-700 dark:text-gray-200 capitalize">{p.plan} plan</span>
                <span className="text-gray-600 dark:text-gray-300 text-sm">
                  {p.amount != null ? `$${p.amount.toFixed(2)} ${p.currency?.toUpperCase()}` : "—"}
                </span>
                <span className="text-green-600 dark:text-green-400 text-sm capitalize">
                  {p.status}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-sm">
                  {new Date(p.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b dark:border-gray-700">
        <button
          onClick={() => setTab("users")}
          className={`pb-2 px-1 font-medium ${
            tab === "users"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          Users ({usersPagination.total})
        </button>
        <button
          onClick={() => setTab("projects")}
          className={`pb-2 px-1 font-medium ${
            tab === "projects"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          Projects ({projectsPagination.total})
        </button>
      </div>

      {/* Users Table */}
      {tab === "users" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 overflow-x-auto transition-colors">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left">
                <th className="p-3 text-gray-700 dark:text-gray-200">Name</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Email</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Role</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Plan</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b dark:border-gray-700 last:border-0 text-gray-800 dark:text-gray-200">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3 capitalize">
                    {u.subscription?.plan || "free"}
                  </td>
                  <td className="p-3">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar pagination={usersPagination} onPageChange={loadUsersPage} />
        </div>
      )}

      {/* Projects Table */}
      {tab === "projects" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 overflow-x-auto transition-colors">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left">
                <th className="p-3 text-gray-700 dark:text-gray-200">Project</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Owner</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Status</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b dark:border-gray-700 last:border-0 text-gray-800 dark:text-gray-200">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.user?.email}</td>
                  <td className="p-3 capitalize">{p.status}</td>
                  <td className="p-3">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar pagination={projectsPagination} onPageChange={loadProjectsPage} />
        </div>
      )}
    </div>
  )
}

function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-3 py-3 border-t dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
      <span>
        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-3 py-1 rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="px-3 py-1 rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}
