// app/dashboard/transactions/page.client.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  Wifi,
  Zap,
  Tv,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  Download,
  Eye,
  ChevronDown,
  Loader2,
  ChevronUp,
  CreditCard,
  User,
  Smartphone,
  Activity,
  BarChart3,
  List,
  Grid,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

// Types
interface Transaction {
  id: string;
  type: string;
  product: string;
  amount: number;
  totalDebited: number;
  status: string;
  phoneNumber: string | null;
  network: string | null;
  vendorReference: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  user: {
    fullName: string;
    phone: string;
  };
}

interface TransactionStats {
  total: number;
  totalAmount: number;
  totalTransactions: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  processingCount: number;
}

interface TypeBreakdown {
  type: string;
  count: number;
}

interface TransactionsClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
  };
  initialTransactions: Transaction[];
  totalTransactions: number;
  stats: TransactionStats;
  typeBreakdown: TypeBreakdown[];
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
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
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
      return <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "AIRTIME":
      return <Phone className="h-4 w-4" />;
    case "DATA":
      return <Wifi className="h-4 w-4" />;
    case "ELECTRICITY_INSTANT":
    case "ELECTRICITY_PREORDER":
      return <Zap className="h-4 w-4" />;
    case "CABLE_TV":
      return <Tv className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: string) => {
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
const TransactionRow = ({ transaction }: { transaction: Transaction }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div
        className="grid grid-cols-12 gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Type */}
        <div className="col-span-2 flex items-center gap-2">
          <div className="rounded-full bg-gray-100 p-1.5 dark:bg-gray-800">
            {getTypeIcon(transaction.type)}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {getTypeLabel(transaction.type)}
          </span>
        </div>

        {/* Product */}
        <div className="col-span-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
          <span className="truncate">{transaction.product}</span>
        </div>

        {/* Amount */}
        <div className="col-span-2 flex items-center text-sm font-medium text-gray-900 dark:text-white">
          {formatCurrency(transaction.amount)}
        </div>

        {/* Phone/Network */}
        <div className="col-span-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
          {transaction.phoneNumber || transaction.network || "—"}
        </div>

        {/* Status */}
        <div className="col-span-2 flex items-center">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(transaction.status)}`}>
            {getStatusIcon(transaction.status)}
            {transaction.status}
          </span>
        </div>

        {/* Date */}
        <div className="col-span-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          {formatDate(transaction.createdAt)}
        </div>

        {/* Expand */}
        <div className="col-span-1 flex items-center justify-end">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="grid grid-cols-12 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
          <div className="col-span-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Transaction ID</span>
              <span className="font-mono text-xs text-gray-900 dark:text-white">
                {transaction.id}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Type</span>
              <span className="text-gray-900 dark:text-white">{getTypeLabel(transaction.type)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Product</span>
              <span className="text-gray-900 dark:text-white">{transaction.product}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Amount</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>
          <div className="col-span-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total Debited</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(transaction.totalDebited)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(transaction.status)}`}>
                {getStatusIcon(transaction.status)}
                {transaction.status}
              </span>
            </div>
            {transaction.vendorReference && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Vendor Ref</span>
                <span className="font-mono text-xs text-gray-900 dark:text-white">
                  {transaction.vendorReference}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Created</span>
              <span className="text-gray-900 dark:text-white">{formatDate(transaction.createdAt)}</span>
            </div>
            {transaction.deliveredAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Delivered</span>
                <span className="text-gray-900 dark:text-white">{formatDate(transaction.deliveredAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
export function TransactionsClient({
  user,
  initialTransactions,
  totalTransactions,
  stats,
  typeBreakdown,
}: TransactionsClientProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(totalTransactions / pageSize);

  // Fetch transactions with filters
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterType !== "all" && { type: filterType }),
        ...(filterStatus !== "all" && { status: filterStatus }),
      });

      const response = await fetch(`/api/transactions?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setTransactions(result.data.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filterType, filterStatus]);

  // Refetch when filters change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (type: string, value: string) => {
    if (type === "type") {
      setFilterType(value);
    } else if (type === "status") {
      setFilterStatus(value);
    }
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchTransactions();
  };

  // Get unique transaction types for filter
  const transactionTypes = Array.from(new Set(transactions.map((t) => t.type)));

  // Get unique statuses for filter
  const statuses = ["SUCCESS", "FAILED", "PENDING", "PROCESSING"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">
              Transactions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View all your VTU transactions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-all"
            >
              {viewMode === "list" ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Transactions"
            value={stats.total}
            icon={Activity}
            color="bg-blue-500"
            subtitle={`₦${stats.totalAmount.toLocaleString()} total`}
          />
          <StatsCard
            title="Successful"
            value={stats.successCount}
            icon={CheckCircle}
            color="bg-green-500"
            subtitle={`${stats.total > 0 ? Math.round((stats.successCount / stats.total) * 100) : 0}% success rate`}
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
        {typeBreakdown.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {typeBreakdown.map((item) => (
              <span
                key={item.type}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {getTypeIcon(item.type)}
                {getTypeLabel(item.type)}: {item.count}
              </span>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by phone, product, ID..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Types</option>
                  {transactionTypes.map((type) => (
                    <option key={type} value={type}>
                      {getTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e293b]" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No transactions found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || filterType !== "all" || filterStatus !== "all" 
                ? "Try adjusting your filters" 
                : "Start making purchases to see your transactions here"}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {viewMode === "list" ? (
              // List View
              <div>
                {/* Header */}
                <div className="grid grid-cols-12 gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Product</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-2">Phone/Network</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Date</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Rows */}
                {transactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </div>
            ) : (
              // Grid View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
                          {getTypeIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {getTypeLabel(transaction.type)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {transaction.product}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {getStatusIcon(transaction.status)}
                        {transaction.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Amount</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(transaction.amount)}
                        </span>
                      </div>
                      {transaction.phoneNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Phone</span>
                          <span className="text-gray-900 dark:text-white">{transaction.phoneNumber}</span>
                        </div>
                      )}
                      {transaction.network && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Network</span>
                          <span className="text-gray-900 dark:text-white">{transaction.network}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatDate(transaction.createdAt)}</span>
                        {transaction.deliveredAt && (
                          <span>✓ Delivered</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalTransactions)} of {totalTransactions} transactions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
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
                    onClick={() => handlePageChange(pageNum)}
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
                onClick={() => handlePageChange(currentPage + 1)}
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