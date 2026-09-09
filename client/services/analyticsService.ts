import apiClient from "./apiClient";

export interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  totalAiRequests: number;
  monthlyRequests: {
    month: string;
    count: number;
  }[];
  monthlyUsers: {
    month: string;
    count: number;
  }[];
  monthlyRevenue: {
    month: string;
    amount: number;
  }[];
  revenueEnabled: boolean;
  projectStatus: {
    name: string;
    value: number;
  }[];
  recentActivity: {
    action: string;
    date: string;
  }[];
}

const mockAnalytics: AnalyticsData = {
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

export async function getAnalytics(): Promise<{ data: AnalyticsData }> {
  try {
    const response = await apiClient.get("/analytics");
    return { data: response.data.data };
  } catch (error) {
    console.error("getAnalytics error:", error);
    // Agar API fail ho (backend down / auth issue), mock data return karo
    return { data: mockAnalytics };
  }
}
