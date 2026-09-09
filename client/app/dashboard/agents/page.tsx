"use client";

import { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaCommentDots } from "react-icons/fa";
import Modal from "@/components/modal";
import EmptyState from "@/components/EmptyState";
import { SkeletonTable } from "@/components/Skeleton";
import AgentChatDrawer from "@/components/AgentChatDrawer";
import {
  getAgents,
  createAgent,
  deleteAgent,
  Agent,
} from "@/services/agentService";
import { getErrorMessage } from "@/lib/errors";

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [chatAgent, setChatAgent] = useState<Agent | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setAgents(await getAgents());
    } catch (err) {
      console.error("Failed to load agents:", err);
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
    if (!name.trim() || !description.trim() || systemPrompt.trim().length < 10) {
      setError("Name, description, and a system prompt (10+ characters) are required");
      return;
    }
    setSaving(true);
    try {
      await createAgent({ name, description, systemPrompt });
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      setSystemPrompt("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create agent"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this agent?")) return;
    try {
      await deleteAgent(id);
      await load();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const openChat = (agent: Agent) => {
    setChatAgent(agent);
  };

  if (loading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-50">AI Agents</h1>
        </div>
        <SkeletonTable rows={6} columns={8} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-50">AI Agents</h1>
        <button
          onClick={() => { setIsCreateOpen(true); setError(""); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <FaPlus /> New Agent
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 overflow-x-auto transition-colors">
        {agents.length === 0 ? (
          <EmptyState
            title="No agents yet"
            description="Create your first AI agent — it'll actually respond using its own system prompt."
            actionLabel="Create Agent"
            onAction={() => { setIsCreateOpen(true); setError(""); }}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left">
                <th className="p-3 text-gray-700 dark:text-gray-200">Agent</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Status</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Model</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Success Rate</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Requests</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Avg Response</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Last Activity</th>
                <th className="p-3 text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b dark:border-gray-700 last:border-0 text-gray-800 dark:text-gray-200">
                  <td className="p-3">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{a.description}</p>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        a.status === "active"
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="p-3">{a.modelLabel}</td>
                  <td className="p-3">{a.successRate != null ? `${a.successRate}%` : "—"}</td>
                  <td className="p-3">{a.requestCount.toLocaleString()}</td>
                  <td className="p-3">{a.avgResponseMs != null ? `${(a.avgResponseMs / 1000).toFixed(1)}s` : "—"}</td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">{relativeTime(a.lastActivityAt)}</td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openChat(a)}
                        aria-label={`Chat with ${a.name}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <FaCommentDots />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        aria-label={`Delete ${a.name}`}
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

      {/* Create agent modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Agent">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <p className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-sm p-2 rounded">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Agent Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Refund Assistant"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What does this agent do?"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              System Prompt <span className="text-gray-400">(this actually shapes its replies)</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="You are a helpful assistant that..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Agent"}
          </button>
        </form>
      </Modal>

      {/* Full-screen / large side-drawer chat (replaces the old small popup) */}
      <AgentChatDrawer
        agent={chatAgent}
        onClose={() => setChatAgent(null)}
        onMessageSent={load}
      />
    </div>
  );
}
