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
  ChevronDown,
  Loader2,
  ChevronUp,
  CreditCard,
  Activity,
  List,
  Grid,
  RefreshCw,
  Wallet,
  Copy,
  TrendingUp,
  Hash,
  Globe,
  Calendar as CalendarIcon,
  Check,
  MessageSquare,
  Monitor,
  Smartphone,
  Send,
  Radio,
  Code,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  networkPlan: string | null;
  meterNumber: string | null;
  meterType: string | null;
  token: string | null;
  vendor: string | null;
  vendorReference: string | null;
  vendorCommission: number | null;
  scheduledFor: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  channel: string | null;
  channelDisplay: string | null;
  isBulkPurchase: boolean;
  bulkQuantity: number | null;
  user: {
    fullName: string;
    phone: string;
  };
  balanceBefore: number | null;
  balanceAfter: number | null;
  walletReference: string | null;
  walletDescription: string | null;
  hasWalletTransaction: boolean;
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
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  } catch {
    return dateString;
  }
};

const formatDateShort = (dateString: string) => {
  try {
    return format(new Date(dateString), "MMM d, h:mm a");
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

// ✅ SIMPLE: Just return channelDisplay as-is
const getDisplayChannel = (transaction: Transaction): string => {
  return transaction.channelDisplay || transaction.channel || "Unknown";
};

// Channel icon based on display text
const getChannelIcon = (channel: string) => {
  const lower = channel.toLowerCase();
  if (lower.includes('whatsapp')) return <MessageSquare className="h-3.5 w-3.5 text-green-500" />;
  if (lower.includes('mobile') || lower.includes('app')) return <Smartphone className="h-3.5 w-3.5 text-blue-500" />;
  if (lower.includes('web')) return <Monitor className="h-3.5 w-3.5 text-purple-500" />;
  if (lower.includes('ussd')) return <Radio className="h-3.5 w-3.5 text-orange-500" />;
  if (lower.includes('sms')) return <Send className="h-3.5 w-3.5 text-gray-500" />;
  if (lower.includes('telegram')) return <Send className="h-3.5 w-3.5 text-blue-400" />;
  if (lower.includes('messenger')) return <MessageSquare className="h-3.5 w-3.5 text-blue-600" />;
  if (lower.includes('api')) return <Code className="h-3.5 w-3.5 text-purple-600" />;
  return <Globe className="h-3.5 w-3.5 text-gray-400" />;
};

const getChannelColor = (channel: string) => {
  const lower = channel.toLowerCase();
  if (lower.includes('whatsapp')) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (lower.includes('mobile') || lower.includes('app')) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (lower.includes('web')) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  if (lower.includes('ussd')) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  if (lower.includes('sms')) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
  if (lower.includes('telegram')) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (lower.includes('messenger')) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (lower.includes('api')) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
};

// Stats Card Component
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

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success("Token copied to clipboard!");
  };

  const hasBalanceBefore = transaction.balanceBefore !== null && 
                          transaction.balanceBefore !== undefined && 
                          !isNaN(transaction.balanceBefore);
  const hasBalanceAfter = transaction.balanceAfter !== null && 
                         transaction.balanceAfter !== undefined && 
                         !isNaN(transaction.balanceAfter);

  // ✅ Just get the display channel
  const displayChannel = getDisplayChannel(transaction);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div
        className="grid grid-cols-13 gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
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

        {/* Product / Details */}
        <div className="col-span-3 flex flex-col">
          <span className="text-sm text-gray-900 dark:text-white truncate">
            {transaction.product}
          </span>
          {transaction.meterNumber && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {transaction.meterNumber}
            </span>
          )}
          {transaction.phoneNumber && !transaction.meterNumber && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {transaction.phoneNumber}
            </span>
          )}
          {transaction.networkPlan && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              {transaction.networkPlan}
            </span>
          )}
          {transaction.network && !transaction.networkPlan && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {transaction.network}
            </span>
          )}
        </div>

        {/* Amount */}
        <div className="col-span-2 flex flex-col">
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
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(transaction.status)}`}>
            {getStatusIcon(transaction.status)}
            {transaction.status}
          </span>
        </div>

        {/* ✅ Channel - Display as-is */}
        <div className="col-span-2 flex items-center">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getChannelColor(displayChannel)}`}>
            {getChannelIcon(displayChannel)}
            {displayChannel}
          </span>
          {transaction.isBulkPurchase && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              x{transaction.bulkQuantity || 2}
            </span>
          )}
        </div>

        {/* Date */}
        <div className="col-span-1 flex flex-col text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {formatDateShort(transaction.createdAt)}
          </span>
          {transaction.deliveredAt && (
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Delivered
            </span>
          )}
          {transaction.scheduledFor && !transaction.deliveredAt && (
            <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Scheduled
            </span>
          )}
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
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total Debited</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(transaction.totalDebited)}
              </span>
            </div>
            
            {/* ✅ Channel in expanded view */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                Channel
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getChannelColor(displayChannel)}`}>
                {getChannelIcon(displayChannel)}
                {displayChannel}
              </span>
            </div>
            
            {transaction.isBulkPurchase && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Bulk Purchase</span>
                <span className="text-gray-900 dark:text-white">
                  Yes ({transaction.bulkQuantity || 2} items)
                </span>
              </div>
            )}
            
            {transaction.meterNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Meter Number</span>
                <span className="font-mono text-xs text-gray-900 dark:text-white">
                  {transaction.meterNumber}
                </span>
              </div>
            )}
            
            {transaction.meterType && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Meter Type</span>
                <span className="text-gray-900 dark:text-white">{transaction.meterType}</span>
              </div>
            )}
            
            {transaction.phoneNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Phone Number</span>
                <span className="text-gray-900 dark:text-white">{transaction.phoneNumber}</span>
              </div>
            )}
            
            {transaction.networkPlan && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Plan</span>
                <span className="text-gray-900 dark:text-white">{transaction.networkPlan}</span>
              </div>
            )}
            
            {transaction.network && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Network</span>
                <span className="text-gray-900 dark:text-white">{transaction.network}</span>
              </div>
            )}
          </div>
          
          <div className="col-span-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(transaction.status)}`}>
                {getStatusIcon(transaction.status)}
                {transaction.status}
              </span>
            </div>
            
            {transaction.token && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500 dark:text-gray-400">Token</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {transaction.token}
                  </code>
                  <button
                    onClick={() => handleCopyToken(transaction.token!)}
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
            )}
            
            {transaction.vendor && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Vendor</span>
                <span className="text-gray-900 dark:text-white">{transaction.vendor}</span>
              </div>
            )}
            
            {transaction.vendorCommission !== null && transaction.vendorCommission > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Commission</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  +{formatCurrency(transaction.vendorCommission)}
                </span>
              </div>
            )}
            
            {transaction.scheduledFor && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Scheduled For</span>
                <span className="text-gray-900 dark:text-white">{formatDate(transaction.scheduledFor)}</span>
              </div>
            )}
            {transaction.deliveredAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Delivered At</span>
                <span className="text-gray-900 dark:text-white">{formatDate(transaction.deliveredAt)}</span>
              </div>
            )}
            
            {transaction.vendorReference && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Vendor Ref</span>
                <span className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[150px]">
                  {transaction.vendorReference}
                </span>
              </div>
            )}
            
            {transaction.walletReference && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Wallet Ref</span>
                <span className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[150px]">
                  {transaction.walletReference}
                </span>
              </div>
            )}
            
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
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Created</span>
              <span className="text-gray-900 dark:text-white">{formatDate(transaction.createdAt)}</span>
            </div>
            {transaction.updatedAt !== transaction.createdAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Updated</span>
                <span className="text-gray-900 dark:text-white">{formatDate(transaction.updatedAt)}</span>
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
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(totalTransactions / pageSize);

  // Get unique channel display values
  const channelOptions = Array.from(
    new Set(
      transactions
        .map((t) => t.channelDisplay || t.channel)
        .filter(Boolean)
    )
  );

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterType !== "all" && { type: filterType }),
        ...(filterStatus !== "all" && { status: filterStatus }),
        ...(filterChannel !== "all" && { channelDisplay: filterChannel }),
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
  }, [currentPage, pageSize, searchTerm, filterType, filterStatus, filterChannel]);

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
    } else if (type === "channel") {
      setFilterChannel(value);
    }
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchTransactions();
  };

  const transactionTypes = Array.from(new Set(transactions.map((t) => t.type)));
  const statuses = ["SUCCESS", "FAILED", "PENDING", "PROCESSING"];

  const brandColor = '#1e293b';

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
              disabled={loading}
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
            color={brandColor}
            iconBg={brandColor + '10'}
            subtitle={`₦${stats.totalAmount.toLocaleString()} total`}
          />
          <StatsCard
            title="Successful"
            value={stats.successCount}
            icon={CheckCircle}
            color={BRAND_COLORS.success}
            iconBg={BRAND_COLORS.success + '15'}
            subtitle={`${stats.total > 0 ? Math.round((stats.successCount / stats.total) * 100) : 0}% success rate`}
          />
          <StatsCard
            title="Pending"
            value={stats.pendingCount}
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

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Channel
                </label>
                <select
                  value={filterChannel}
                  onChange={(e) => handleFilterChange("channel", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Channels</option>
                  {channelOptions.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
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
              {searchTerm || filterType !== "all" || filterStatus !== "all" || filterChannel !== "all"
                ? "Try adjusting your filters" 
                : "Start making purchases to see your transactions here"}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {viewMode === "list" ? (
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  <div className="grid grid-cols-13 gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <div className="col-span-2">Type</div>
                    <div className="col-span-3">Product / Details</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Channel</div>
                    <div className="col-span-1">Date</div>
                    <div className="col-span-1"></div>
                  </div>

                  {transactions.map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {transactions.map((transaction) => {
                  const displayChannel = getDisplayChannel(transaction);
                  return (
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
                        
                        {/* ✅ Channel in grid view */}
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Channel</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getChannelColor(displayChannel)}`}>
                            {getChannelIcon(displayChannel)}
                            {displayChannel}
                          </span>
                        </div>
                        
                        {transaction.meterNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Meter</span>
                            <span className="font-mono text-xs text-gray-900 dark:text-white">
                              {transaction.meterNumber}
                            </span>
                          </div>
                        )}
                        
                        {transaction.phoneNumber && !transaction.meterNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Phone</span>
                            <span className="text-gray-900 dark:text-white">{transaction.phoneNumber}</span>
                          </div>
                        )}
                        
                        {transaction.networkPlan && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Plan</span>
                            <span className="text-gray-900 dark:text-white">{transaction.networkPlan}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDateShort(transaction.createdAt)}</span>
                          {transaction.deliveredAt && (
                            <span className="text-green-600">Delivered</span>
                          )}
                          {transaction.scheduledFor && !transaction.deliveredAt && (
                            <span className="text-yellow-600">Scheduled</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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