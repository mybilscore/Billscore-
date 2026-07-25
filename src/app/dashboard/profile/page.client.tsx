// app/dashboard/profile/page.client.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Loader2,
  CreditCard,
  Wallet,
  TrendingUp,
  Users,
  ShoppingBag,
  Repeat,
  Clock,
  Edit2,
  Save,
  X,
  Camera,
  Copy,
  Check,
  Share2,
  LogOut,
  Key,
  Globe,
  MessageSquare,
  Smartphone,
  Zap,
  Tv,
  Wifi,
  Package,
  Gift,
  BarChart3,
  Activity,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Star,
  StarOff,
} from "lucide-react";

interface UserData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  hasWallet: boolean;
  walletBalance: number;
  accountNumber: string;
  bankName: string;
  accountName: string;
  referralCode: string;
  isVerified: boolean;
  kycStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
  preferredChannel: string | null;
  preferredLanguage: string;
}

interface ProfileStats {
  totalCustomers: number;
  totalTransactions: number;
  totalSubscriptions: number;
  totalPreOrders: number;
  totalSpent: number;
  successRate: number;
  successCount: number;
  totalFailed: number;
}

interface RecentCustomer {
  id: string;
  phone: string;
  fullName: string | null;
  totalTransactions: number;
  totalSpent: number;
  lastTransactionAt: string | null;
}

interface Channel {
  id: string;
  channelType: string;
  channelIdentifier: string;
  channelUsername: string | null;
  isVerified: boolean;
  linkedAt: string;
  lastSeen: string;
}

interface ProfileClientProps {
  user: UserData;
  stats: ProfileStats;
  recentCustomers: RecentCustomer[];
  channels: Channel[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-NG", { 
    month: "long", 
    day: "numeric", 
    year: "numeric" 
  });
};

const formatRelativeTime = (dateString: string | null) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

