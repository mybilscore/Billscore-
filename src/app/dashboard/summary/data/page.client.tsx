// app/dashboard/summary/data/page.client.tsx

"use client";

import { useState } from "react";
import { Wifi, CheckCircle, Clock, XCircle, Activity, Search, Filter } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  totalDebited: number;
  status: string;
  product: string;
  phoneNumber: string | null;
  network: string | null;
  networkPlan: string | null;
  createdAt: string;
  deliveredAt: string | null;
  vendor: string | null;
  vendorReference: string | null;
}

interface DataSummaryClientProps {
  transactions: Transaction[];
  totalSpent: number;
  totalCount: number;
  networkBreakdown: {
    network: string | null;
    count: number;
    amount: number;
  }[];
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

export function DataSummaryClient({
  transactions,
  totalSpent,
  totalCount,
  networkBreakdown,
}: DataSummaryClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterNetwork, setFilterNetwork] = useState<string>("all");

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">
              Data Summary
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Overview of all your data purchases
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
                <Wifi className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No data purchases found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Start buying data to see your transactions here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Plan</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {t.phoneNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {t.networkPlan || t.product || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(t.status)}`}>
                          {getStatusIcon(t.status)}
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}