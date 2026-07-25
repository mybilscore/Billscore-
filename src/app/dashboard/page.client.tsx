// app/dashboard/page.client.tsx - UPDATED WITH RESERVED AMOUNT

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Phone,
  Wifi,
  Zap,
  Tv,
  Wallet,
  TrendingUp,
  CheckCircle,
  CreditCard,
  Smartphone,
  Globe,
  PackageIcon,
  Gift,
  Shield,
  Users,
  BarChart3,
  Activity,
  Copy,
  Check,
  X,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  MessageSquare,
  Send,
  GraduationCap,
  FileText,
  Share2,
  Sparkles,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Types
interface Transaction {
  id: string;
  transactionType: string;
  amount: number;
  serviceFee: number;
  totalDebited: number;
  status: string;
  createdAt: string;
  product: string;
  phoneNumber?: string | null;
  meterNumber?: string | null;
  network?: string | null;
  vendor?: string | null;
}

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
  conversionRate: number;
  recentReferrals: Array<{
    id: string;
    refereeName: string;
    refereeEmail: string;
    status: string;
    reward: number;
    joinedAt: string;
  }>;
}

interface DashboardData {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
    referralCode: string;
  };
  recentTransactions: Transaction[];
  stats: {
    totalTransactions: number;
    totalVolume: number;
    successRate: number;
  };
  quickActions: Array<{
    label: string;
    icon: string;
    href: string;
    description: string;
  }>;
  walletFunding?: {
    accountNumber: string;
    bankName: string;
    accountName: string;
    charges: string;
    minAmount?: number;
    maxAmount?: number;
  };
  referralStats: ReferralStats;
}

interface ClientProps {
  initialData: DashboardData;
}

// Helpers
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
};

// Icon Mapping
const iconMap: Record<string, any> = {
  Phone,
  Wifi,
  Zap,
  Tv,
  Wallet,
  Shield,
  Smartphone,
  Globe,
  CreditCard,
  Users,
  BarChart3,
  Activity,
  Package: PackageIcon,
  Gift,
  Send,
  GraduationCap,
  FileText,
  MessageSquare,
};

