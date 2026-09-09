"use client";

import { useEffect, useState } from "react";
import { FaSlack, FaGoogleDrive, FaHubspot, FaBolt, FaMailBulk, FaSalesforce, FaPlug, FaGithub } from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import { SkeletonCards, SkeletonTable } from "@/components/Skeleton";
import { getIntegrations, updateIntegrationStatus, Integration } from "@/services/integrationService";

const ICONS: Record<string, React.ElementType> = {
  Slack: FaSlack,
  GitHub: FaGithub,
  "Google Drive": FaGoogleDrive,
  Notion: FaHubspot,
  Zapier: FaBolt,
  Mailchimp: FaMailBulk,
  Salesforce: FaSalesforce,
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setIntegrations(await getIntegrations());
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (integration: Integration) => {
    setUpdatingId(integration.id);
    const nextStatus = integration.status === "connected" ? "disconnected" : "connected";
    try {
      const updated = await updateIntegrationStatus(integration.id, nextStatus);
      setIntegrations((prev) => prev.map((i) => (i.id === integration.id ? updated : i)));
    } catch (err) {
      console.error("Failed to update integration:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-gray-50">Integrations</h1>
        <div className="mb-8">
          <SkeletonCards count={3} />
        </div>
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-gray-50">Integrations</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Active Integrations</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{connectedCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Ready to Connect</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{integrations.length - connectedCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Total Available</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{integrations.length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 overflow-x-auto transition-colors">
        {integrations.length === 0 ? (
          <EmptyState
            title="No integrations available"
            description="Third-party integrations will show up here once configured."
          />
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left">
              <th className="p-3 text-gray-700 dark:text-gray-200">Integration</th>
              <th className="p-3 text-gray-700 dark:text-gray-200">Status</th>
              <th className="p-3 text-gray-700 dark:text-gray-200">Connected On</th>
              <th className="p-3 text-gray-700 dark:text-gray-200">Action</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration) => {
              const Icon = ICONS[integration.name] || FaPlug;
              const isConnected = integration.status === "connected";
              return (
                <tr key={integration.id} className="border-b dark:border-gray-700 last:border-0 text-gray-800 dark:text-gray-200">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                        <Icon />
                      </div>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{integration.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        isConnected
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">
                    {integration.connectedOn ? new Date(integration.connectedOn).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggle(integration)}
                      disabled={updatingId === integration.id}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 ${
                        isConnected
                          ? "border border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {updatingId === integration.id ? "..." : isConnected ? "Disconnect" : "Connect"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
