"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
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
  Shield,
  QrCode,
  Copy,
  Check,
  User,
  Wallet,
  Clock,
  Mail,
  RefreshCw,
  Headphones,
  X,
} from "lucide-react";

// Import QR verification - NO EXPIRY
import { verifyQRHash } from "~/lib/qr-hash";

// Types
interface MeterData {
  id: string;
  meterNumber: string;
  disco: string;
  name: string | null;
  meterType: string;
  isDefault: boolean;
  userId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    hasWallet: boolean;
    wallet: {
      walletBalance: number;
    } | null;
  };
}

interface DecoderData {
  id: string;
  decoderNumber: string;
  provider: string;
  name: string | null;
  package: string | null;
  isDefault: boolean;
  userId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    hasWallet: boolean;
    wallet: {
      walletBalance: number;
    } | null;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

// ✅ LOADING MODAL
const LoadingModal = ({ isOpen }: { isOpen: boolean }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
          <div className="relative h-24 w-24 rounded-full bg-white shadow-2xl flex items-center justify-center animate-pulse border-2 border-gray-200/50">
            <div className="relative h-16 w-16">
              <Image
                src="/uploads/log-icon.jpeg"
                alt="Bilscore"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h3 className="text-xl font-semibold text-white">Processing Payment...</h3>
          <p className="mt-2 text-sm text-gray-300">Please wait while we complete your transaction</p>
        </div>

        <div className="mt-4 flex space-x-2">
          <div className="h-2 w-2 rounded-full bg-white/80 animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 rounded-full bg-white/80 animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 rounded-full bg-white/80 animate-bounce" />
        </div>
      </div>
    </div>
  );
};

