"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaBars,
  FaBell,
  FaCog,
  FaSignOutAlt,
  FaChevronDown,
} from "react-icons/fa";
import ThemeToggle from "./ThemeToggle";
import Avatar from "./Avatar";
import { getAnalytics } from "@/services/analyticsService";
import { useAuth } from "@/context/AuthContext";

type NavbarProps = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onLogout: () => void;
};

type Notification = {
  action: string;
  date: string;
};

// Activity text ke hisaab se decide karta hai kis page pe le jana hai
const getNotificationLink = (action: string): string => {
  const lower = action.toLowerCase();
  if (lower.includes("ai") || lower.includes("request")) return "/dashboard/ai-assistant";
  if (lower.includes("project")) return "/dashboard/projects";
  if (lower.includes("payment") || lower.includes("subscription")) return "/dashboard/billing";
  if (lower.includes("user")) return "/dashboard/admin";
  return "/dashboard";
};

export default function Navbar({
  isSidebarOpen,
  setIsSidebarOpen,
  onLogout,
}: NavbarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const userName = user?.name || "User";
  const [search, setSearch] = useState("");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await getAnalytics();
        setNotifications(res.data.recentActivity.slice(0, 5));
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };
    loadNotifications();
  }, []);

  // Bahar click karne pe dono dropdowns band ho jayein
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/dashboard/projects?search=${encodeURIComponent(search.trim())}`);
  };

  const handleNotificationClick = (action: string) => {
    setShowNotifications(false);
    router.push(getNotificationLink(action));
  };

  return (
    <nav className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl shadow border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between transition-colors relative z-20">

      <div className="flex items-center gap-4">

        <button
          className="md:hidden text-2xl text-gray-700 dark:text-gray-200"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <FaBars />
        </button>

        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#5b6ef5] via-[#8b5cf6] to-[#22d3ee] bg-clip-text text-transparent">
          🤖 AI SaaS
        </h1>

      </div>

      <form onSubmit={handleSearch} className="hidden md:block w-1/3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects... (press Enter)"
          className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div className="flex items-center gap-5">

        <ThemeToggle />

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative"
            aria-label="Notifications"
          >
            <FaBell className="text-2xl cursor-pointer text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="px-4 py-3 border-b dark:border-gray-700 font-semibold text-gray-800 dark:text-gray-100">
                Notifications
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">
                  No new notifications.
                </p>
              ) : (
                <ul className="max-h-64 overflow-y-auto">
                  {notifications.map((n, i) => (
                    <li key={i} className="border-b dark:border-gray-700 last:border-0">
                      <button
                        onClick={() => handleNotificationClick(n.action)}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <p>{n.action}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(n.date).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <Link href="/dashboard/settings" aria-label="Settings">
          <FaCog className="text-2xl cursor-pointer text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" />
        </Link>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="flex items-center gap-2"
            aria-label="User menu"
          >
            <Avatar name={userName} avatarUrl={user?.avatarUrl} size={32} />
            <span className="hidden md:block font-medium text-gray-700 dark:text-gray-200">
              {userName}
            </span>
            <FaChevronDown className="hidden md:block text-xs text-gray-400 dark:text-gray-500" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="px-4 py-3 border-b dark:border-gray-700">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {userName}
                </p>
              </div>

              <Link
                href="/dashboard/settings"
                onClick={() => setShowUserMenu(false)}
                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Profile Settings
              </Link>

              <Link
                href="/dashboard/billing"
                onClick={() => setShowUserMenu(false)}
                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Billing
              </Link>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
                className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition border-t dark:border-gray-700"
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          )}
        </div>

      </div>

    </nav>
  );
}