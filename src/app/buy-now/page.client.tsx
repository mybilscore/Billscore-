// app/buy-now/page.client.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Zap,
  Tv,
  Lightbulb,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShoppingBag,
  Clock,
  Shield,
  QrCode,
  Copy,
  Check,
} from "lucide-react";

// Types
interface MeterData {
  id: string;
  meterNumber: string;
  disco: string;
  name: string | null;
  meterType: string;
  isDefault: boolean;
}

interface DecoderData {
  id: string;
  decoderNumber: string;
  provider: string;
  name: string | null;
  package: string | null;
  isDefault: boolean;
}

interface UserData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  hasWallet: boolean;
  walletBalance: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

// Amount Button
const AmountButton = ({
  amount,
  isSelected,
  onClick,
}: {
  amount: { label: string; value: number };
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 p-2 text-center transition-all duration-200 ${
        isSelected
          ? "border-blue-500 bg-blue-500 text-white shadow-md"
          : "border-gray-200 bg-white hover:border-[#1e293b]/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
        {amount.label}
      </span>
    </button>
  );
};

export default function BuyNowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const identifier = searchParams.get("identifier");
  const type = searchParams.get("type");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [itemData, setItemData] = useState<MeterData | DecoderData | null>(null);
  const [recommendedAmounts, setRecommendedAmounts] = useState<{ label: string; value: number }[]>([]);
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [transactionData, setTransactionData] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchBalance = async () => {
    try {
      const response = await fetch("/api/user/balance");
      const data = await response.json();
      if (data.success && user) {
        setUser({
          ...user,
          hasWallet: data.hasWallet,
          walletBalance: data.balance,
        });
      }
      return data;
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!identifier || !type) {
        setError("Invalid QR code. Missing identifier or type.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const authRes = await fetch("/api/auth/session");
        const session = await authRes.json();
        setIsLoggedIn(!!session?.user);
        
        if (session?.user) {
          const balanceRes = await fetch("/api/user/balance");
          const balanceData = await balanceRes.json();
          
          setUser({
            id: session.user.id,
            fullName: session.user.name || session.user.fullName || "",
            email: session.user.email || "",
            phone: session.user.phone || "",
            hasWallet: balanceData.hasWallet || false,
            walletBalance: balanceData.balance || 0,
          });
        }

        let itemRes;
        if (type === "electricity") {
          itemRes = await fetch(`/api/saved-meters/lookup?meterNumber=${encodeURIComponent(identifier)}`);
        } else if (type === "cable") {
          itemRes = await fetch(`/api/saved-decoders/lookup?decoderNumber=${encodeURIComponent(identifier)}`);
        } else {
          throw new Error("Invalid service type");
        }

        if (!itemRes.ok) {
          throw new Error("Item not found. Please check the QR code.");
        }

        const itemResult = await itemRes.json();
        setItemData(itemResult.data);

        const amountsRes = await fetch("/api/recommended-amounts");
        const amountsResult = await amountsRes.json();
        setRecommendedAmounts(amountsResult.data || [
          { label: "₦500", value: 500 },
          { label: "₦1,000", value: 1000 },
          { label: "₦2,000", value: 2000 },
          { label: "₦5,000", value: 5000 },
          { label: "₦10,000", value: 10000 },
        ]);

      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
        setIsCheckingAuth(false);
      }
    };

    fetchData();
  }, [identifier, type]);

  const handleAmountSelect = (value: number) => {
    setSelectedAmount(value);
    setCustomAmount("");
    setPinError("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setCustomAmount(value);
    if (value) setSelectedAmount(null);
    setPinError("");
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setPin(value);
      setPinError("");
    }
  };

  const getTotalAmount = () => selectedAmount || parseInt(customAmount) || 0;

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success("Token copied to clipboard!");
  };

// In BuyNowPage component, update handleSubmit:

