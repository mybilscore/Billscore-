// app/dashboard/bill-schedule/transactions/page.client.tsx - UPDATED with full details

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Wallet,
  RefreshCw,
  Eye,
  Lock,
  TrendingUp,
  Hash,
  Globe,
  Copy,
  Check,
  Smartphone,
  Building,
} from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  transactionType: string;
  amount: number;
  totalDebited: number;
  status: string;
  product: string | null;
  phoneNumber: string | null;
  meterNumber: string | null;
  meterType: string | null;
  network: string | null;
  token: string | null;
  vendor: string | null;
  vendorReference: string | null;
  vendorCommission: number | null;
  commissionRate: number | null;
  channel: string | null;
  createdAt: string;
  deliveredAt: string | null;
  scheduledFor: string | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
  walletReference: string | null;
  walletDescription: string | null;
  preOrder: {
    id: string;
    meterNumber: string | null;
    disCo: string | null;
    amount: number;
    deliveryDate: string;
    status: string;
  } | null;
}

interface BillScheduleTransactionsClientProps {
  transactions: Transaction[];
  stats: {
    totalPreOrders: number;
    totalPreOrderSpent: number;
    totalTransactions: number;
    pendingCount: number;
    successCount: number;
    failedCount: number;
    processingCount: number;
  };
  walletBalance: number;
}

// Brand Colors
const BRAND_COLORS = {
  primary: '#1e293b',
  primaryLight: '#334155',
  primaryDark: '#0f172a',
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  primaryText: '#0F172A',
  secondaryText: '#64748B',
  border: '#E8EAF0',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0D3B8E',
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "—";
  }
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

const formatDateShort = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "SUCCESS": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "FAILED": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "PENDING": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "PROCESSING": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "SUCCESS": return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case "FAILED": return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    case "PENDING": return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    case "PROCESSING": return <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default: return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
};

const getTransactionTypeLabel = (type: string) => {
  switch (type) {
    case "ELECTRICITY_INSTANT": return "Electricity";
    case "ELECTRICITY_PREORDER": return "Electricity (Pre-Order)";
    case "CABLE_TV": return "Cable TV";
    default: return type || "Pre-Order";
  }
};