// ✅ SIMPLE ERROR MODAL
const ErrorModal = ({
  isOpen,
  onClose,
  error,
  onRetry,
}: {
  isOpen: boolean;
  onClose: () => void;
  error: string;
  onRetry?: () => void;
}) => {
  if (!isOpen) return null;

  // Simple friendly message mapping
  const getFriendlyMessage = (err: string): { title: string; message: string } => {
    const lower = err.toLowerCase();
    
    if (lower.includes('timeout') || lower.includes('timed out')) {
      return {
        title: "⏱️ Request Timed Out",
        message: "The payment service is taking too long. Please try again."
      };
    }
    if (lower.includes('vendor') || lower.includes('all vendors failed')) {
      return {
        title: "⚠️ Service Unavailable",
        message: "We're having trouble connecting to the payment service. Please try again."
      };
    }
    if (lower.includes('insufficient') || lower.includes('balance')) {
      return {
        title: "💳 Insufficient Balance",
        message: "The wallet balance is not enough to complete this transaction."
      };
    }
    if (lower.includes('pin')) {
      return {
        title: "🔑 Invalid PIN",
        message: "The transaction PIN you entered is incorrect. Please check and try again."
      };
    }
    if (lower.includes('network') || lower.includes('connection')) {
      return {
        title: "🌐 Network Error",
        message: "Please check your internet connection and try again."
      };
    }
    
    return {
      title: "❌ Transaction Failed",
      message: err.length > 100 ? err.substring(0, 100) + "..." : err
    };
  };

  const friendly = getFriendlyMessage(error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>

        <h3 className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-white">
          {friendly.title}
        </h3>
        <p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {friendly.message}
        </p>

        <div className="flex flex-col gap-2">
          {onRetry && (
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="w-full rounded-xl bg-[#1e293b] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0f172a] hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
          <button
            onClick={() => {
              onClose();
              window.location.href = "/support";
            }}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            <Headphones className="h-4 w-4" />
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
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
  
  // QR params
  const id = searchParams.get("id");
  const type = searchParams.get("t");
  const provider = searchParams.get("p");
  const hash = searchParams.get("h");
  const userId = searchParams.get("u");
  
  const [loading, setLoading] = useState(true);
  const [qrError, setQrError] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
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
  const [copied, setCopied] = useState(false);
  const [verifiedData, setVerifiedData] = useState<{
    identifier: string;
    type: string;
    provider: string;
    userId: string;
  } | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "failed">("pending");

  // Modal states
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Verify QR and fetch data
  useEffect(() => {
    const verifyAndFetchData = async () => {
      if (!id || !type || !provider || !hash || !userId) {
        setQrError("Invalid QR code. Missing required parameters.");
        setVerificationStatus("failed");
        setLoading(false);
        return;
      }

      const isValid = verifyQRHash({
        identifier: id,
        type: type,
        provider: provider,
        userId: userId,
        hash: hash,
      });

      if (!isValid) {
        setQrError("This QR code is invalid. Please generate a new one.");
        setVerificationStatus("failed");
        setLoading(false);
        return;
      }

      setVerificationStatus("verified");
      
      setVerifiedData({
        identifier: id,
        type: type,
        provider: provider,
        userId: userId,
      });

      setLoading(true);
      setQrError(null);
      setPurchaseError(null);

      try {
        let itemRes;
        if (type === "electricity") {
          itemRes = await fetch(`/api/saved-meters/lookup?meterNumber=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}&includeUser=true`);
        } else if (type === "cable") {
          itemRes = await fetch(`/api/saved-decoders/lookup?decoderNumber=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}&includeUser=true`);
        } else {
          throw new Error("Invalid service type");
        }

        if (!itemRes.ok) {
          const errorData = await itemRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Item not found. Please check the QR code.");
        }

        const itemResult = await itemRes.json();
        
        if (!itemResult.success || !itemResult.data) {
          throw new Error(itemResult.error || "Failed to load item data");
        }

        if (!itemResult.data.user) {
          throw new Error("Meter owner information not found. Please contact support.");
        }

        if (!itemResult.data.user.wallet) {
          throw new Error("Meter owner does not have a wallet. Please contact support.");
        }

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
        console.error("Error fetching data:", err);
        setQrError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetchData();
  }, [id, type, provider, hash, userId]);

  // Amount handlers
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

  const handleClose = () => {
    const qrLink = `https://app.bilscore.com/buy-now?id=${id}&t=${type}&p=${provider}&h=${hash}&u=${userId}`;
    window.location.href = qrLink;
  };

  const handleSubmit = async () => {
    const amount = getTotalAmount();
    
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

    if (!itemData?.user) {
      setPurchaseError("Meter owner information not found");
      return;
    }

    if (!pin || pin.length < 4) {
      setPinError("Please enter the meter owner's 4-6 digit transaction PIN");
      return;
    }

    if (!itemData.user.hasWallet || !itemData.user.wallet) {
      setPurchaseError("The meter owner does not have a wallet set up");
      return;
    }

    const balance = Number(itemData.user.wallet.walletBalance);
    if (balance < amount) {
      setPurchaseError(`Insufficient balance. Owner's balance: ${formatCurrency(balance)}`);
      return;
    }

    setShowLoadingModal(true);
    setIsSubmitting(true);

    try {
      const payload: any = {
        serviceType: verifiedData.type,
        identifier: verifiedData.identifier,
        amount: amount,
        pin: pin,
        provider: verifiedData.provider,
        qrHash: hash,
        userId: itemData.user.id,
        phone: itemData.user.phone || undefined,
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

      setShowLoadingModal(false);

      if (!response.ok || !result.success) {
        const errorMsg = result.error || "Transaction failed";
        setPurchaseError(errorMsg);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        return;
      }

      setTransactionId(result.data?.transactionId || result.data?.reference || String(Date.now()));
      setTransactionData(result.data);
      setShowSuccess(true);
      setPin("");
      setSelectedAmount(null);
      setCustomAmount("");
      
      toast.success(`Payment successful for ${itemData.user.fullName}'s ${verifiedData.type === "electricity" ? "electricity" : "cable TV"}!`);

    } catch (err: any) {
      setShowLoadingModal(false);
      const errorMsg = err.message || "Transaction failed. Please try again.";
      setPurchaseError(errorMsg);
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
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

  // Error state
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-[#1e293b] animate-spin" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Verifying QR Code...</p>
        </div>
      </div>
    );
  }

  if (!itemData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Item Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400">The meter or decoder could not be found.</p>
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

  if (!itemData.user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Owner Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400">The owner of this meter could not be found.</p>
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

  if (!itemData.user.wallet) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Wallet Found</h2>
          <p className="text-gray-500 dark:text-gray-400">The owner of this meter does not have a wallet.</p>
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

  // Success state
  if (showSuccess) {
    const token = transactionData?.token || transactionData?.data?.token || null;
    const serviceLabel = verifiedData?.type === "electricity" ? "Electricity" : "Cable TV";
    const customerInfo = transactionData?.customerInfo;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Payment Successful! 🎉
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {serviceLabel} payment for {itemData.user.fullName}
          </p>

          {customerInfo?.name && (
            <div className="mb-4 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{customerInfo.name}</p>
              {customerInfo.address && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{customerInfo.address}</p>
              )}
            </div>
          )}

          {itemData.user && (
            <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-left border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Account Owner</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{itemData.user.fullName}</p>
              {itemData.user.email && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {itemData.user.email}
                </p>
              )}
            </div>
          )}

          {token && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                {verifiedData?.type === "electricity" ? "🔑 Token" : "📺 Reference"}
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
                {copied ? "✅ Copied to clipboard!" : "Click to copy"}
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
            {transactionData?.vendor && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Vendor</span>
                <span className="font-medium text-gray-900 dark:text-white">{transactionData.vendor}</span>
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
              Pay Again
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

  // Main payment form
  const totalAmount = getTotalAmount();
  const serviceLabel = verifiedData?.type === "electricity" ? "Electricity" : "Cable TV";
  const itemName = itemData?.name || (verifiedData?.type === "electricity" ? "Meter" : "Decoder");
  const providerName = verifiedData?.provider || "";
  const owner = itemData.user;
  const ownerBalance = owner?.wallet?.walletBalance || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <LoadingModal isOpen={showLoadingModal} />
      
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        error={errorMessage}
        onRetry={() => handleSubmit()}
      />

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg mb-2 overflow-hidden bg-white">
            <Image
              src="/uploads/log-icon.jpeg"
              alt="Bilscore Logo"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
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

          {/* Owner Info */}
          {owner && (
            <div className="mt-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{owner.fullName}</p>
                  {owner.email && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Mail className="h-3 w-3" />
                      <span>{owner.email}</span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <Wallet className="h-3 w-3 text-gray-400" />
                    <span className={`text-xs font-medium ${ownerBalance >= totalAmount ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      Balance: {formatCurrency(ownerBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Amount Selection */}
          <div className="pt-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Select Amount</label>
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
                placeholder="Enter custom amount"
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
              {owner && (
                <div className="mt-1 text-[10px]">
                  <span className={ownerBalance >= totalAmount ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    Balance: {formatCurrency(ownerBalance)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Owner's PIN</label>
              <div className="relative mt-1">
                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="••••••"
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
              <p className="mt-0.5 text-[9px] text-gray-400 dark:text-gray-500">
                Enter {owner?.fullName || "owner's"} 4-6 digit PIN
              </p>
            </div>
          </div>

          {/* Payment notice */}
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-2 text-center">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              🔐 Paying for {owner?.fullName || "meter owner"}'s {serviceLabel}
            </p>
            <p className="text-[9px] text-blue-500 dark:text-blue-500 mt-0.5">
              Using owner's wallet balance • Owner's PIN required
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              totalAmount === 0 ||
              !pin ||
              pin.length < 4 ||
              (owner && ownerBalance < totalAmount)
            }
            className="w-full mt-3 rounded-xl bg-[#1e293b] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0f172a] hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1e293b]/20"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Payment...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Lock className="h-4 w-4" />
                Pay {totalAmount > 0 ? formatCurrency(totalAmount) : ""}
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
    </div>
  );
}