const handleSubmit = async () => {
  const amount = getTotalAmount();
  
  if (!amount || amount < 100) {
    setError("Please enter a valid amount (minimum ₦100)");
    return;
  }

  if (!isLoggedIn) {
    router.push(`/auth/sign-in?callbackUrl=/buy-now?identifier=${identifier}&type=${type}`);
    return;
  }

  if (!user?.hasWallet) {
    setError("You need a wallet to make payments.");
    return;
  }

  if (user.walletBalance < amount) {
    setError(`Insufficient balance. Your balance is ${formatCurrency(user.walletBalance)}`);
    return;
  }

  if (!pin || pin.length < 4) {
    setPinError("Please enter your 4-6 digit transaction PIN");
    return;
  }

  setIsSubmitting(true);
  setError(null);
  setPinError("");

  try {
    // ✅ Use the dedicated QR Buy API
    const payload: any = {
      serviceType: type,
      identifier: identifier,
      amount: amount,
      pin: pin,
    };

    // Add service-specific fields
    if (type === "electricity") {
      payload.discoCode = (itemData as MeterData)?.disco || "IKEJA";
      payload.meterType = (itemData as MeterData)?.meterType || "Prepaid";
    } else if (type === "cable") {
      payload.provider = (itemData as DecoderData)?.provider || "DSTV";
      payload.packageCode = (itemData as DecoderData)?.package || "STANDARD";
    }

    const response = await fetch("/api/vendors/qr-buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Transaction failed");
    }

    setTransactionId(result.data?.transactionId || result.data?.reference || String(Date.now()));
    setTransactionData(result.data);
    setShowSuccess(true);
    setPin("");
    setSelectedAmount(null);
    setCustomAmount("");
    await fetchBalance();
    toast.success(`${type === "electricity" ? "Electricity" : "Cable TV"} purchase successful!`);

  } catch (err: any) {
    setError(err.message || "Transaction failed. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};

  const handleNewPurchase = () => {
    setShowSuccess(false);
    setSelectedAmount(null);
    setCustomAmount("");
    setPin("");
    setPinError("");
    setError(null);
    setTransactionData(null);
    setCopied(false);
  };

  if (loading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-[#1e293b] animate-spin" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading QR Code details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid QR Code</h2>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 px-6 py-2 bg-[#1e293b] text-white rounded-lg hover:bg-[#0f172a] transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    const token = transactionData?.token || transactionData?.data?.token || null;
    const serviceLabel = type === "electricity" ? "Electricity" : "Cable TV";

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Purchase Successful! 🎉
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {type === "electricity" ? "Electricity token generated" : "Cable TV subscription activated"}
          </p>

          {/* Token Display - Highlighted */}
          {token && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                {type === "electricity" ? "🔑 Your Token" : "📺 Your Reference"}
              </p>
              <div className="flex items-center justify-center gap-3">
                <code className="text-lg font-mono font-bold text-blue-800 dark:text-blue-300 tracking-wider break-all">
                  {token}
                </code>
                <button
                  onClick={() => handleCopyToken(token)}
                  className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                  title="Copy token"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1">
                {copied ? "✅ Copied to clipboard!" : "Click to copy token"}
              </p>
            </div>
          )}

          {/* Transaction Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Service</span>
              <span className="font-medium text-gray-900 dark:text-white">{serviceLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Identifier</span>
              <span className="font-medium text-gray-900 dark:text-white">{identifier}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Amount</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(getTotalAmount())}</span>
            </div>
            {type === "electricity" && transactionData?.meterType && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Meter Type</span>
                <span className="font-medium text-gray-900 dark:text-white">{transactionData.meterType}</span>
              </div>
            )}
            {type === "cable" && transactionData?.package && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Package</span>
                <span className="font-medium text-gray-900 dark:text-white">{transactionData.package}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Reference</span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{transactionId}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleNewPurchase}
              className="flex-1 bg-[#1e293b] text-white rounded-xl py-3 font-medium hover:bg-[#0f172a] transition-all"
            >
              Buy Again
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = getTotalAmount();
  const serviceLabel = type === "electricity" ? "Electricity" : "Cable TV";
  const itemName = itemData?.name || (type === "electricity" ? "Meter" : "Decoder");
  const provider = type === "electricity" 
    ? (itemData as MeterData)?.disco 
    : (itemData as DecoderData)?.provider;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1e293b] rounded-2xl shadow-lg mb-2">
            {type === "electricity" ? (
              <Zap className="h-7 w-7 text-white" />
            ) : (
              <Tv className="h-7 w-7 text-white" />
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Quick Purchase</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{serviceLabel} QR Code Payment</p>
        </div>

        {/* Main Container - All in One */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
          {/* Item Details */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="h-10 w-10 rounded-full bg-[#1e293b]/10 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              {type === "electricity" ? (
                <Lightbulb className="h-5 w-5 text-[#1e293b] dark:text-gray-300" />
              ) : (
                <Tv className="h-5 w-5 text-[#1e293b] dark:text-gray-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{itemName}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="truncate">{identifier}</span>
                <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                <span className="truncate">{provider}</span>
              </div>
            </div>
            {type === "electricity" && (itemData as MeterData)?.meterType && (
              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400 flex-shrink-0">
                {(itemData as MeterData).meterType}
              </span>
            )}
          </div>

          {/* Amount Selection */}
          <div className="pt-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Amount</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mt-1.5">
              {recommendedAmounts.map((amount) => (
                <AmountButton
                  key={amount.value}
                  amount={amount}
                  isSelected={selectedAmount === amount.value}
                  onClick={() => handleAmountSelect(amount.value)}
                />
              ))}
            </div>
            <div className="relative mt-1.5">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">₦</div>
              <input
                type="text"
                value={customAmount}
                onChange={handleCustomAmountChange}
                placeholder="Custom amount"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 pl-7 pr-3 py-1.5 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Order Summary & PIN - Row */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            {/* Order Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-lg font-bold text-[#1e293b] dark:text-white">
                {totalAmount > 0 ? formatCurrency(totalAmount) : "—"}
              </p>
              <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                Balance: <span className={user && user.walletBalance >= totalAmount ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {user ? formatCurrency(user.walletBalance) : "—"}
                </span>
              </div>
              {totalAmount > 0 && user && user.walletBalance < totalAmount && (
                <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">
                  Insufficient
                </p>
              )}
            </div>

            {/* PIN Input */}
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">PIN</label>
              <div className="relative mt-1">
                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="••••"
                  maxLength={6}
                  className={`w-full pl-7 pr-7 py-1.5 text-sm rounded-lg border ${
                    pinError ? "border-red-400 ring-2 ring-red-200" : "border-gray-200"
                  } bg-gray-50 dark:bg-gray-800 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:text-white`}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {pinError && (
                <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">{pinError}</p>
              )}
            </div>
          </div>

          {/* Login Status */}
          {!isLoggedIn && (
            <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-2 text-center">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                🔐 <button
                  onClick={() => router.push(`/auth/sign-in?callbackUrl=/buy-now?identifier=${identifier}&type=${type}`)}
                  className="underline hover:no-underline font-medium"
                >
                  Sign in
                </button> to purchase
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/20 p-2">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !isLoggedIn ||
              totalAmount === 0 ||
              !user?.hasWallet ||
              (user?.walletBalance || 0) < totalAmount ||
              !pin ||
              pin.length < 4
            }
            className="w-full mt-3 rounded-xl bg-[#1e293b] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0f172a] hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1e293b]/20"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                {isLoggedIn ? "Confirm & Pay" : "Sign in to Purchase"}
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </button>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Secured
            </span>
            <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Instant
            </span>
            <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-1">
              <QrCode className="h-3 w-3" />
              QR Payment
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}