// ============================================
// FUND WALLET MODAL
// ============================================
const FundWalletModal = ({
  isOpen,
  onClose,
  fundingData,
}: {
  isOpen: boolean;
  onClose: () => void;
  fundingData: {
    accountNumber: string;
    bankName: string;
    accountName: string;
    charges: string;
    minAmount?: number;
    maxAmount?: number;
  };
}) => {
  const [copied, setCopied] = useState(false);
  const [showAccount, setShowAccount] = useState(true);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fundingData.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success("Account number copied!");
  };

  const toggleAccountVisibility = () => {
    setShowAccount(!showAccount);
  };

  const maskedAccount = fundingData.accountNumber.replace(/\d(?=\d{4})/g, "•");

  const formatAccountNumber = (number: string) => {
    return number.replace(/(\d{4})/g, '$1 ').trim();
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1e293b] shadow-lg">
              <Banknote className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Fund Your Wallet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Make a bank transfer to the account below
            </p>
            {fundingData.minAmount && fundingData.maxAmount && (
              <p className="mt-1 text-xs text-gray-400">
                Min: {formatCurrency(fundingData.minAmount)} • Max: {formatCurrency(fundingData.maxAmount)}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {/* Account Details Card */}
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#1e293b] flex items-center justify-center">
                    <span className="text-xs font-bold text-white">BIL</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Beneficiary</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {fundingData.accountName}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">Bilscore</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Bank</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {fundingData.bankName}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-gray-900 dark:text-white tracking-wider">
                      {showAccount ? formatAccountNumber(fundingData.accountNumber) : maskedAccount}
                    </span>
                    <button
                      onClick={toggleAccountVisibility}
                      className="text-gray-400 hover:text-[#1e293b] transition-colors"
                    >
                      {showAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="text-gray-400 hover:text-[#1e293b] transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Charges Info */}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/30 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <span className="text-yellow-500 text-sm">⚠️</span>
                <div>
                  <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                    Charges: {fundingData.charges}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400/80 mt-0.5">
                    Your wallet will be credited with the exact amount after charges.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-900/20">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 text-sm">💡</span>
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">How to fund:</p>
                  <ol className="mt-1 text-xs text-blue-600 dark:text-blue-400/80 space-y-0.5 list-decimal list-inside">
                    <li>Copy the account number above</li>
                    <li>Make a transfer from your bank app</li>
                    <li>Your wallet will be credited instantly</li>
                    <li>You'll receive a confirmation notification</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 rounded-lg bg-[#1e293b] py-3 text-sm font-medium text-white hover:bg-[#0f172a] transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Account
                </>
              )}
            </button>
          </div>

          <p className="mt-4 text-center text-[10px] text-gray-400">
            Transfers are processed instantly. If you don't receive credit within 5 minutes, contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// WALLET CONTAINER COMPONENT - WITH RESERVED AMOUNT
// ============================================
const WalletContainer = ({
  hasWallet,
  walletBalance,
  reservedAmount = 0,
  availableBalance,
  accountNumber,
  bankName,
  accountName,
  onFundWallet,
  isRefreshing,
}: {
  hasWallet: boolean;
  walletBalance: number;
  reservedAmount?: number;
  availableBalance?: number;
  accountNumber: string;
  bankName: string;
  accountName: string;
  onFundWallet: () => void;
  isRefreshing: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success("Account number copied!");
  };

  const formatAccountNumber = (number: string) => {
    if (!number) return 'N/A';
    return number.replace(/(\d{4})/g, '$1 ').trim();
  };

  const maskedAccount = showFullAccount 
    ? formatAccountNumber(accountNumber)
    : formatAccountNumber(accountNumber).replace(/\d(?=\d{4})/g, '•');

  const displayAvailableBalance = availableBalance !== undefined ? availableBalance : walletBalance;

  return (
    <div className="h-full rounded-xl bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-gray-900 flex flex-col">
      {/* Header with Balance */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Wallet Balance</p>
            {isRefreshing && (
              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-2xl font-bold text-[#1e293b] dark:text-white">
              {hasWallet ? formatCurrency(walletBalance) : 'No Wallet'}
            </p>
            {hasWallet && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle className="h-2.5 w-2.5" />
                Active
              </span>
            )}
          </div>
          {hasWallet ? (
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Total balance</p>
          ) : (
            <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
              No wallet found. Contact support.
            </p>
          )}
        </div>
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1e293b]/5 dark:bg-gray-800">
          <Wallet className="h-5 w-5 text-[#1e293b] dark:text-gray-300" />
        </div>
      </div>

      {/* ✅ Reserved Amount & Available Balance */}
      {hasWallet && reservedAmount > 0 && (
        <div className="mt-2 rounded-lg bg-amber-50 p-2.5 dark:bg-amber-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] text-amber-700 dark:text-amber-400">Reserved for Schedules</span>
            </div>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {formatCurrency(reservedAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-amber-200 dark:border-amber-800/30">
            <span className="text-[10px] text-amber-600 dark:text-amber-400">Available to spend</span>
            <span className={`text-xs font-bold ${displayAvailableBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(displayAvailableBalance)}
            </span>
          </div>
        </div>
      )}

      {/* Account Details */}
      {hasWallet && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-gray-400">Bank</p>
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{bankName}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-gray-400">Account</p>
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={accountName}>
                {accountName.length > 12 ? accountName.substring(0, 12) + '...' : accountName}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-gray-400">Number</p>
              <div className="flex items-center gap-1">
                <p className="text-xs font-mono font-semibold text-gray-900 dark:text-white tracking-wider truncate">
                  {maskedAccount}
                </p>
                <button
                  onClick={() => setShowFullAccount(!showFullAccount)}
                  className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  title={showFullAccount ? "Hide account" : "Show account"}
                >
                  {showFullAccount ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={handleCopyAccount}
                  className="p-0.5 text-gray-400 hover:text-[#1e293b] transition-colors flex-shrink-0"
                  title="Copy account number"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        {hasWallet ? (
          <>
            <button
              onClick={onFundWallet}
              className="flex-1 rounded-lg bg-[#1e293b] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0f172a] transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Banknote className="h-3.5 w-3.5" />
              Fund Wallet
            </button>
          </>
        ) : (
          <button
            disabled
            className="w-full rounded-lg bg-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 cursor-not-allowed"
          >
            No Wallet Available
          </button>
        )}
      </div>

      {/* Quick Info */}
      {hasWallet && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Secured
            </span>
            <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Instant Credit
            </span>
            <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-1">
              <Banknote className="h-3 w-3" />
              Fund Wallet
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// STAT CARD
// ============================================
const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  trend = "up",
}: {
  title: string;
  value: string | number;
  icon: any;
  change?: string;
  trend?: "up" | "down";
}) => {
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon className={`h-3 w-3 ${trend === "up" ? "text-green-500" : "text-red-500"}`} />
              <span className={`text-xs ${trend === "up" ? "text-green-600" : "text-red-600"}`}>{change}</span>
            </div>
          )}
        </div>
        <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
          <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </div>
      </div>
    </div>
  );
};

// ============================================
// TRANSACTION ROW
// ============================================
const TransactionRow = ({ transaction }: { transaction: Transaction }) => {
  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  };
  const statusColor = statusColors[transaction.status as keyof typeof statusColors] || statusColors.PENDING;

  const typeIcons: Record<string, any> = {
    AIRTIME: Phone,
    DATA: Wifi,
    ELECTRICITY_INSTANT: Zap,
    CABLE_TV: Tv,
    EDUCATION: Globe,
    INSURANCE: Shield,
  };
  const Icon = typeIcons[transaction.transactionType] || CreditCard;

  let detail = "";
  if (transaction.phoneNumber) detail = transaction.phoneNumber;
  else if (transaction.meterNumber) detail = `Meter: ${transaction.meterNumber}`;
  else if (transaction.product) detail = transaction.product;

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors duration-200 group-hover:bg-gray-200 dark:bg-gray-800 dark:group-hover:bg-gray-700">
        <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {transaction.transactionType.replace("_", " ")}
          </p>
          <span className={`px-2 py-0.5 text-xs rounded-full ${statusColor}`}>
            {transaction.status}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{detail}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{formatDate(transaction.createdAt)}</span>
          {transaction.network && (
            <>
              <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
              <span className="text-xs text-gray-400">{transaction.network}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(transaction.totalDebited)}
        </span>
        {transaction.serviceFee > 0 && (
          <span className="text-[10px] text-gray-400">+₦{transaction.serviceFee} fee</span>
        )}
      </div>
    </div>
  );
};

// ============================================
// QUICK ACTION BUTTON
// ============================================
const QuickActionButton = ({
  label,
  icon,
  description,
  href,
}: {
  label: string;
  icon: string;
  description: string;
  href: string;
}) => {
  const Icon = iconMap[icon] || Smartphone;

  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-center transition-all duration-300 hover:border-[#1e293b] hover:shadow-lg hover:-translate-y-1 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500"
    >
      <div className="rounded-full bg-gray-100 p-4 transition-all duration-300 group-hover:bg-[#1e293b] group-hover:scale-110 dark:bg-gray-800">
        <Icon className="h-8 w-8 text-gray-700 transition-all duration-300 group-hover:text-white dark:text-gray-300" />
      </div>
      <span className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
        {label}
      </span>
      <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</span>
    </Link>
  );
};

// ============================================
// REFERRAL SECTION - UPDATED WITH CLEAN URL
// ============================================
const ReferralSection = ({ referralStats }: { referralStats: ReferralStats }) => {
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [referralCode, setReferralCode] = useState(referralStats.referralCode);

  const generateReferralCode = async () => {
    if (referralCode) return;

    setGenerating(true);
    try {
      const response = await fetch("/api/user/generate-referral", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setReferralCode(data.referralCode);
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to generate referral code:", error);
    } finally {
      setGenerating(false);
    }
  };

  // ✅ Updated: Clean referral link without /auth
  const getReferralLink = () => {
    return `${window.location.origin}?ref=${referralCode}`;
  };

  const copyReferralLink = async () => {
    try {
      const link = getReferralLink();
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success("Referral link copied!");
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  const shareReferralLink = async () => {
    try {
      const link = getReferralLink();
      const text = `🎉 Join me on Bilscore! Use my referral link to get started and earn rewards. Sign up here: ${link}`;

      if (navigator.share) {
        await navigator.share({
          title: "Join Bilscore - Get Rewards",
          text: text,
          url: link,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        toast.success("Referral link copied!");
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  useEffect(() => {
    if (!referralCode) {
      generateReferralCode();
    }
  }, []);

  if (!referralCode) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 mx-auto text-[#1e293b] animate-spin" />
        <p className="mt-2 text-sm text-gray-500">Setting up your referral link...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Refer & Earn</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Share your referral link and earn <span className="font-medium text-emerald-600">₦50</span> per signup
          </p>
        </div>
        <Link
          href="/dashboard/referral"
          className="text-sm text-[#1e293b] dark:text-gray-300 hover:underline flex items-center gap-1"
        >
          View All
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{referralStats.totalReferrals}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{referralStats.activeReferrals}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{referralStats.pendingReferrals}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Earned</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(referralStats.totalEarned)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Your Referral Link</p>
              <code className="font-mono text-xs font-medium text-[#1e293b] dark:text-white truncate block">
                {getReferralLink()}
              </code>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              <button
                onClick={copyReferralLink}
                className="p-1.5 text-gray-400 hover:text-[#1e293b] dark:hover:text-white transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Copy link"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={shareReferralLink}
                className="p-1.5 text-gray-400 hover:text-[#1e293b] dark:hover:text-white transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`https://wa.me/?text=${encodeURIComponent(`🎉 Join me on Bilscore! Use my referral link to get started and earn rewards. Sign up here: ${getReferralLink()}`)}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#1da851] transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </Link>
        </div>
      </div>

      {referralStats.recentReferrals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Referrals</p>
          <div className="space-y-2">
            {referralStats.recentReferrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {ref.refereeName}
                  </span>
                  <span className="text-xs text-gray-400 truncate">{ref.refereeEmail}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ref.status === "COMPLETED" 
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    {ref.status === "COMPLETED" ? "Active" : "Pending"}
                  </span>
                  {ref.reward > 0 && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(ref.reward)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN DASHBOARD CLIENT
// ============================================
export function DashboardClient({ initialData }: ClientProps) {
  console.log("📱 [CLIENT] DashboardClient mounted with data:", {
    hasWallet: initialData.user.hasWallet,
    walletBalance: initialData.user.walletBalance,
    userId: initialData.user.id,
  });

  const [data, setData] = useState(initialData);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ✅ State for wallet details including reserved amount
  const [walletDetails, setWalletDetails] = useState({
    balance: initialData.user.walletBalance || 0,
    reservedAmount: 0,
    availableBalance: initialData.user.walletBalance || 0,
    hasWallet: initialData.user.hasWallet || false,
  });

  // Refresh balance with reserved amount
  const refreshBalance = async () => {
    if (!data.user.hasWallet) {
      console.log("⚠️ [CLIENT] Cannot refresh balance - no wallet");
      return;
    }
    
    console.log("🔄 [CLIENT] Refreshing balance...");
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/user/balance");
      const result = await response.json();
      console.log("📊 [CLIENT] Balance API response:", result);
      
      if (result.success) {
        console.log(`💰 [CLIENT] Balance: ${result.balance}`);
        console.log(`🔒 [CLIENT] Reserved: ${result.reservedAmount || 0}`);
        console.log(`✅ [CLIENT] Available: ${result.availableBalance || result.balance}`);
        
        setWalletDetails({
          balance: result.balance,
          reservedAmount: result.reservedAmount || 0,
          availableBalance: result.availableBalance !== undefined ? result.availableBalance : result.balance,
          hasWallet: result.hasWallet || false,
        });
        
        setData({
          ...data,
          user: {
            ...data.user,
            walletBalance: result.balance,
            hasWallet: result.hasWallet || false,
          },
        });
      } else {
        console.warn("⚠️ [CLIENT] Balance API returned error:", result.error);
      }
    } catch (error) {
      console.error("❌ [CLIENT] Failed to refresh balance:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh balance every 30 seconds
  useEffect(() => {
    console.log("📱 [CLIENT] Setting up balance refresh interval...");
    const interval = setInterval(refreshBalance, 30000);
    return () => {
      console.log("📱 [CLIENT] Clearing balance refresh interval");
      clearInterval(interval);
    };
  }, []);

  // Log when data changes
  useEffect(() => {
    console.log("📊 [CLIENT] Data updated:", {
      hasWallet: data.user.hasWallet,
      walletBalance: data.user.walletBalance,
    });
  }, [data.user.hasWallet, data.user.walletBalance]);

  const fundingData = data.walletFunding || {
    accountNumber: "6687155683",
    bankName: "PALMPAY",
    accountName: "BILSCORE - USER",
    charges: "1% capped at ₦50",
    minAmount: 100,
    maxAmount: 1000000,
  };

  const stats = [
    {
      title: "Total Transactions",
      value: data.stats.totalTransactions,
      icon: CreditCard,
      change: data.stats.totalTransactions > 0 ? "This month" : "No activity",
      trend: data.stats.totalTransactions > 0 ? "up" : "down",
    },
    {
      title: "Total Volume",
      value: formatCurrency(data.stats.totalVolume),
      icon: TrendingUp,
      change: data.stats.totalVolume > 0 ? "Total spent" : "No volume",
      trend: data.stats.totalVolume > 0 ? "up" : "down",
    },
    {
      title: "Success Rate",
      value: `${data.stats.successRate}%`,
      icon: CheckCircle,
      change: data.stats.successRate >= 80 ? "Excellent" : "Needs attention",
      trend: data.stats.successRate >= 80 ? "up" : "down",
    },
  ];

  const quickActions = [
    { label: "Buy Airtime", icon: "Phone", description: "Instant airtime top-up", href: "/dashboard/airtime" },
    { label: "Buy Data", icon: "Wifi", description: "Data bundles for all networks", href: "/dashboard/data" },
    { label: "Buy Electricity", icon: "Zap", description: "Instant electricity tokens", href: "/dashboard/electricity" },
    { label: "Cable TV", icon: "Tv", description: "DSTV, GOTV, Startimes", href: "/dashboard/cable" },
    { label: "Bulk SMS", icon: "Send", description: "Send SMS to multiple contacts", href: "/dashboard/bulk-sms" },
    { label: "Exams", icon: "GraduationCap", description: "WAEC, NECO, JAMB registration", href: "/dashboard/exams" },
    { label: "Exam Result", icon: "FileText", description: "Check exam results", href: "/dashboard/exam-result" },
    { label: "Bulk Purchase", icon: "Package", description: "Buy multiple units", href: "/dashboard/bulk" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      {/* Fund Wallet Modal */}
      <FundWalletModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        fundingData={fundingData}
      />

      {/* Two equal columns: Left = Stats, Right = Wallet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN – Stats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Overview</h2>
            <span className="text-xs text-gray-400">Last 30 days</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                change={stat.change}
                trend={stat.trend as "up" | "down"}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN – Wallet Container with Reserved Amount */}
        <div>
          <WalletContainer
            hasWallet={walletDetails.hasWallet}
            walletBalance={walletDetails.balance}
            reservedAmount={walletDetails.reservedAmount}
            availableBalance={walletDetails.availableBalance}
            accountNumber={fundingData.accountNumber}
            bankName={fundingData.bankName}
            accountName={fundingData.accountName}
            onFundWallet={() => setIsFundModalOpen(true)}
            isRefreshing={isRefreshing}
          />
        </div>
      </div>

      {/* Quick Actions – Full Width */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
          <Link href="/dashboard/services" className="text-sm text-[#1e293b] hover:underline">
            View All Services →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <QuickActionButton
              key={action.label}
              label={action.label}
              icon={action.icon}
              description={action.description}
              href={action.href}
            />
          ))}
        </div>
      </div>

      {/* REFERRAL SECTION – Full Width */}
      <div className="mt-8">
        <ReferralSection referralStats={data.referralStats} />
      </div>

      {/* Recent Transactions – Full Width */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Transactions</h2>
          <Link href="/dashboard/transactions" className="text-sm text-[#1e293b] hover:underline flex items-center gap-1">
            View All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        {data.recentTransactions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
            <CreditCard className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">No transactions yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Start using Bilscore to see your activity here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>Bilscore – Power Your World, Anytime, Anywhere</p>
        <div className="flex items-center justify-center gap-3 mt-1">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> WhatsApp Bot
          </span>
          <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> USSD *123#
          </span>
          <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
          <span className="flex items-center gap-1">
            <Smartphone className="h-3 w-3" /> Mobile App
          </span>
        </div>
      </div>
    </div>
  );
}