// Stat Card Component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  subtitle 
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  color: string; 
  subtitle?: string; 
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`rounded-full p-2 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
};

// Edit Profile Modal
const EditProfileModal = ({
  isOpen,
  onClose,
  user,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: UserData;
  onSave: (data: any) => void;
}) => {
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setLoading(true);
    try {
      await onSave({ fullName, email, phone });
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e293b]">
              <Edit2 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Profile
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update your personal information
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[#1e293b] py-3 text-sm font-medium text-white hover:bg-[#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Change Password Modal
const ChangePasswordModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to change password");
      }

      toast.success("Password changed successfully!");
      onClose();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e293b]">
              <Key className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Change Password
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update your security credentials
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[#1e293b] py-3 text-sm font-medium text-white hover:bg-[#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Key className="h-4 w-4" />
            )}
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
};

export function ProfileClient({
  user: initialUser,
  stats,
  recentCustomers,
  channels,
}: ProfileClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [copied, setCopied] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Copy referral link
  const copyReferralLink = async () => {
    if (!user.referralCode) return;
    
    try {
      const link = `${window.location.origin}/auth?ref=${user.referralCode}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success("Referral link copied!");
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy link");
    }
  };

  // Share referral link
  const shareReferralLink = async () => {
    if (!user.referralCode) return;
    
    try {
      const link = `${window.location.origin}/auth?ref=${user.referralCode}`;
      const text = `🎉 Join me on Bilscore! Use my referral code ${user.referralCode} to get started and earn rewards. Sign up here: ${link}`;

      if (navigator.share) {
        await navigator.share({
          title: "Join Bilscore - Get Rewards",
          text: text,
          url: link,
        });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        toast.success("Referral link copied!");
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to share link");
    }
  };

  const handleUpdateProfile = async (data: any) => {
    try {
      const response = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
      }

      setUser({ ...user, ...data });
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      {/* Modals */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onSave={handleUpdateProfile}
      />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">
            Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-[#1e293b] flex items-center justify-center text-3xl font-bold text-white">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <button className="absolute bottom-0 right-0 rounded-full bg-[#1e293b] p-1.5 text-white hover:bg-[#0f172a] transition-colors">
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {user.fullName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {user.role.replace("_", " ")}
                      </span>
                      {user.isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <AlertCircle className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-all flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {user.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {user.phone}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDate(user.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Login</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-400" />
                    {formatRelativeTime(user.lastLoginAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Preferred Language</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    {user.preferredLanguage || "English"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Preferred Channel</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    {user.preferredChannel || "Mobile App"}
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Info */}
            {user.hasWallet && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[#1e293b]" />
                  Wallet Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                    <p className="text-2xl font-bold text-[#1e293b] dark:text-white">
                      {formatCurrency(user.walletBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Account Number</p>
                    <p className="font-mono font-medium text-gray-900 dark:text-white">
                      {user.accountNumber}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {user.bankName} • {user.accountName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Connected Channels */}
            {channels.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-[#1e293b]" />
                  Connected Channels
                </h3>
                <div className="space-y-2">
                  {channels.map((channel) => (
                    <div key={channel.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
                          {channel.channelType === "WHATSAPP" && <MessageSquare className="h-4 w-4" />}
                          {channel.channelType === "SMS" && <Smartphone className="h-4 w-4" />}
                          {channel.channelType === "MOBILE_APP" && <Smartphone className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {channel.channelType}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {channel.channelIdentifier}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {channel.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <AlertCircle className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Activity Overview
              </h3>
              <div className="space-y-3">
                <StatCard
                  title="Total Transactions"
                  value={stats.totalTransactions}
                  icon={ShoppingBag}
                  color="bg-blue-500"
                />
                <StatCard
                  title="Total Spent"
                  value={formatCurrency(stats.totalSpent)}
                  icon={CreditCard}
                  color="bg-purple-500"
                />
                <StatCard
                  title="Success Rate"
                  value={`${stats.successRate}%`}
                  icon={TrendingUp}
                  color="bg-green-500"
                  subtitle={`${stats.successCount} successful • ${stats.totalFailed} failed`}
                />
                <StatCard
                  title="Customers"
                  value={stats.totalCustomers}
                  icon={Users}
                  color="bg-amber-500"
                />
                <StatCard
                  title="Subscriptions"
                  value={stats.totalSubscriptions}
                  icon={Repeat}
                  color="bg-indigo-500"
                />
                <StatCard
                  title="Pre-Orders"
                  value={stats.totalPreOrders}
                  icon={Clock}
                  color="bg-rose-500"
                />
              </div>
            </div>

            {/* Referral Code */}
            {user.referralCode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800/30 dark:bg-amber-900/20">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Referral Code
                </h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-white px-4 py-2 font-mono text-sm text-amber-800 dark:bg-gray-800 dark:text-amber-300">
                    {user.referralCode}
                  </code>
                  <button
                    onClick={copyReferralLink}
                    className="rounded-lg bg-amber-200 p-2 text-amber-700 hover:bg-amber-300 dark:bg-amber-800/30 dark:text-amber-400 dark:hover:bg-amber-800/50 transition-colors"
                    title="Copy referral link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={shareReferralLink}
                    className="rounded-lg bg-amber-200 p-2 text-amber-700 hover:bg-amber-300 dark:bg-amber-800/30 dark:text-amber-400 dark:hover:bg-amber-800/50 transition-colors"
                    title="Share referral link"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Link copied to clipboard!
                  </p>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 transition-all"
                >
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Key className="h-4 w-4" />
                    Change Password
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button
                  onClick={() => router.push("/dashboard/settings")}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 transition-all"
                >
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Settings className="h-4 w-4" />
                    Settings
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button
                  onClick={() => router.push("/dashboard/wallet")}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 transition-all"
                >
                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Wallet className="h-4 w-4" />
                    Wallet
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button
                  onClick={async () => {
                    await fetch("/api/auth/signout", { method: "POST" });
                    window.location.href = "/auth/sign-in";
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-red-100 p-3 hover:bg-red-50 dark:border-red-800/30 dark:hover:bg-red-900/20 transition-all"
                >
                  <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </span>
                  <ChevronRight className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileClient;