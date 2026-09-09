"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaDownload } from "react-icons/fa";
import {
  createCheckoutSession,
  getSubscription,
  getInvoices,
  Subscription,
  Invoice,
  Pagination,
} from "@/services/billingService";
import { getUsage, Usage } from "@/services/aiService";
import { API_BASE_URL } from "@/services/apiConfig";
import ProgressBar from "@/components/ProgressBar";
import EmptyState from "@/components/EmptyState";
import { SkeletonCards, SkeletonTable } from "@/components/Skeleton";

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(
    null
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const searchParams = useSearchParams();

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const [sub, invoiceData, usageData] = await Promise.all([
        getSubscription(),
        getInvoices(page, 10),
        getUsage(),
      ]);
      setSubscription(sub);
      setInvoices(invoiceData.invoices);
      setPagination(invoiceData.pagination);
      setUsage(usageData);
    } catch (err) {
      console.error("Failed to load subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      const url = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      setUpgrading(false);
    }
  };

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-gray-50">Billing</h1>

      {success === "true" && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
          Payment successful! Your subscription will update shortly.
        </div>
      )}

      {canceled === "true" && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg mb-6">
          Payment was canceled.
        </div>
      )}

      {loading ? (
        <>
          <div className="mb-8">
            <SkeletonCards count={2} />
          </div>
          <SkeletonTable rows={5} columns={5} />
        </>
      ) : (
        <>
          {/* Usage progress bar */}
          {usage && (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 mb-8 transition-colors">
              <ProgressBar
                label="Monthly AI Usage"
                used={usage.used}
                limit={usage.limit}
                unit="Requests"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Free Plan */}
            <div
              className={`bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors ${
                !isPro ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-50">Free Plan</h3>
              <p className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-50">
                $0<span className="text-sm text-gray-400 dark:text-gray-500">/month</span>
              </p>
              <ul className="text-gray-600 dark:text-gray-400 text-sm space-y-2 mb-6">
                <li>✔ Limited AI requests</li>
                <li>✔ Up to 3 projects</li>
                <li>✔ Basic analytics</li>
              </ul>
              {!isPro && (
                <span className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-sm px-3 py-1 rounded-full">
                  Current Plan
                </span>
              )}
            </div>

            {/* Pro Plan */}
            <div
              className={`bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors ${
                isPro ? "ring-2 ring-purple-500" : ""
              }`}
            >
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-50">Pro Plan</h3>
              <p className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-50">
                {/* Matches the actual configured STRIPE_PRICE_ID amount —
                    keep this in sync if you change the price in Stripe. */}
                $49<span className="text-sm text-gray-400 dark:text-gray-500">/month</span>
              </p>
              <ul className="text-gray-600 dark:text-gray-400 text-sm space-y-2 mb-6">
                <li>✔ Unlimited AI Agents</li>
                <li>✔ Advanced Analytics</li>
                <li>✔ Custom Workflows</li>
                <li>✔ Priority Support</li>
                <li>✔ API Access</li>
              </ul>
              {isPro ? (
                <span className="inline-block bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-sm px-3 py-1 rounded-full">
                  Current Plan
                </span>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {upgrading ? "Redirecting..." : "Upgrade to Pro"}
                </button>
              )}
            </div>
          </div>

          {/* Invoice history */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 overflow-x-auto transition-colors">
            <h3 className="text-lg font-bold p-6 pb-0 text-gray-900 dark:text-gray-50">Invoices</h3>
            {invoices.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Your billing history will appear here once you're on a paid plan."
              />
            ) : (
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-left">
                    <th className="p-3 text-gray-700 dark:text-gray-200">Invoice ID</th>
                    <th className="p-3 text-gray-700 dark:text-gray-200">Date</th>
                    <th className="p-3 text-gray-700 dark:text-gray-200">Amount</th>
                    <th className="p-3 text-gray-700 dark:text-gray-200">Status</th>
                    <th className="p-3 text-gray-700 dark:text-gray-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b dark:border-gray-700 last:border-0 text-gray-800 dark:text-gray-200">
                      <td className="p-3 font-mono text-xs">
                        INV-{new Date(inv.createdAt).getFullYear()}-{String(inv.id).padStart(4, "0")}
                      </td>
                      <td className="p-3">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">${(inv.amountCents / 100).toFixed(2)}</td>
                      <td className="p-3">
                        <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full capitalize">
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <a
                          href={`${API_BASE_URL}/billing/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <FaDownload /> Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-3 border-t dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded-lg border dark:border-gray-700 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-3 py-1 rounded-lg border dark:border-gray-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
