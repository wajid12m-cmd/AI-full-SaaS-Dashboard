"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FaPlus, FaPlay, FaTrash, FaBolt } from "react-icons/fa";
import Modal from "@/components/modal";
import EmptyState from "@/components/EmptyState";
import { SkeletonCards, SkeletonTable } from "@/components/Skeleton";
import {
  getWorkflows,
  createWorkflow,
  deleteWorkflow,
  runWorkflow,
  Workflow,
} from "@/services/workflowService";
import { getErrorMessage } from "@/lib/errors";

const STATUS_COLORS: Record<string, string> = {
  active: "#10B981",
  paused: "#F59E0B",
  draft: "#6B7280",
  failed: "#EF4444",
};

const TRIGGERS = ["New Lead", "New Ticket", "New Customer", "New Invoice", "New File", "Schedule"];

function relativeTime(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AutomationPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState(TRIGGERS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [runningId, setRunningId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setWorkflows(await getWorkflows());
    } catch (err) {
      console.error("Failed to load workflows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !description.trim()) {
      setError("Name and description are required");
      return;
    }
    setSaving(true);
    try {
      await createWorkflow({ name, description, trigger });
      setIsModalOpen(false);
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create workflow"));
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async (id: number) => {
    setRunningId(id);
    try {
      const updated = await runWorkflow(id);
      setWorkflows((prev) => prev.map((w) => (w.id === id ? updated : w)));
    } catch (err) {
      console.error("Run failed:", err);
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this workflow?")) return;
    try {
      await deleteWorkflow(id);
      await load();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const statusBreakdown = ["active", "paused", "draft", "failed"]
    .map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: workflows.filter((w) => w.status === status).length,
      color: STATUS_COLORS[status],
    }))
    .filter((s) => s.value > 0);

  const totalRuns = workflows.reduce((sum, w) => sum + w.runCount, 0);
  const activeCount = workflows.filter((w) => w.status === "active").length;

  if (loading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-50">Automation</h1>
        </div>
        <div className="mb-8">
          <SkeletonCards count={3} />
        </div>
        <SkeletonTable rows={6} columns={7} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-50">Automation</h1>
        <button
          onClick={() => { setIsModalOpen(true); setError(""); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaPlus /> New Workflow
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Total Workflows</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{workflows.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Total Runs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{totalRuns.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow table */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 overflow-x-auto transition-colors">
          {workflows.length === 0 ? (
            <EmptyState
              title="No workflows yet"
              description="Automate a repetitive task by creating your first workflow."
              actionLabel="Create Workflow"
              onAction={() => { setIsModalOpen(true); setError(""); }}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left">
                  <th className="p-3 text-gray-700 dark:text-gray-200">Workflow</th>
                  <th className="p-3 text-gray-700 dark:text-gray-200">Status</th>
                  <th className="p-3 text-gray-700 dark:text-gray-200">Trigger</th>
                  <th className="p-3 text-gray-700 dark:text-gray-200">Runs</th>
                  <th className="p-3 text-gray-700 dark:text-gray-200">Success</th>
                  <th className="p-3 text-gray-700 dark:text-gray-200">Last Run</th>
                  <th className="p-3 text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((w) => (
                  <tr key={w.id} className="border-b dark:border-gray-700 last:border-0 text-gray-800 dark:text-gray-200">
                    <td className="p-3">
                      <p className="font-medium">{w.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{w.description}</p>
                    </td>
                    <td className="p-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full capitalize"
                        style={{
                          backgroundColor: `${STATUS_COLORS[w.status]}22`,
                          color: STATUS_COLORS[w.status],
                        }}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="p-3">{w.trigger}</td>
                    <td className="p-3">{w.runCount.toLocaleString()}</td>
                    <td className="p-3">{w.successRate != null ? `${w.successRate}%` : "—"}</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">{relativeTime(w.lastRunAt)}</td>
                    <td className="p-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRun(w.id)}
                          disabled={w.status !== "active" || runningId === w.id}
                          aria-label={`Run ${w.name}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <FaPlay />
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          aria-label={`Delete ${w.name}`}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Status breakdown chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <FaBolt className="text-blue-500" /> Automation Overview
          </h3>
          {statusBreakdown.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-2 mt-2">
            {statusBreakdown.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
                <span className="text-gray-500 dark:text-gray-400">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Workflow">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <p className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-sm p-2 rounded">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Workflow Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Lead Nurturing Sequence"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What does this workflow do?"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Trigger</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Workflow"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
