"use client";

import { useEffect, useState } from "react";
import { getUsage, Usage } from "@/services/aiService";
import { getWorkflows } from "@/services/workflowService";
import { getAgents } from "@/services/agentService";
import { getProjects } from "@/services/projectService";

type Bar = { label: string; percent: number; detail: string; color: string };

export default function QuickStats() {
  const [bars, setBars] = useState<Bar[] | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [usage, workflows, agents, projectsRes]: [
          Usage,
          Awaited<ReturnType<typeof getWorkflows>>,
          Awaited<ReturnType<typeof getAgents>>,
          Awaited<ReturnType<typeof getProjects>>
        ] = await Promise.all([
          getUsage(),
          getWorkflows().catch(() => []),
          getAgents().catch(() => []),
          getProjects(1, 1).catch(() => ({ data: { pagination: { total: 0 } } })),
        ]);

        const aiPercent = usage.limit
          ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
          : Math.min(100, usage.used * 2); // unlimited plan — just show relative activity

        const totalProjects = projectsRes.data?.pagination?.total ?? 0;

        const workflowsWithRuns = workflows.filter((w) => w.runCount > 0);
        const avgWorkflowSuccess = workflowsWithRuns.length
          ? Math.round(
              workflowsWithRuns.reduce((sum, w) => sum + (w.successRate ?? 0), 0) /
                workflowsWithRuns.length
            )
          : 0;

        const agentsWithRequests = agents.filter((a) => a.requestCount > 0);
        const avgAgentSuccess = agentsWithRequests.length
          ? Math.round(
              agentsWithRequests.reduce((sum, a) => sum + (a.successRate ?? 0), 0) /
                agentsWithRequests.length
            )
          : 0;

        setBars([
          {
            label: "AI Usage",
            percent: aiPercent,
            detail: usage.limit ? `${usage.used}/${usage.limit} this month` : `${usage.used} requests (unlimited plan)`,
            color: "bg-blue-600",
          },
          {
            label: "Projects",
            percent: Math.min(100, totalProjects * 10),
            detail: `${totalProjects} project${totalProjects === 1 ? "" : "s"}`,
            color: "bg-purple-600",
          },
          {
            label: "Automation Success Rate",
            percent: avgWorkflowSuccess,
            detail: workflowsWithRuns.length ? `avg across ${workflowsWithRuns.length} workflows` : "No runs yet",
            color: "bg-green-600",
          },
          {
            label: "Agent Success Rate",
            percent: avgAgentSuccess,
            detail: agentsWithRequests.length ? `avg across ${agentsWithRequests.length} agents` : "No activity yet",
            color: "bg-orange-500",
          },
        ]);
      } catch (err) {
        console.error("Failed to load quick stats:", err);
        setBars([]);
      }
    };

    load();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
      <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-50">
        Quick Stats
      </h2>

      {bars === null ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">Loading...</p>
      ) : (
        bars.map((bar) => (
          <div key={bar.label} className="mb-5 last:mb-0">
            <div className="flex justify-between mb-2 text-gray-800 dark:text-gray-200">
              <span>{bar.label}</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">{bar.detail}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`${bar.color} h-3 rounded-full transition-all`}
                style={{ width: `${bar.percent}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
