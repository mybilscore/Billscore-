// src/app/[slug]/settings/components/billing-tab.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  CreditCard,
  Wallet,
  Landmark,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
} from "lucide-react";
import QRCode from "react-qr-code";

interface BillingTabProps {
  data: any;
  slug: string;
  permissions: any;
  onSave: (data: any) => void;
}

export function BillingTab({ data, slug, permissions, onSave }: BillingTabProps) {
  const [showAddBank, setShowAddBank] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      accountType: "SAVINGS",
      currency: "NGN",
    },
  });

  const handleAddBank = async (formData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/${slug}/settings/billing/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to add bank account");

      const result = await response.json();
      toast.success("Bank account added successfully");
      setShowAddBank(false);
      onSave({ bankAccounts: result.bankAccounts });
    } catch (error) {
      toast.error("Failed to add bank account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBank = async (accountId: number) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return;

    try {
      const response = await fetch(`/api/${slug}/settings/billing/bank/${accountId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete bank account");

      toast.success("Bank account deleted");
      onSave({});
    } catch (error) {
      toast.error("Failed to delete bank account");
    }
  };

  const handleWithdraw = async (amount: number) => {
    try {
      const response = await fetch(`/api/${slug}/settings/billing/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) throw new Error("Withdrawal failed");

      toast.success("Withdrawal initiated successfully");
      setShowWithdrawModal(false);
      onSave({});
    } catch (error) {
      toast.error("Withdrawal failed");
    }
  };

  const formatCurrency = (amount: bigint | number, currency: string = "NGN") => {
    const value = typeof amount === 'bigint' ? Number(amount) / 100 : amount;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Billing & Wallet
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your wallet, bank accounts, and transactions
        </p>
      </div>

      {/* Wallet Overview */}
      {data.wallet && (
        <div className="bg-gradient-to-br from-[#2e7d32] to-[#1b5e20] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              <span className="text-sm font-medium opacity-90">Wallet Balance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded-full text-xs ${
                data.wallet.isActive ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {data.wallet.isActive ? 'Active' : 'Inactive'}
              </div>
              {data.wallet.isLocked && (
                <div className="px-2 py-1 rounded-full text-xs bg-yellow-500/20">
                  Locked
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-3xl font-bold mb-1">
              {formatCurrency(data.wallet.availableBalance, data.wallet.currency)}
            </p>
            <p className="text-sm opacity-90">
              Available Balance
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs opacity-75">Account Number</p>
              <p className="text-sm font-mono font-bold">{data.wallet.accountNumber}</p>
            </div>
            <div>
              <p className="text-xs opacity-75">Account Name</p>
              <p className="text-sm font-bold truncate">{data.wallet.accountName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-xs opacity-75">Ledger Balance</p>
                <p className="text-sm font-medium">{formatCurrency(data.wallet.ledgerBalance)}</p>
              </div>
              <div className="w-px h-8 bg-white/20 mx-2" />
              <div>
                <p className="text-xs opacity-75">KYC Level</p>
                <p className="text-sm font-medium">Level {data.wallet.kycLevel}</p>
              </div>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="px-4 py-2 bg-white text-[#2e7d32] rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
            >
              Withdraw Funds
            </button>
          </div>

          {/* QR Code for wallet */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg">
                <QRCode
                  value={`wallet:${data.wallet.accountNumber}`}
                  size={60}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Wallet QR Code</p>
                <p className="text-xs opacity-75 mt-1">
                  Scan to receive payments
                </p>
                <button className="text-xs underline mt-2 hover:no-underline">
                  Download QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Accounts */}
      <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center dark:bg-blue-900/20">
              <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Bank Accounts</h3>
              <p className="text-sm text-gray-500">Manage your linked bank accounts</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddBank(!showAddBank)}
            className="flex items-center gap-1 text-sm text-[#2e7d32] hover:text-[#1b5e20]"
          >
            <Plus className="h-4 w-4" />
            Add Bank Account
          </button>
        </div>

        {showAddBank && (
          <form onSubmit={handleSubmit(handleAddBank)} className="mb-4 p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
            <h4 className="text-sm font-medium mb-3">Add New Bank Account</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Bank Name</label>
                <input
                  {...register("bankName", { required: "Bank name is required" })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Account Name</label>
                <input
                  {...register("accountName", { required: "Account name is required" })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Account Number</label>
                <input
                  {...register("accountNumber", { 
                    required: "Account number is required",
                    pattern: {
                      value: /^\d{10}$/,
                      message: "Account number must be 10 digits"
                    }
                  })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Account Type</label>
                <select
                  {...register("accountType")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20"
                >
                  <option value="SAVINGS">Savings</option>
                  <option value="CURRENT">Current</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowAddBank(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-[#2e7d32] text-white rounded-lg hover:bg-[#1b5e20] disabled:opacity-50"
              >
                {isLoading ? "Adding..." : "Add Account"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {data.bankAccounts.map((account: any) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center dark:bg-gray-700">
                  <Landmark className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {account.bankName}
                    </p>
                    {account.isPrimary && (
                      <span className="text-xs px-2 py-0.5 bg-[#2e7d32]/10 text-[#2e7d32] rounded-full">
                        Primary
                      </span>
                    )}
                    {account.isVerified && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {account.accountName} • {account.accountNumber} • {account.currency}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteBank(account.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center dark:bg-purple-900/20">
              <ArrowUpRight className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Recent Transactions</h3>
              <p className="text-sm text-gray-500">Your latest wallet activity</p>
            </div>
          </div>
          <button className="flex items-center gap-1 text-sm text-[#2e7d32] hover:text-[#1b5e20]">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="space-y-3">
          {data.wallet?.recentTransactions?.map((tx: any) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  tx.transaction_type === 'CREDIT' 
                    ? 'bg-green-100 text-green-600'
                    : tx.transaction_type === 'DEBIT'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tx.transaction_type === 'CREDIT' && <ArrowDownLeft className="h-4 w-4" />}
                  {tx.transaction_type === 'DEBIT' && <ArrowUpRight className="h-4 w-4" />}
                  {tx.transaction_type === 'TRANSFER' && <RefreshCw className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tx.description || tx.narration}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tx.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                      tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDate(tx.created_at)} • {tx.reference_type || 'Transaction'}
                  </p>
                </div>
              </div>
              <p className={`text-sm font-medium ${
                tx.transaction_type === 'CREDIT' 
                  ? 'text-green-600'
                  : tx.transaction_type === 'DEBIT'
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}>
                {tx.transaction_type === 'CREDIT' ? '+' : '-'}
                {formatCurrency(tx.amount, data.wallet.currency)}
              </p>
            </div>
          ))}

          {(!data.wallet?.recentTransactions || data.wallet.recentTransactions.length === 0) && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No transactions yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full dark:bg-gray-900">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Withdraw Funds</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Balance
              </label>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.wallet.availableBalance)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Withdraw
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20"
                placeholder="Enter amount"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Account
              </label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20">
                {data.bankAccounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} - {account.accountNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 text-sm bg-[#2e7d32] text-white rounded-lg hover:bg-[#1b5e20]">
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}