// app/dashboard/summary/airtime/page.client.tsx - UPDATED with BILSCORE vendor

"use client";

import { useState } from "react";
import {
  Phone,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Hash,
  Globe,
  Wallet,
  Copy,
  Check,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
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
  vendorCommission: number | null;
  vendorTotalAmount: number | null;
  commissionRate: number | null;
  commissionType: string | null;
  channel: string | null;
  metadata: any;
  balanceBefore: number | null;
  balanceAfter: number | null;
  walletReference: string | null;
  walletDescription: string | null;
}

interface AirtimeSummaryClientProps {
  transactions: Transaction[];
  totalSpent: number;
  totalCount: number;
  networkBreakdown: {
    network: string | null;
    count: number;
    amount: number;
  }[];
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
    case "PROCESSING": return <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default: return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
};

const getNetworkColor = (network: string | null) => {
  if (!network) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const n = network.toUpperCase();
  if (n.includes("MTN")) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  if (n.includes("GLO")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (n.includes("AIRTEL")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (n.includes("9MOBILE") || n.includes("NINE")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
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
        {/* Phone Number */}
        <div className="col-span-3 flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {transaction.phoneNumber || "—"}
          </span>
        </div>

        {/* Network */}
        <div className="col-span-2 flex items-center">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getNetworkColor(transaction.network)}`}>
            {transaction.network || "Unknown"}
          </span>
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

        {/* Date */}
        <div className="col-span-2 flex flex-col text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {formatDateShort(transaction.createdAt)}
          </span>
          {transaction.deliveredAt && (
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Delivered
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
              <span className="text-gray-500 dark:text-gray-400">Phone Number</span>
              <span className="text-gray-900 dark:text-white">{transaction.phoneNumber || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Network</span>
              <span className="text-gray-900 dark:text-white">{transaction.network || "—"}</span>
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
          </div>
          
          <div className="col-span-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(transaction.status)}`}>
                {getStatusIcon(transaction.status)}
                {transaction.status}
              </span>
            </div>
            
            {/* ✅ Vendor - Hardcoded to BILSCORE for end users */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Vendor</span>
              <span className="text-gray-900 dark:text-white font-medium">BILSCORE</span>
            </div>
            
            {/* ✅ Vendor Reference - Show if available */}
            {transaction.vendorReference && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Reference</span>
                <span className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[150px]">
                  {transaction.vendorReference}
                </span>
              </div>
            )}
            
            {/* ✅ Commission - Show only if applicable */}
            {transaction.vendorCommission !== null && transaction.vendorCommission > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Commission</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  +{formatCurrency(transaction.vendorCommission)}
                </span>
              </div>
            )}
            
            {/* ✅ Commission Rate - Show only if applicable */}
            {transaction.commissionRate !== null && transaction.commissionRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Commission Rate</span>
                <span className="text-gray-900 dark:text-white">{transaction.commissionRate}%</span>
              </div>
            )}
            
            {/* ✅ Channel - Show if available */}
            {transaction.channel && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Channel</span>
                <span className="text-gray-900 dark:text-white">{transaction.channel}</span>
              </div>
            )}
            
            {/* ✅ Balance Before/After - Show if available */}
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
            
            {/* ✅ Delivery */}
            {transaction.deliveredAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Delivered</span>
                <span className="text-gray-900 dark:text-white">{formatDate(transaction.deliveredAt)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Created</span>
              <span className="text-gray-900 dark:text-white">{formatDate(transaction.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function AirtimeSummaryClient({
  transactions,
  totalSpent,
  totalCount,
  networkBreakdown,
}: AirtimeSummaryClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterNetwork, setFilterNetwork] = useState<string>("all");

  const brandColor = BRAND_COLORS.primary;

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.phoneNumber?.includes(searchTerm) ||
      t.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.includes(searchTerm);
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    const matchesNetwork = filterNetwork === "all" || t.network === filterNetwork;
    return matchesSearch && matchesStatus && matchesNetwork;
  });

  const networks = Array.from(new Set(transactions.map(t => t.network).filter(Boolean)));
  const statuses = ["SUCCESS", "FAILED", "PENDING", "PROCESSING"];

  const filteredTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const filteredCount = filteredTransactions.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">
              Airtime Summary
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Overview of all your airtime purchases
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
              <p className="text-lg font-bold text-[#1e293b] dark:text-white">
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Purchases</p>
              <p className="text-lg font-bold text-[#1e293b] dark:text-white">
                {totalCount}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards with Brand Colors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Spent"
            value={formatCurrency(totalSpent)}
            icon={Phone}
            color={brandColor}
            iconBg={brandColor + '10'}
            subtitle={`${totalCount} purchases`}
          />
          <StatsCard
            title="Average per Purchase"
            value={formatCurrency(totalCount > 0 ? totalSpent / totalCount : 0)}
            icon={Activity}
            color={BRAND_COLORS.info}
            iconBg={BRAND_COLORS.info + '15'}
          />
          <StatsCard
            title="Successful"
            value={transactions.filter(t => t.status === "SUCCESS").length}
            icon={CheckCircle}
            color={BRAND_COLORS.success}
            iconBg={BRAND_COLORS.success + '15'}
          />
          <StatsCard
            title="Failed"
            value={transactions.filter(t => t.status === "FAILED").length}
            icon={XCircle}
            color={BRAND_COLORS.error}
            iconBg={BRAND_COLORS.error + '15'}
          />
        </div>

        {/* Network Breakdown */}
        {networkBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Network Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {networkBreakdown.map((nb) => (
                <div
                  key={nb.network || "unknown"}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {nb.network || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {nb.count} purchases
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(nb.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by phone number..."
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
              <select
                value={filterNetwork}
                onChange={(e) => setFilterNetwork(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Networks</option>
                {networks.map((n) => (
                  <option key={n || "unknown"} value={n || ""}>{n || "Unknown"}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Phone className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No airtime purchases found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || filterStatus !== "all" || filterNetwork !== "all"
                  ? "Try adjusting your filters"
                  : "Start buying airtime to see your transactions here"}
              </p>
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <div className="col-span-3">Phone Number</div>
                <div className="col-span-2">Network</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1"></div>
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
                  Total: {formatCurrency(filteredTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}