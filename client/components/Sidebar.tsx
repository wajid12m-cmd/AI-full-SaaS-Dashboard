"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaChartPie,
  FaFolder,
  FaRobot,
  FaChartLine,
  FaCreditCard,
  FaCog,
  FaUserShield,
  FaBolt,
  FaUsersCog,
  FaPlug,
} from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";

type SidebarProps = {
  isSidebarOpen: boolean;
};

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: FaChartPie },
  { label: "Automation", href: "/dashboard/automation", icon: FaBolt },
  { label: "AI Agents", href: "/dashboard/agents", icon: FaUsersCog },
  { label: "Projects", href: "/dashboard/projects", icon: FaFolder },
  { label: "AI Assistant", href: "/dashboard/ai-assistant", icon: FaRobot },
  { label: "Analytics", href: "/dashboard/analytics", icon: FaChartLine },
  { label: "Integrations", href: "/dashboard/integrations", icon: FaPlug },
  { label: "Billing", href: "/dashboard/billing", icon: FaCreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: FaCog },
];

export default function Sidebar({ isSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const items = isAdmin
    ? [...menuItems, { label: "Admin", href: "/dashboard/admin", icon: FaUserShield }]
    : menuItems;

  return (
    <aside
      aria-label="Main navigation"
      className={`
        w-64 h-screen md:h-full overflow-y-auto p-5
        bg-gray-900 text-white
        dark:bg-white/[0.03] dark:backdrop-blur-xl dark:border-r dark:border-white/10
        ${isSidebarOpen ? "block fixed z-50" : "hidden"}
        md:block md:static
      `}
    >
      <h2 className="text-2xl font-bold mb-8 text-center bg-gradient-to-r from-[#5b6ef5] via-[#8b5cf6] to-[#22d3ee] bg-clip-text text-transparent">
        🤖 AI SaaS
      </h2>

      <nav>
        <ul className="space-y-2">
          {items.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#5b6ef5] ${
                    isActive
                      ? "bg-blue-600 dark:bg-[#5b6ef5]/20 dark:border dark:border-[#5b6ef5]/40 dark:shadow-[0_0_20px_-5px_rgba(91,110,245,0.6)]"
                      : "hover:bg-blue-600 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon aria-hidden="true" className={isActive ? "dark:text-[#8b9bff]" : ""} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}