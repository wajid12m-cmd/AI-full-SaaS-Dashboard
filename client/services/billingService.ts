import apiClient from "./apiClient";

export interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd?: string;
}

export interface Invoice {
  id: number;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function createCheckoutSession(): Promise<string> {
  const res = await apiClient.post("/billing/create-checkout-session", {});
  return res.data.url;
}

export async function getSubscription(): Promise<Subscription> {
  const res = await apiClient.get("/billing/subscription");
  return res.data.data;
}

export async function getInvoices(
  page: number = 1,
  limit: number = 10
): Promise<{ invoices: Invoice[]; pagination: Pagination }> {
  const res = await apiClient.get("/billing/invoices", { params: { page, limit } });
  return res.data.data;
}
