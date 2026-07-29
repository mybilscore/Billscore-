// app/dashboard/wallet/transactions/page.client.tsx

"use client";

import { useState, useMemo } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  CreditCard,
  Phone,
  Wifi,
  Zap,
  Tv,
  Send,
  Gift,
  Briefcase,
  Home,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  Download,
} from "lucide-react";
import Link from "next/link";

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  description: string;
  status: string;
  category: string | null;
  channel: string | null;
  metadata: any;
  createdAt: string;
  vtuTransaction: {
    id: string;
    transactionType: string;
    product: string;
    phoneNumber: string | null;
    status: string;
  } | null;
  walletFunding: {
    id: string;
    reference: string;
    provider: string;
    status: string;
  } | null;
}

interface WalletTransactionsClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  wallet: {
    id: string;
    balance: number;
  };
  transactions: WalletTransaction[];
  stats: {
    totalVolume: number;
    totalCount: number;
    creditTotal: number;
    debitTotal: number;
    typeStats: {
      type: string;
      count: number;
      amount: number;
    }[];
    categoryStats: {
      category: string;
      count: number;
      amount: number;
    }[];
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
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

const getTypeColor = (type: string) => {
  switch (type) {
    case "CREDIT":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
    case "DEBIT":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    case "REFUND":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "TRANSFER":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800";
    case "FEE":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    case "SYSTEM":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "FAILED":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "PROCESSING":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case "FAILED":
      return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    case "PENDING":
      return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    case "PROCESSING":
      return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "CREDIT":
      return <ArrowDownLeft className="h-4 w-4" />;
    case "DEBIT":
      return <ArrowUpRight className="h-4 w-4" />;
    case "REFUND":
      return <RefreshCw className="h-4 w-4" />;
    case "TRANSFER":
      return <Send className="h-4 w-4" />;
    case "FEE":
      return <Gift className="h-4 w-4" />;
    case "SYSTEM":
      return <Briefcase className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "FUNDING":
      return <ArrowDownLeft className="h-4 w-4" />;
    case "AIRTIME":
      return <Phone className="h-4 w-4" />;
    case "DATA":
      return <Wifi className="h-4 w-4" />;
    case "ELECTRICITY":
      return <Zap className="h-4 w-4" />;
    case "CABLE_TV":
      return <Tv className="h-4 w-4" />;
    case "TRANSFER":
      return <Send className="h-4 w-4" />;
    case "LOAN_DISBURSEMENT":
      return <Gift className="h-4 w-4" />;
    case "LOAN_REPAYMENT":
      return <RefreshCw className="h-4 w-4" />;
    case "SYSTEM":
      return <Briefcase className="h-4 w-4" />;
    case "ADMIN_ADJUSTMENT":
      return <Briefcase className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "CREDIT": return "Credit";
    case "DEBIT": return "Debit";
    case "REFUND": return "Refund";
    case "TRANSFER": return "Transfer";
    case "FEE": return "Fee";
    case "SYSTEM": return "System";
    default: return type;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "FUNDING": return "Wallet Funding";
    case "AIRTIME": return "Airtime Purchase";
    case "DATA": return "Data Purchase";
    case "ELECTRICITY": return "Electricity Purchase";
    case "CABLE_TV": return "Cable TV Subscription";
    case "TRANSFER": return "Wallet Transfer";
    case "LOAN_DISBURSEMENT": return "Loan Disbursement";
    case "LOAN_REPAYMENT": return "Loan Repayment";
    case "SYSTEM": return "System Adjustment";
    case "ADMIN_ADJUSTMENT": return "Admin Adjustment";
    default: return category || "Other";
  }
};

// Stats Card Component
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
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

// Transaction Row Component
const TransactionRow = ({ transaction }: { transaction: WalletTransaction }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div
        className="grid grid-cols-12 gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Type */}
        <div className="col-span-2 flex items-center gap-2">
          <div className={`rounded-full p-1.5 ${getTypeColor(transaction.type)}`}>
            {getTypeIcon(transaction.type)}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {getTypeLabel(transaction.type)}
          </span>
        </div>

        {/* Description */}
        <div className="col-span-3 flex items-center text-sm text-gray-600 dark:text-gray-400">
          <span className="truncate">{transaction.description}</span>
        </div>

        {/* Category */}
        <div className="col-span-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
          <span className="truncate">{getCategoryLabel(transaction.category || "")}</span>
        </div>

        {/* Amount */}
        <div className={`col-span-2 flex items-center text-sm font-medium justify-end ${
          transaction.type === "CREDIT" 
            ? "text-green-600 dark:text-green-400" 
            : "text-red-600 dark:text-red-400"
        }`}>
          {transaction.type === "CREDIT" ? "+" : "-"}{formatCurrency(transaction.amount)}
        </div>

        {/* Balance */}
        <div className="col-span-1 flex items-center text-sm text-gray-900 dark:text-white justify-end">
          {formatCurrency(transaction.balanceAfter)}
        </div>

        {/* Status */}
        <div className="col-span-1 flex items-center">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(transaction.status)}`}>
            {getStatusIcon(transaction.status)}
            {transaction.status}
          </span>
        </div>

        {/* Date */}
        <div className="col-span-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          {formatDateShort(transaction.createdAt)}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="grid grid-cols-12 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
          <div className="col-span-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Reference</span>
              <span className="font-mono text-xs text-gray-900 dark:text-white">
                {transaction.reference}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Type</span>
              <span className="text-gray-900 dark:text-white">{getTypeLabel(transaction.type)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Category</span>
              <span className="text-gray-900 dark:text-white">{getCategoryLabel(transaction.category || "")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Channel</span>
              <span className="text-gray-900 dark:text-white">{transaction.channel || "—"}</span>
            </div>
          </div>
          <div className="col-span-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Amount</span>
              <span className={`font-medium ${
                transaction.type === "CREDIT" 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              }`}>
                {transaction.type === "CREDIT" ? "+" : "-"}{formatCurrency(transaction.amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Balance Before</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(transaction.balanceBefore)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Balance After</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(transaction.balanceAfter)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Created</span>
              <span className="text-gray-900 dark:text-white">{formatDate(transaction.createdAt)}</span>
            </div>
          </div>
          {transaction.vtuTransaction && (
            <div className="col-span-12 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                VTU Transaction: {transaction.vtuTransaction.product}
                {transaction.vtuTransaction.phoneNumber && ` • ${transaction.vtuTransaction.phoneNumber}`}
              </p>
            </div>
          )}
          {transaction.walletFunding && (
            <div className="col-span-12 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Funding: {transaction.walletFunding.provider} • Ref: {transaction.walletFunding.reference}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function WalletTransactionsClient({
  user,
  wallet,
  transactions,
  stats,
}: WalletTransactionsClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search filter
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.vtuTransaction?.product?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (t.vtuTransaction?.phoneNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType = filterType === "all" || t.type === filterType;

      // Status filter
      const matchesStatus = filterStatus === "all" || t.status === filterStatus;

      // Category filter
      const matchesCategory = filterCategory === "all" || t.category === filterCategory;

      // Date range filter
      let matchesDate = true;
      if (dateRange !== "all") {
        const now = new Date();
        const date = new Date(t.createdAt);
        switch (dateRange) {
          case "today":
            matchesDate = date.toDateString() === now.toDateString();
            break;
          case "week":
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            matchesDate = date >= weekAgo;
            break;
          case "month":
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            matchesDate = date >= monthAgo;
            break;
          case "year":
            const yearAgo = new Date(now);
            yearAgo.setFullYear(now.getFullYear() - 1);
            matchesDate = date >= yearAgo;
            break;
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesDate;
    });
  }, [transactions, searchTerm, filterType, filterStatus, filterCategory, dateRange]);

  const types = ["CREDIT", "DEBIT", "REFUND", "TRANSFER", "FEE", "SYSTEM"];
  const statuses = ["SUCCESS", "FAILED", "PENDING", "PROCESSING"];
  const categories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean)));
  const dateRanges = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This Year" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">
              Wallet Transactions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All your wallet activity in one place
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
              <p className="text-lg font-bold text-[#1e293b] dark:text-white">
                {formatCurrency(wallet.balance)}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Volume"
            value={formatCurrency(stats.totalVolume)}
            icon={Wallet}
            color="bg-blue-500"
            subtitle={`${stats.totalCount} transactions`}
          />
          <StatsCard
            title="Total Credits"
            value={formatCurrency(stats.creditTotal)}
            icon={ArrowDownLeft}
            color="bg-green-500"
          />
          <StatsCard
            title="Total Debits"
            value={formatCurrency(stats.debitTotal)}
            icon={ArrowUpRight}
            color="bg-red-500"
          />
          <StatsCard
            title="Net Balance"
            value={formatCurrency(stats.creditTotal - stats.debitTotal)}
            icon={TrendingUp}
            color={stats.creditTotal > stats.debitTotal ? "bg-emerald-500" : "bg-rose-500"}
          />
        </div>

        {/* Category Breakdown */}
        {stats.categoryStats.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Category Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.categoryStats.map((cs) => (
                <div
                  key={cs.category || "unknown"}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-1.5">
                      {getCategoryIcon(cs.category || "")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {getCategoryLabel(cs.category || "")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cs.count} transactions
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(cs.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by description, reference, product..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Types</option>
              {types.map((t) => (
                <option key={t} value={t}>{getTypeLabel(t)}</option>
              ))}
            </select>

            {/* Status Filter */}
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

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{getCategoryLabel(c || "")}</option>
              ))}
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {dateRanges.map((dr) => (
                <option key={dr.value} value={dr.value}>{dr.label}</option>
              ))}
            </select>
          </div>

          {/* Active Filters Display */}
          {(filterType !== "all" || filterStatus !== "all" || filterCategory !== "all" || dateRange !== "all" || searchTerm) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">Active filters:</span>
              {filterType !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Type: {getTypeLabel(filterType)}
                  <button onClick={() => setFilterType("all")} className="hover:text-blue-900">×</button>
                </span>
              )}
              {filterStatus !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Status: {filterStatus}
                  <button onClick={() => setFilterStatus("all")} className="hover:text-green-900">×</button>
                </span>
              )}
              {filterCategory !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  Category: {getCategoryLabel(filterCategory)}
                  <button onClick={() => setFilterCategory("all")} className="hover:text-purple-900">×</button>
                </span>
              )}
              {dateRange !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  Date: {dateRanges.find(dr => dr.value === dateRange)?.label}
                  <button onClick={() => setDateRange("all")} className="hover:text-yellow-900">×</button>
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
                  setFilterType("all");
                  setFilterStatus("all");
                  setFilterCategory("all");
                  setDateRange("all");
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
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No transactions found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || filterType !== "all" || filterStatus !== "all" || filterCategory !== "all" || dateRange !== "all"
                  ? "Try adjusting your filters"
                  : "Your wallet transactions will appear here"}
              </p>
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1 text-right">Balance</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Date</div>
              </div>

              {/* Rows */}
              {filteredTransactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}

              {/* Footer */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <span>
                  Showing {filteredTransactions.length} of {transactions.length} transactions
                </span>
                <span>
                  Total: {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}