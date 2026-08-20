// app/buy-now/page.client.tsx - UPDATED with Close button

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Zap,
  Tv,
  Lightbulb,
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
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

// ✅ Import QR verification - using the new simple hash
import { verifyQRHash } from "~/lib/qr-hash";

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

interface ScheduledBill {
  id: string;
  type: "ELECTRICITY" | "CABLE_TV";
  meterNumber?: string;
  decoderNumber?: string;
  disco?: string;
  provider?: string;
  amount: number;
  deliveryDate: string;
  nextRenewalDate: string;
  status: "PENDING" | "PROCESSING" | "PURCHASED" | "DELIVERED" | "FAILED";
  token?: string | null;
  isActive: boolean;
  isPaused: boolean;
}

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

const getDaysRemaining = (dateString: string) => {
  const target = new Date(dateString);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
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

// ✅ Scheduled Bill Modal Component
const ScheduledBillModal = ({
  isOpen,
  onClose,
  bill,
}: {
  isOpen: boolean;
  onClose: () => void;
  bill: ScheduledBill | null;
}) => {
  if (!isOpen || !bill) return null;

  const daysRemaining = getDaysRemaining(bill.deliveryDate);
  const isDue = daysRemaining <= 0;
  const hasToken = !!bill.token;
  const isDelivered = bill.status === "DELIVERED";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Delivered</span>;
      case "PURCHASED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Token Ready</span>;
      case "PROCESSING":
        return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Processing</span>;
      case "FAILED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-400">Pending</span>;
    }
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
              {bill.type === "ELECTRICITY" ? (
                <Zap className="h-8 w-8 text-white" />
              ) : (
                <Tv className="h-8 w-8 text-white" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {bill.type === "ELECTRICITY" ? "Electricity" : "Cable TV"} Bill
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {bill.meterNumber || bill.decoderNumber || "—"}
            </p>
          </div>

          {/* Status and Days Remaining */}
          <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
              <div className="mt-1">{getStatusBadge(bill.status)}</div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Delivery</p>
              <p className={`text-sm font-bold ${isDue ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                {isDue ? "🔴 Due Now" : `${daysRemaining} days`}
              </p>
            </div>
          </div>

          {/* Token Display */}
          {hasToken && (isDue || isDelivered) ? (
            <div className="mb-4 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/20">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">
                {bill.type === "ELECTRICITY" ? "🔑 Your Token" : "📺 Your Reference"}
              </p>
              <code className="block text-center text-lg font-mono font-bold text-green-800 dark:text-green-300 tracking-wider break-all">
                {bill.token}
              </code>
              <p className="mt-1 text-center text-[10px] text-green-600 dark:text-green-400">
                ✅ Token is ready for use
              </p>
            </div>
          ) : hasToken && !isDue ? (
            <div className="mb-4 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/20">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                🔒 Token Locked
              </p>
              <div className="flex items-center justify-center gap-2">
                <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-700 dark:text-yellow-400">
                  Available in {daysRemaining} days
                </span>
              </div>
              <p className="mt-1 text-center text-[10px] text-yellow-600 dark:text-yellow-400">
                Token will be revealed on {formatDate(bill.deliveryDate)}
              </p>
            </div>
          ) : (
            <div className="mb-4 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                ⏳ Token Pending
              </p>
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {bill.status === "PENDING" ? "Waiting for purchase" : "Processing"}
                </span>
              </div>
            </div>
          )}

          {/* Bill Details */}
          <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Amount</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(bill.amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Provider</span>
              <span className="text-gray-900 dark:text-white">
                {bill.disco || bill.provider || "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Identifier</span>
              <span className="font-mono text-xs text-gray-900 dark:text-white">
                {bill.meterNumber || bill.decoderNumber || "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Delivery Date</span>
              <span className="text-gray-900 dark:text-white">
                {formatDate(bill.deliveryDate)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Next Renewal</span>
              <span className="text-gray-900 dark:text-white">
                {formatDate(bill.nextRenewalDate)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg bg-[#1e293b] py-3 text-sm font-medium text-white hover:bg-[#0f172a] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function BuyNowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ Hashed params: id, t, p, h, e
  const id = searchParams.get("id");
  const type = searchParams.get("t");
  const provider = searchParams.get("p");
  const hash = searchParams.get("h");
  const expiresAt = searchParams.get("e");
  
  const [loading, setLoading] = useState(true);
  const [qrError, setQrError] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [itemData, setItemData] = useState<MeterData | DecoderData | null>(null);
  const [recommendedAmounts, setRecommendedAmounts] = useState<{ label: string; value: number }[]>([]);
  const [scheduledBills, setScheduledBills] = useState<ScheduledBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<ScheduledBill | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showAllBills, setShowAllBills] = useState(false);
  const [isFetchingBills, setIsFetchingBills] = useState(false);
  const [hasFetchedBills, setHasFetchedBills] = useState(false);
  
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
  const [verifiedData, setVerifiedData] = useState<{
    identifier: string;
    type: string;
    provider: string;
  } | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "failed">("pending");

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

  const fetchScheduledBills = async () => {
    if (!isLoggedIn) {
      console.log("📋 [BUY NOW] Not logged in, skipping bills fetch");
      return;
    }
    
    console.log("📋 [BUY NOW] Starting to fetch scheduled bills...");
    setIsFetchingBills(true);
    
    try {
      const response = await fetch("/api/user/scheduled-bills");
      console.log(`📋 [BUY NOW] API Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("📋 [BUY NOW] API Response data:", result);
      
      if (result.success) {
        const bills = result.data || [];
        console.log(`📋 [BUY NOW] Found ${bills.length} bills`);
        setScheduledBills(bills);
        setHasFetchedBills(true);
      } else {
        console.error("❌ [BUY NOW] Failed to fetch bills:", result.error);
        toast.error("Failed to load scheduled bills");
      }
    } catch (error) {
      console.error("❌ [BUY NOW] Error fetching bills:", error);
      toast.error("Error loading scheduled bills");
    } finally {
      setIsFetchingBills(false);
    }
  };

  useEffect(() => {
    const verifyAndFetchData = async () => {
      // ✅ Verify QR hash using the new simple hash
      if (!id || !type || !provider || !hash) {
        setQrError("Invalid QR code. Missing required parameters.");
        setVerificationStatus("failed");
        setLoading(false);
        return;
      }

      // ✅ Verify the hash with the new simple hash algorithm
      const isValid = verifyQRHash({
        identifier: id,
        type: type,
        provider: provider,
        hash: hash,
        expiresAt: expiresAt || undefined,
      });

      if (!isValid) {
        setQrError("This QR code is invalid or has expired. Please generate a new one.");
        setVerificationStatus("failed");
        setLoading(false);
        return;
      }

      setVerificationStatus("verified");
      
      // ✅ Store verified data
      setVerifiedData({
        identifier: id,
        type: type,
        provider: provider,
      });

      setLoading(true);
      setQrError(null);
      setPurchaseError(null);

      try {
        // Auth check
        const authRes = await fetch("/api/auth/session");
        const session = await authRes.json();
        const loggedIn = !!session?.user;
        setIsLoggedIn(loggedIn);
        
        console.log(`🔐 [BUY NOW] Logged in: ${loggedIn}`);
        
        if (loggedIn && session?.user) {
          // Get user info
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

          // ✅ Fetch scheduled bills immediately after login
          console.log("📋 [BUY NOW] User is logged in, fetching bills...");
          await fetchScheduledBills();
        } else {
          console.log("📋 [BUY NOW] User is NOT logged in, skipping bills fetch");
        }

        // Fetch item data using verified data
        let itemRes;
        if (type === "electricity") {
          itemRes = await fetch(`/api/saved-meters/lookup?meterNumber=${encodeURIComponent(id)}`);
        } else if (type === "cable") {
          itemRes = await fetch(`/api/saved-decoders/lookup?decoderNumber=${encodeURIComponent(id)}`);
        } else {
          throw new Error("Invalid service type");
        }

        if (!itemRes.ok) {
          throw new Error("Item not found. Please check the QR code.");
        }

        const itemResult = await itemRes.json();
        setItemData(itemResult.data);

        // Get recommended amounts
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
        setQrError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
        setIsCheckingAuth(false);
      }
    };

    verifyAndFetchData();
  }, [id, type, provider, hash, expiresAt]);

  // ✅ Also try fetching when isLoggedIn changes
  useEffect(() => {
    if (isLoggedIn && !hasFetchedBills && !isFetchingBills) {
      console.log("📋 [BUY NOW] isLoggedIn changed, fetching bills...");
      fetchScheduledBills();
    }
  }, [isLoggedIn]);

  const handleAmountSelect = (value: number) => {
    setSelectedAmount(value);
    setCustomAmount("");
    setPinError("");
    setPurchaseError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setCustomAmount(value);
    if (value) setSelectedAmount(null);
    setPinError("");
    setPurchaseError(null);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setPin(value);
      setPinError("");
      setPurchaseError(null);
    }
  };

  const getTotalAmount = () => selectedAmount || parseInt(customAmount) || 0;

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success("Token copied to clipboard!");
  };

  const handleBillClick = (bill: ScheduledBill) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  // ✅ Handle close - redirect to the QR code link that was shared
  const handleClose = () => {
    // Construct the QR code URL that was used to access this page
    // This is the link that was shared with the QR code
    const qrLink = `https://app.bilscore.com/buy-now?id=${id}&t=${type}&p=${provider}&h=${hash}${expiresAt ? `&e=${expiresAt}` : ''}`;
    
    // Redirect to the QR link
    window.location.href = qrLink;
  };

  const handleSubmit = async () => {
    const amount = getTotalAmount();
    
    // Clear previous purchase errors
    setPurchaseError(null);
    setPinError(null);
    
    if (!amount || amount < 100) {
      setPurchaseError("Please enter a valid amount (minimum ₦100)");
      return;
    }

    if (!verifiedData) {
      setPurchaseError("Invalid QR data");
      return;
    }

    if (!isLoggedIn) {
      router.push(`/auth/sign-in?callbackUrl=/buy-now?id=${id}&t=${type}&p=${provider}&h=${hash}&e=${expiresAt}`);
      return;
    }

    if (!user?.hasWallet) {
      setPurchaseError("You need a wallet to make payments.");
      return;
    }

    if (user.walletBalance < amount) {
      setPurchaseError(`Insufficient balance. Your balance is ${formatCurrency(user.walletBalance)}`);
      return;
    }

    if (!pin || pin.length < 4) {
      setPinError("Please enter your 4-6 digit transaction PIN");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        serviceType: verifiedData.type,
        identifier: verifiedData.identifier,
        amount: amount,
        pin: pin,
        provider: verifiedData.provider,
        qrHash: hash,
      };

      if (verifiedData.type === "electricity") {
        payload.discoCode = (itemData as MeterData)?.disco || "IKEJA";
        payload.meterType = (itemData as MeterData)?.meterType || "Prepaid";
      } else if (verifiedData.type === "cable") {
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
        const errorMsg = result.error || "Transaction failed";
        setPurchaseError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setTransactionId(result.data?.transactionId || result.data?.reference || String(Date.now()));
      setTransactionData(result.data);
      setShowSuccess(true);
      setPin("");
      setSelectedAmount(null);
      setCustomAmount("");
      await fetchBalance();
      
      // ✅ Refresh scheduled bills after purchase
      await fetchScheduledBills();
      
      toast.success(`${verifiedData.type === "electricity" ? "Electricity" : "Cable TV"} purchase successful!`);

    } catch (err: any) {
      const errorMsg = err.message || "Transaction failed. Please try again.";
      setPurchaseError(errorMsg);
      toast.error(errorMsg);
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
    setPurchaseError(null);
    setTransactionData(null);
    setCopied(false);
  };

  // ✅ QR ERROR - Show invalid QR page
  if (qrError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid QR Code</h2>
          <p className="text-gray-500 dark:text-gray-400">{qrError}</p>
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

  if (loading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-[#1e293b] animate-spin" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Verifying QR Code...</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    const token = transactionData?.token || transactionData?.data?.token || null;
    const serviceLabel = verifiedData?.type === "electricity" ? "Electricity" : "Cable TV";

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
            {verifiedData?.type === "electricity" ? "Electricity token generated" : "Cable TV subscription activated"}
          </p>

          {token && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                {verifiedData?.type === "electricity" ? "🔑 Your Token" : "📺 Your Reference"}
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

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Service</span>
              <span className="font-medium text-gray-900 dark:text-white">{serviceLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Identifier</span>
              <span className="font-medium text-gray-900 dark:text-white">{verifiedData?.identifier}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Amount</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(getTotalAmount())}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Reference</span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{transactionId}</span>
            </div>
          </div>

          {/* ✅ Buy Again and Close buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleNewPurchase}
              className="flex-1 bg-[#1e293b] text-white rounded-xl py-3 font-medium hover:bg-[#0f172a] transition-all"
            >
              Buy Again
            </button>
            <button
              onClick={handleClose}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = getTotalAmount();
  const serviceLabel = verifiedData?.type === "electricity" ? "Electricity" : "Cable TV";
  const itemName = itemData?.name || (verifiedData?.type === "electricity" ? "Meter" : "Decoder");
  const providerName = verifiedData?.provider || "";

  // Filter scheduled bills for display
  const displayBills = scheduledBills
    .filter(b => b.isActive && b.status !== "DELIVERED")
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());

  console.log(`📋 [BUY NOW] Display bills: ${displayBills.length} bills, Total scheduled: ${scheduledBills.length}`);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1e293b] rounded-2xl shadow-lg mb-2">
            {verifiedData?.type === "electricity" ? (
              <Zap className="h-7 w-7 text-white" />
            ) : (
              <Tv className="h-7 w-7 text-white" />
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Quick Purchase</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{serviceLabel} QR Code Payment</p>
          {verificationStatus === "verified" && (
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
              <Shield className="h-3 w-3" />
              Verified QR Code
            </div>
          )}
        </div>

        {/* Main Container */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
          {/* Item Details */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="h-10 w-10 rounded-full bg-[#1e293b]/10 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              {verifiedData?.type === "electricity" ? (
                <Lightbulb className="h-5 w-5 text-[#1e293b] dark:text-gray-300" />
              ) : (
                <Tv className="h-5 w-5 text-[#1e293b] dark:text-gray-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{itemName}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="truncate">{verifiedData?.identifier}</span>
                <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                <span className="truncate">{providerName}</span>
              </div>
            </div>
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">
              🔒 Secure
            </span>
          </div>

          {/* ✅ Scheduled Bills Section */}
          {isLoggedIn && (
            <div className="mt-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Scheduled Bills
                  </span>
                  {isFetchingBills ? (
                    <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                  ) : (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                      {displayBills.length}
                    </span>
                  )}
                </div>
                {displayBills.length > 3 && (
                  <button
                    onClick={() => setShowAllBills(!showAllBills)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-0.5"
                  >
                    {showAllBills ? (
                      <>
                        Show less <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        View all <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {displayBills.length === 0 && !isFetchingBills ? (
                <div className="text-center py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No scheduled bills yet
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Create one from the Bill Scheduler
                  </p>
                </div>
              ) : isFetchingBills ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {(showAllBills ? displayBills : displayBills.slice(0, 3)).map((bill) => {
                    const daysRemaining = getDaysRemaining(bill.deliveryDate);
                    const isDue = daysRemaining <= 0;
                    const hasToken = !!bill.token;

                    return (
                      <div
                        key={bill.id}
                        onClick={() => handleBillClick(bill)}
                        className="flex items-center justify-between rounded-lg border border-gray-100 p-2.5 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            {bill.type === "ELECTRICITY" ? (
                              <Zap className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <Tv className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900 dark:text-white">
                              {bill.meterNumber || bill.decoderNumber || "—"}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {formatCurrency(bill.amount)} • {formatDate(bill.deliveryDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isDue && hasToken ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <Check className="h-3 w-3" />
                              Ready
                            </span>
                          ) : isDue && !hasToken ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <AlertCircle className="h-3 w-3" />
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <Clock className="h-3 w-3" />
                              {daysRemaining}d
                            </span>
                          )}
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

          {/* Order Summary & PIN */}
          <div className="grid grid-cols-2 gap-3 pt-3">
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
            </div>

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

          {/* ✅ Purchase Error - Show on page */}
          {purchaseError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/20 p-2">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400">{purchaseError}</p>
              </div>
            </div>
          )}

          {/* Login Status */}
          {!isLoggedIn && (
            <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-2 text-center">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                🔐 <button
                  onClick={() => router.push(`/auth/sign-in?callbackUrl=/buy-now?id=${id}&t=${type}&p=${provider}&h=${hash}&e=${expiresAt}`)}
                  className="underline hover:no-underline font-medium"
                >
                  Sign in
                </button> to purchase
              </p>
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
            <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-1 text-green-500">
              <Shield className="h-3 w-3" />
              Verified
            </span>
          </div>
        </div>
      </div>

      {/* ✅ Scheduled Bill Modal */}
      <ScheduledBillModal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        bill={selectedBill}
      />
    </div>
  );
}