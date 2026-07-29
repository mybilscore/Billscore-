// app/dashboard/summary/page.client.tsx

"use client";

import { useState } from "react";
import {
  Phone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  Shield,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  Calendar,
  Search,
  Filter,
} from "lucide-react";

interface Transaction {
  id: string;
  transactionType: string;
  amount: number;
  totalDebited: number;
  status: string;
  product: string;
  phoneNumber: string | null;
  network: string | null;
  createdAt: string;
  deliveredAt: string | null;
  vendor: string | null;
  vendorReference: string | null;
}

interface TypeStat {
  type: string;
  count: number;
  label: string;
  icon: string;
}

interface SummaryClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
  };
  stats: {
    total: number;
    totalAmount: number;
    successRate: number;
    successCount: number;
    pendingCount: number;
    failedCount: number;
  };
  recentTransactions: Transaction[];
  typeStats: TypeStat[];
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
      return <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
};

// ✅ FIXED: Icon mapping with proper components
const ICON_MAP: Record<string, any> = {
  Phone: Phone,
  Wifi: Wifi,
  Zap: Zap,
  Tv: Tv,
  GraduationCap: GraduationCap,
  Shield: Shield,
  CreditCard: CreditCard,
};

// ✅ FIXED: Get icon component
const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || CreditCard;
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

export function SummaryClient({
  user,
  stats,
  recentTransactions,
  typeStats,
}: SummaryClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredTransactions = recentTransactions.filter((t) => {
    const matchesSearch = t.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phoneNumber?.includes(searchTerm) ||
      t.id.includes(searchTerm);
    const matchesType = filterType === "all" || t.transactionType === filterType;
    return matchesSearch && matchesType;
  });

  // Get unique types for filter
  const types = Array.from(new Set(recentTransactions.map(t => t.transactionType)));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">
              Summary
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Overview of your VTU transactions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Balance: {formatCurrency(user.walletBalance)}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Transactions"
            value={stats.total}
            icon={Activity}
            color="bg-blue-500"
            subtitle={`${formatCurrency(stats.totalAmount)} volume`}
          />
          <StatsCard
            title="Successful"
            value={stats.successCount}
            icon={CheckCircle}
            color="bg-green-500"
            subtitle={`${stats.successRate}% success rate`}
          />
          <StatsCard
            title="Pending"
            value={stats.pendingCount}
            icon={Clock}
            color="bg-yellow-500"
          />
          <StatsCard
            title="Failed"
            value={stats.failedCount}
            icon={XCircle}
            color="bg-red-500"
          />
        </div>

        {/* Type Breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Transaction Types
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {typeStats.map((type) => {
              const Icon = getIconComponent(type.icon);
              return (
                <div
                  key={type.type}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3"
                >
                  <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-2">
                    <Icon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {type.count} transactions
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recent Transactions
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full sm:w-48 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-4 py-1.5 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                {/* Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Types</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {getTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <CreditCard className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No transactions found
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredTransactions.map((transaction) => {
                const typeInfo = typeStats.find(t => t.type === transaction.transactionType);
                const Icon = getIconComponent(typeInfo?.icon || "CreditCard");
                
                return (
                  <div
                    key={transaction.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-2">
                          <Icon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.product}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{transaction.phoneNumber || transaction.network || "—"}</span>
                            <span className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                            <span>{formatDate(transaction.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(transaction.amount)}
                          </p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(transaction.status)}`}>
                            {getStatusIcon(transaction.status)}
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    AIRTIME: "Airtime",
    DATA: "Data",
    ELECTRICITY_INSTANT: "Electricity",
    ELECTRICITY_PREORDER: "Electricity (Pre-order)",
    CABLE_TV: "Cable TV",
    EDUCATION: "Education",
    INSURANCE: "Insurance",
  };
  return labels[type] || type;
}