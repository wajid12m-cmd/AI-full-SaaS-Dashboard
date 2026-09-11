"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser, FaShieldAlt, FaBell, FaSlidersH, FaExclamationTriangle,
  FaCheck, FaDesktop, FaMoon, FaSun, FaCamera,
} from "react-icons/fa";
import { getUserById, updateUser, changePassword, updatePreferences, uploadAvatar, deleteOwnAccount, UserProfile } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { getErrorMessage } from "@/lib/errors";
import Avatar from "@/components/Avatar";
import Modal from "@/components/modal";

type Tab = "profile" | "security" | "notifications" | "preferences";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: FaUser },
  { id: "security", label: "Security", icon: FaShieldAlt },
  { id: "notifications", label: "Notifications", icon: FaBell },
  { id: "preferences", label: "Preferences", icon: FaSlidersH },
];

function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
      <FaCheck /> Saved
    </span>
  );
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const { preference, setPreference } = useTheme();

  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Profile tab
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Security tab
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [savingTwoFactor, setSavingTwoFactor] = useState(false);

  // Notifications tab
  const [notifyWeeklyReports, setNotifyWeeklyReports] = useState(true);
  const [notifySecurityAlerts, setNotifySecurityAlerts] = useState(true);
  const [notifyProductUpdates, setNotifyProductUpdates] = useState(false);
  const [savingNotifKey, setSavingNotifKey] = useState<string | null>(null);

  // Danger zone
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const p = await getUserById(user.id);
        setProfile(p);
        setName(p.name);
        setEmail(p.email);
        setAvatarUrl(p.avatarUrl || "");
        setTwoFactorEnabled(p.twoFactorEnabled);
        setNotifyWeeklyReports(p.notifyWeeklyReports);
        setNotifySecurityAlerts(p.notifySecurityAlerts);
        setNotifyProductUpdates(p.notifyProductUpdates);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load profile."));
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be under 3MB.");
      return;
    }

    setError("");
    setUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(file);
      setAvatarUrl(updated.avatarUrl || "");
      setProfile(updated);
      await refreshUser();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSavingProfile(true);
    try {
      await updateUser(user.id, { name, email });
      if (avatarUrl !== (profile?.avatarUrl || "")) {
        await updatePreferences({ avatarUrl: avatarUrl || null });
      }
      await refreshUser();
      setProfile((p) => (p ? { ...p, name, email, avatarUrl: avatarUrl || null } : p));
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save changes."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err) {
      setPasswordError(getErrorMessage(err, "Failed to change password."));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    const next = !twoFactorEnabled;
    setTwoFactorEnabled(next);
    setSavingTwoFactor(true);
    try {
      await updatePreferences({ twoFactorEnabled: next });
    } catch {
      setTwoFactorEnabled(!next); // revert on failure
    } finally {
      setSavingTwoFactor(false);
    }
  };

  const handleToggleNotification = async (
    key: "notifyWeeklyReports" | "notifySecurityAlerts" | "notifyProductUpdates",
    current: boolean,
    setter: (v: boolean) => void
  ) => {
    const next = !current;
    setter(next);
    setSavingNotifKey(key);
    try {
      await updatePreferences({ [key]: next });
    } catch {
      setter(current); // revert on failure
    } finally {
      setSavingNotifKey(null);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteOwnAccount();
      await logout();
      router.push("/login");
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete account."));
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900 dark:text-gray-50">Settings</h1>

      {error && (
        <p className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg mb-4 max-w-2xl">
          {error}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b dark:border-gray-700 mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              tab === id
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl">
        {/* PROFILE TAB */}
        {tab === "profile" && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 space-y-5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Avatar name={name || "?"} avatarUrl={avatarUrl} size={72} />
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Upload a photo from this device"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-gray-900 hover:bg-blue-700 disabled:opacity-60"
                >
                  <FaCamera className="text-xs" />
                </button>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-gray-50">{name}</p>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-medium capitalize">
                  {profile?.role === "admin" ? "Admin" : "Pro Member"}
                </span>
                {uploadingAvatar && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Avatar URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Must be a direct link to an image file (ends in .jpg/.png/etc — not a Google Drive/Photos share
                page). Easier: use the camera icon above to upload from this device instead.
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
              <SavedBadge show={profileSaved} />
            </div>
          </form>
        )}

        {/* SECURITY TAB */}
        {tab === "security" && (
          <div className="space-y-6">
            <form
              onSubmit={handleChangePassword}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 space-y-4 transition-colors"
            >
              <h2 className="font-semibold text-gray-900 dark:text-gray-50">Change Password</h2>

              {passwordError && (
                <p className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-sm p-2 rounded">
                  {passwordError}
                </p>
              )}

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="At least 8 characters, with a letter and a number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
                <SavedBadge show={passwordSaved} />
              </div>
            </form>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-50">Two-Factor Authentication</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                    Add an extra verification step at login. Your preference is saved now — the
                    login-time verification step is still being built and isn&apos;t enforced yet.
                  </p>
                </div>
                <button
                  onClick={handleToggleTwoFactor}
                  disabled={savingTwoFactor}
                  role="switch"
                  aria-checked={twoFactorEnabled}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-4 disabled:opacity-60 ${
                    twoFactorEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      twoFactorEnabled ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === "notifications" && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 divide-y dark:divide-gray-700 transition-colors">
            {[
              { key: "notifyWeeklyReports" as const, label: "Weekly Reports", desc: "A summary of your usage and activity every Monday.", value: notifyWeeklyReports, setter: setNotifyWeeklyReports },
              { key: "notifySecurityAlerts" as const, label: "Security Alerts", desc: "Sign-ins from a new device, password changes, and similar events.", value: notifySecurityAlerts, setter: setNotifySecurityAlerts },
              { key: "notifyProductUpdates" as const, label: "Product Updates", desc: "New features and occasional announcements.", value: notifyProductUpdates, setter: setNotifyProductUpdates },
            ].map(({ key, label, desc, value, setter }) => (
              <div key={key} className="flex items-center justify-between p-6">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-50">{label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => handleToggleNotification(key, value, setter)}
                  disabled={savingNotifKey === key}
                  role="switch"
                  aria-checked={value}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-4 disabled:opacity-60 ${
                    value ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      value ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* PREFERENCES TAB */}
        {tab === "preferences" && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 p-6 transition-colors">
            <h2 className="font-semibold text-gray-900 dark:text-gray-50 mb-1">Theme</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose how the dashboard looks on this device.</p>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { id: "light" as const, label: "Light", icon: FaSun },
                { id: "dark" as const, label: "Dark", icon: FaMoon },
                { id: "system" as const, label: "System", icon: FaDesktop },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPreference(id)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-lg border-2 transition ${
                    preference === id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <Icon className="text-lg" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DANGER ZONE — shown on every tab, like most SaaS settings pages */}
        <div className="mt-8 border-2 border-red-200 dark:border-red-900/50 rounded-xl p-6 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="text-red-500 mt-1 shrink-0" />
            <div className="flex-1">
              <h2 className="font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
              <p className="text-sm text-red-600/80 dark:text-red-400/70 mt-1 mb-3">
                Permanently delete your account and all associated data — projects, agents,
                workflows, chat history, and billing records. This cannot be undone.
              </p>
              <button
                onClick={() => { setDeleteModalOpen(true); setDeleteConfirmText(""); setDeleteError(""); }}
                className="border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete your account?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will permanently delete your account and everything in it. Type{" "}
            <strong className="text-gray-900 dark:text-gray-100">DELETE</strong> to confirm.
          </p>
          {deleteError && (
            <p className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-sm p-2 rounded">
              {deleteError}
            </p>
          )}
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="w-full border dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleting}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