const getDiscoColor = (disco: string | null) => {
  if (!disco) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const d = disco.toUpperCase();
  if (d.includes("IKEJA")) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
  if (d.includes("EKO")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  if (d.includes("ABUJA")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (d.includes("KANO")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (d.includes("IBADAN")) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
};

// Stats Card Component with Brand Colors
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  iconBg,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  subtitle?: string;
  iconBg?: string;
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold" style={{ color: color }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div 
          className="rounded-full p-2.5"
          style={{ backgroundColor: iconBg || color + '15' }}
        >
          <Icon className="h-5 w-5" style={{ color: color }} />
        </div>
      </div>
    </div>
  );
};

// Transaction Row Component
const TransactionRow = ({ transaction }: { transaction: Transaction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success("Copied to clipboard!");
  };

  // Check if token should be visible
  const shouldShowToken = transaction.scheduledFor && new Date(transaction.scheduledFor) <= new Date();
  const isDelivered = transaction.status === "SUCCESS" && transaction.deliveredAt;
  const isPreOrderDelivered = transaction.preOrder?.status === "DELIVERED";
  const showToken = shouldShowToken || isDelivered || isPreOrderDelivered;

  const hasBalanceBefore = transaction.balanceBefore !== null && 
                          transaction.balanceBefore !== undefined && 
                          !isNaN(transaction.balanceBefore);
  const hasBalanceAfter = transaction.balanceAfter !== null && 
                         transaction.balanceAfter !== undefined && 
                         !isNaN(transaction.balanceAfter);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div
        className="grid grid-cols-12 gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Type */}
        <div className="col-span-2 flex items-center gap-2">
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-1.5">
            <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Pre-Order
          </span>
        </div>

        {/* Meter Number */}
        <div className="col-span-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Hash className="h-3.5 w-3.5 text-gray-400" />
          <span className="truncate font-mono">
            {transaction.meterNumber || transaction.product || "—"}
          </span>
        </div>

        {/* DisCo / Provider */}
        <div className="col-span-2 flex items-center">
          {transaction.preOrder?.disCo ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getDiscoColor(transaction.preOrder.disCo)}`}>
              {transaction.preOrder.disCo}
            </span>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
          )}
        </div>

        {/* Amount */}
        <div className="col-span-2 flex flex-col items-end">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatCurrency(transaction.amount)}
          </span>
          {transaction.vendorCommission !== null && transaction.vendorCommission > 0 && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{formatCurrency(transaction.vendorCommission)}
            </span>
          )}
        </div>

        {/* Status */}
        <div className="col-span-2 flex items-center">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(transaction.status)}`}>
            {getStatusIcon(transaction.status)}
            {transaction.status}
          </span>
        </div>

        {/* Schedule Date */}
        <div className="col-span-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          {transaction.scheduledFor ? formatDateShort(transaction.scheduledFor) : "—"}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Transaction ID</span>
                <span className="font-mono text-xs text-gray-900 dark:text-white">{transaction.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Service</span>
                <span className="text-gray-900 dark:text-white">
                  {getTransactionTypeLabel(transaction.transactionType)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Meter Number</span>
                <span className="font-mono text-sm text-gray-900 dark:text-white">
                  {transaction.meterNumber || "—"}
                </span>
              </div>
              {transaction.meterType && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Meter Type</span>
                  <span className="text-gray-900 dark:text-white">{transaction.meterType}</span>
                </div>
              )}
              {transaction.preOrder?.disCo && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">DisCo</span>
                  <span className="text-gray-900 dark:text-white">{transaction.preOrder.disCo}</span>
                </div>
              )}
              {transaction.phoneNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Phone</span>
                  <span className="text-gray-900 dark:text-white">{transaction.phoneNumber}</span>
                </div>
              )}
              {transaction.network && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Network</span>
                  <span className="text-gray-900 dark:text-white">{transaction.network}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Amount</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(transaction.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Debited</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(transaction.totalDebited)}</span>
              </div>
              
              {/* ✅ Vendor - Hardcoded to BILSCORE */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Vendor</span>
                <span className="text-gray-900 dark:text-white font-medium">BILSCORE</span>
              </div>
              
              {/* ✅ Vendor Reference */}
              {transaction.vendorReference && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Reference</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-white">{transaction.vendorReference}</span>
                </div>
              )}
              
              {/* ✅ Commission */}
              {transaction.vendorCommission !== null && transaction.vendorCommission > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Commission</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    +{formatCurrency(transaction.vendorCommission)}
                  </span>
                </div>
              )}
              
              {/* ✅ Commission Rate */}
              {transaction.commissionRate !== null && transaction.commissionRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Commission Rate</span>
                  <span className="text-gray-900 dark:text-white">{transaction.commissionRate}%</span>
                </div>
              )}
              
              {/* ✅ Channel */}
              {transaction.channel && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Channel</span>
                  <span className="text-gray-900 dark:text-white">{transaction.channel}</span>
                </div>
              )}
              
              {/* ✅ Balance Before/After */}
              {hasBalanceBefore && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    Balance Before
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(transaction.balanceBefore)}
                  </span>
                </div>
              )}
              {hasBalanceAfter && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    Balance After
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(transaction.balanceAfter)}
                  </span>
                </div>
              )}
              
              {/* ✅ Token - Only show if on/after schedule date */}
              {showToken && transaction.token ? (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500 dark:text-gray-400">Token</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {transaction.token}
                    </code>
                    <button
                      onClick={() => handleCopy(transaction.token!)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy token"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Token</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Lock className="h-3 w-3" />
                    Available on {transaction.scheduledFor ? formatDate(transaction.scheduledFor) : "delivery date"}
                  </span>
                </div>
              )}
              
              {/* ✅ Schedule & Delivery */}
              {transaction.scheduledFor && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Schedule Date</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(transaction.scheduledFor)}</span>
                </div>
              )}
              {transaction.deliveredAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Delivered</span>
                  <span className="text-green-600 dark:text-green-400">{formatDate(transaction.deliveredAt)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Created</span>
                <span className="text-gray-900 dark:text-white">{formatDate(transaction.createdAt)}</span>
              </div>
              {transaction.preOrder && (
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Pre-Order Status</span>
                  <span className="text-gray-900 dark:text-white">{transaction.preOrder.status}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function BillScheduleTransactionsClient({
  transactions,
  stats,
  walletBalance,
}: BillScheduleTransactionsClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const brandColor = BRAND_COLORS.primary;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = 
        t.meterNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.vendorReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.preOrder?.disCo?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || t.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTerm, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const statuses = ["SUCCESS", "FAILED", "PENDING", "PROCESSING"];

  const filteredTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">
              Bill Schedule Transactions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View all your scheduled bill transactions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Wallet Balance</p>
              <p className="text-lg font-bold text-[#1e293b] dark:text-white">
                {formatCurrency(walletBalance)}
              </p>
            </div>
            <Link
              href="/dashboard/bill-schedule"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Schedule
            </Link>
          </div>
        </div>

        {/* ✅ Stats Cards with Brand Colors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Pre-Orders"
            value={stats.totalPreOrders}
            icon={Calendar}
            color={brandColor}
            iconBg={brandColor + '10'}
            subtitle={`${formatCurrency(stats.totalPreOrderSpent)} total`}
          />
          <StatsCard
            title="Successful"
            value={stats.successCount}
            icon={CheckCircle}
            color={BRAND_COLORS.success}
            iconBg={BRAND_COLORS.success + '15'}
          />
          <StatsCard
            title="Pending"
            value={stats.pendingCount + stats.processingCount}
            icon={Clock}
            color={BRAND_COLORS.warning}
            iconBg={BRAND_COLORS.warning + '15'}
          />
          <StatsCard
            title="Failed"
            value={stats.failedCount}
            icon={XCircle}
            color={BRAND_COLORS.error}
            iconBg={BRAND_COLORS.error + '15'}
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by meter number, DisCo, ID..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {(filterStatus !== "all" || searchTerm) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">Active filters:</span>
              {filterStatus !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Status: {filterStatus}
                  <button onClick={() => setFilterStatus("all")} className="hover:text-green-900">×</button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  Search: {searchTerm}
                  <button onClick={() => setSearchTerm("")} className="hover:text-gray-900">×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No bill schedule transactions found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Your scheduled bill transactions will appear here"}
              </p>
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Meter Number</div>
                <div className="col-span-2">DisCo</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Schedule</div>
              </div>

              {/* Rows */}
              {paginatedTransactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}

              {/* Footer */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <span>
                  Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
                </span>
                <span>
                  Total: {formatCurrency(filteredTotal)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      currentPage === pageNum
                        ? "bg-[#1e293b] text-white dark:bg-[#1e293b]"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}