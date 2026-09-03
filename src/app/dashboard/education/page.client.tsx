// app/dashboard/buy/education/page.client.tsx - COMPLETE WITH LOADING & SUCCESS MODALS

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  GraduationCap,
  Check,
  ArrowRight,
  AlertCircle,
  Loader2,
  User,
  CreditCard,
  Clock,
  Shield,
  BookOpen,
  Users,
  History,
  ChevronDown,
  ChevronUp,
  Star,
  Lock,
  Eye,
  EyeOff,
  Search,
  Filter,
  X,
  TrendingUp,
  Sparkles,
  Award,
  School,
  Book,
  IdCard,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// Types
interface Variation {
  id: string;
  name: string;
  price: number;
  packageCode: string;
  fixedPrice?: boolean;
}

interface Product {
  id: string;
  name: string;
  serviceId: string;
  variations: Variation[];
  requiresProfileVerification?: boolean;
}

interface EducationClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
  };
  products: Product[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

// ✅ LOADING MODAL WITH ANIMATED LOGO
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
          <h3 className="text-xl font-semibold text-white">Processing...</h3>
          <p className="mt-2 text-sm text-gray-300">Please wait while we complete your purchase</p>
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

// ✅ SUCCESS MODAL COMPONENT
const SuccessModal = ({
  isOpen,
  onClose,
  transactionId,
  product,
  variation,
  quantity,
  amount,
  pinDetails,
  onBuyMore,
}: {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  product: string;
  variation: string;
  quantity: number;
  amount: number;
  pinDetails?: string;
  onBuyMore?: () => void;
}) => {
  if (!isOpen) return null;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 animate-bounce">
          <GraduationCap className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>

        <h3 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
          Education Purchase Successful! 🎓
        </h3>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Your educational PIN(s) have been generated successfully
        </p>

        <div className="mb-6 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Product</span>
            <span className="font-medium text-gray-900 dark:text-white">{product}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Variation</span>
            <span className="font-medium text-gray-900 dark:text-white">{variation}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Quantity</span>
            <span className="font-medium text-gray-900 dark:text-white">{quantity}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
            <span className="font-bold text-green-600 dark:text-green-400">
              {formatCurrency(amount)}
            </span>
          </div>
          {pinDetails && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">PIN(s)</span>
              <span className="font-mono text-xs font-bold text-gray-900 dark:text-white break-all max-w-[200px] text-right">
                {pinDetails}
              </span>
            </div>
          )}
          {transactionId && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Transaction ID</span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                {transactionId.slice(0, 8)}...{transactionId.slice(-6)}
              </span>
            </div>
          )}
        </div>

        {pinDetails && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(pinDetails);
              toast.success("PIN(s) copied to clipboard!");
            }}
            className="w-full mb-3 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy PIN(s)
          </button>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[#1e293b] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0f172a] hover:scale-[1.01]"
          >
            Done
          </button>
          {onBuyMore && (
            <button
              onClick={() => {
                onBuyMore();
                onClose();
              }}
              className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Buy More
            </button>
          )}
        </div>

        <p className="mt-3 text-center text-[10px] text-gray-400">
          This window will close automatically in a few seconds
        </p>
      </div>
    </div>
  );
};

// ✅ ERROR MODAL COMPONENT
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

        <h3 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
          Purchase Failed
        </h3>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          We couldn't complete your education purchase
        </p>

        <div className="mb-6 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              if (onRetry) onRetry();
              onClose();
            }}
            className="w-full rounded-xl bg-[#1e293b] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0f172a] hover:scale-[1.01]"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              onClose();
              window.location.href = "/support";
            }}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

// ✅ Product Button
const ProductButton = ({
  product,
  isSelected,
  onClick,
}: {
  product: Product;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const getEmoji = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("waec")) return "📝";
    if (lower.includes("neco")) return "📋";
    if (lower.includes("jamb")) return "📘";
    if (lower.includes("registration")) return "📄";
    if (lower.includes("result")) return "📊";
    return "🎓";
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 transition-all duration-200 ${
        isSelected
          ? "border-blue-500 bg-blue-50 text-gray-900 shadow-md dark:border-blue-600 dark:bg-blue-950/40 dark:text-white"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800"
      }`}
    >
      <div className="h-12 w-12 rounded-full flex items-center justify-center text-3xl bg-gray-100 dark:bg-gray-800">
        {getEmoji(product.name)}
      </div>
      <span className={`mt-1 text-xs font-semibold text-center ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
        {product.name}
      </span>
      <span className={`text-[9px] ${isSelected ? "text-blue-500/70 dark:text-blue-400/70" : "text-gray-500 dark:text-gray-400"}`}>
        {product.variations.length} options
      </span>
      {product.requiresProfileVerification && (
        <span className="mt-0.5 text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full dark:bg-purple-900/30 dark:text-purple-400">
          Profile Required
        </span>
      )}
      {isSelected && (
        <span className="mt-0.5 text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
          Selected
        </span>
      )}
    </button>
  );
};

// ✅ Variation Card
const VariationCard = ({
  variation,
  isSelected,
  onClick,
  isBestValue,
}: {
  variation: Variation;
  isSelected: boolean;
  onClick: () => void;
  isBestValue?: boolean;
}) => {
  const isLongName = variation.name.length > 40;

  return (
    <button
      onClick={onClick}
      className={`group relative w-full rounded-xl border-2 p-3 text-left transition-all duration-200 ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20 dark:border-blue-600 dark:bg-blue-950/40"
          : "border-gray-200 bg-white hover:border-[#1e293b]/30 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500"
      } ${isBestValue ? "border-yellow-400 dark:border-yellow-500/50" : ""}`}
    >
      {isBestValue && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-400 px-1.5 py-0.5 text-[8px] font-bold text-yellow-900 shadow-md">
            <Sparkles className="h-2 w-2" />
            BEST
          </span>
        </div>
      )}

      {variation.id === 'waecdirect' && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-500 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-md">
            <TrendingUp className="h-2 w-2" />
            POPULAR
          </span>
        </div>
      )}

      {isSelected && (
        <div className="absolute top-0 right-0">
          <div className="bg-blue-500 text-white rounded-bl-lg rounded-tr-lg px-2 py-0.5 text-[8px] font-medium">
            SELECTED
          </div>
        </div>
      )}

      <h4 className={`text-sm font-bold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"} pr-12 ${isLongName ? "text-[11px]" : "text-sm"}`}>
        {variation.name}
      </h4>

      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className={`text-lg font-bold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
          {formatCurrency(variation.price)}
        </span>
        <span className="text-[8px] text-gray-400 dark:text-gray-500">
          {variation.fixedPrice ? "Fixed" : "Variable"}
        </span>
      </div>

      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-b-xl" />
      )}
    </button>
  );
};

// ✅ Profile Verification Component (for JAMB)
const ProfileVerification = ({
  profileId,
  setProfileId,
  variationCode,
  onVerified,
  onVerifying,
}: {
  profileId: string;
  setProfileId: (value: string) => void;
  variationCode: string;
  onVerified: (data: { customerName: string; status: string }) => void;
  onVerifying: (isVerifying: boolean) => void;
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState<{ customerName: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyProfile = async () => {
    if (!profileId || profileId.length < 10) {
      setError("Please enter a valid Profile ID (minimum 10 digits)");
      return;
    }

    setIsVerifying(true);
    onVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/vendors/education/verify-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          variationCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setVerified({
          customerName: result.data.customerName,
          status: result.data.status || "Verified",
        });
        onVerified({
          customerName: result.data.customerName,
          status: result.data.status || "Verified",
        });
        toast.success(`✅ Profile verified: ${result.data.customerName}`);
      } else {
        setError(result.error || "Profile verification failed");
        toast.error(result.error || "Profile verification failed");
      }
    } catch (error) {
      setError("Failed to verify profile. Please try again.");
      toast.error("Failed to verify profile");
    } finally {
      setIsVerifying(false);
      onVerifying(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        JAMB Profile Verification
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Enter your JAMB Profile ID to verify before purchasing
      </p>
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <IdCard className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={profileId}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              setProfileId(value);
              setError(null);
            }}
            placeholder="Enter 10-digit Profile ID"
            maxLength={10}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button
          onClick={verifyProfile}
          disabled={isVerifying || !profileId}
          className="rounded-lg bg-[#1e293b] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Verify"
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {verified && (
        <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-900/30 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs font-medium text-green-700 dark:text-green-400">
                Verified: {verified.customerName}
              </p>
              <p className="text-[10px] text-green-600 dark:text-green-300">
                Status: {verified.status}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ Main Component
export function EducationClient({
  user: initialUser,
  products,
}: EducationClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [isEnsuringWallet, setIsEnsuringWallet] = useState(false);
  
  // ✅ Modal states
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    transactionId: string;
    product: string;
    variation: string;
    quantity: number;
    amount: number;
    pinDetails?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // ✅ JAMB Profile Verification states
  const [profileId, setProfileId] = useState<string>("");
  const [profileVerified, setProfileVerified] = useState<{ customerName: string; status: string } | null>(null);
  const [isVerifyingProfile, setIsVerifyingProfile] = useState(false);
  
  // ✅ PIN state
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");

  const currentProduct = products.find((p) => p.id === selectedProduct);
  const variations = currentProduct?.variations || [];
  const requiresProfile = currentProduct?.requiresProfileVerification || false;

  // Auto-select first variation when product changes
  useEffect(() => {
    if (currentProduct && currentProduct.variations.length > 0) {
      setSelectedVariation(currentProduct.variations[0]);
    }
    setProfileVerified(null);
    setProfileId("");
  }, [selectedProduct]);

  // Ensure wallet exists on mount
  useEffect(() => {
    const ensureWallet = async () => {
      if (!user.hasWallet) {
        setIsEnsuringWallet(true);
        try {
          const response = await fetch("/api/user/ensure-wallet", {
            method: "POST",
          });
          const result = await response.json();
          if (result.success && result.wallet) {
            setUser({
              ...user,
              hasWallet: true,
              walletBalance: result.wallet.balance || 0,
            });
          }
        } catch (error) {
          console.error("Failed to ensure wallet:", error);
        } finally {
          setIsEnsuringWallet(false);
        }
      }
    };

    ensureWallet();
  }, [user.hasWallet]);

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setError("");
    setPinError("");
    setProfileVerified(null);
    setProfileId("");
  };

  const handleVariationSelect = (variation: Variation) => {
    setSelectedVariation(variation);
    setError("");
    setPinError("");
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(Math.max(1, value));
    setError("");
    setPinError("");
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setPin(value);
      setPinError("");
    }
  };

  const handleProfileVerified = (data: { customerName: string; status: string }) => {
    setProfileVerified(data);
  };

  // ✅ Reset form for "Buy More" functionality
  const resetForm = () => {
    setSelectedVariation(null);
    setQuantity(1);
    setPin("");
    setError("");
    setPinError("");
    setSuccess(false);
    setTransactionId("");
    setProfileVerified(null);
    setProfileId("");
  };

  const getTotalAmount = () => {
    return (selectedVariation?.price || 0) * quantity;
  };

  const handlePurchase = async () => {
    if (!pin || pin.length < 4) {
      setPinError("Please enter your 4-6 digit transaction PIN");
      return;
    }

    if (!selectedProduct) {
      setError("Please select a product");
      return;
    }

    if (!selectedVariation) {
      setError("Please select a variation");
      return;
    }

    if (requiresProfile && !profileVerified) {
      setError("Please verify your JAMB Profile ID first");
      return;
    }

    const totalAmount = getTotalAmount();
    if (!totalAmount || totalAmount < 100) {
      setError("Please select a valid variation");
      return;
    }

    if (!user.hasWallet) {
      setError("You need a wallet to make purchases");
      return;
    }

    if (user.walletBalance < totalAmount) {
      setError(`Insufficient balance. Your balance is ${formatCurrency(user.walletBalance)}`);
      return;
    }

    // ✅ Show loading modal
    setShowLoadingModal(true);
    setIsLoading(true);
    setError("");
    setSuccess(false);
    setPinError("");

    try {
      const payload: any = {
        serviceId: selectedProduct,
        variationCode: selectedVariation.id,
        amount: totalAmount,
        quantity: quantity,
        phone: user.phone,
        pin: pin,
      };

      if (requiresProfile && profileId) {
        payload.billersCode = profileId;
      }

      console.log(`📚 [EDUCATION] Payload:`, payload);

      const response = await fetch("/api/vendors/education/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // ✅ Close loading modal
      setShowLoadingModal(false);

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Purchase failed");
      }

      setSuccess(true);
      const txId = result.data?.transactionId || result.data?.reference || "";
      setTransactionId(txId);
      setPin("");

      // ✅ Extract PIN details
      const token = result.data?.token || result.data?.purchased_code;
      const tokens = result.data?.tokens || [];
      const cards = result.data?.cards || [];
      
      let pinDetails = "";
      if (cards.length > 0) {
        pinDetails = `${cards[0]?.Serial || ''} - ${cards[0]?.Pin || ''}`;
        if (cards.length > 1) {
          pinDetails += ` (+${cards.length - 1} more)`;
        }
      } else if (tokens.length > 0) {
        pinDetails = tokens[0];
        if (tokens.length > 1) {
          pinDetails += ` (+${tokens.length - 1} more)`;
        }
      } else if (token) {
        pinDetails = token;
      }

      // ✅ Store success data for modal
      setSuccessData({
        transactionId: txId,
        product: currentProduct?.name || "Unknown",
        variation: selectedVariation.name,
        quantity: quantity,
        amount: totalAmount,
        pinDetails: pinDetails || undefined,
      });
      setShowSuccessModal(true);

      // Refresh balance
      const balanceResponse = await fetch("/api/user/balance");
      const balanceData = await balanceResponse.json();
      if (balanceData.success) {
        setUser({
          ...user,
          walletBalance: balanceData.balance,
        });
      }

    } catch (err: any) {
      // ✅ Close loading modal on error
      setShowLoadingModal(false);
      setError(err.message || "Purchase failed. Please try again.");
      setErrorMessage(err.message || "Purchase failed. Please try again.");
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEnsuringWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 mx-auto text-[#1e293b] animate-spin" />
          <p className="mt-4 text-gray-500">Setting up your wallet...</p>
        </div>
      </div>
    );
  }

  const totalAmount = getTotalAmount();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Education Services</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Purchase WAEC, NECO, JAMB and other educational pins instantly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Select Service
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((product) => (
                  <ProductButton
                    key={product.id}
                    product={product}
                    isSelected={selectedProduct === product.id}
                    onClick={() => handleProductSelect(product.id)}
                  />
                ))}
              </div>
            </div>

            {/* JAMB Profile Verification */}
            {selectedProduct === 'jamb' && (
              <ProfileVerification
                profileId={profileId}
                setProfileId={setProfileId}
                variationCode={selectedVariation?.id || ''}
                onVerified={handleProfileVerified}
                onVerifying={setIsVerifyingProfile}
              />
            )}

            {/* Variations */}
            {currentProduct && variations.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Available Options
                    </h2>
                    <p className="text-[10px] text-gray-500">
                      {variations.length} options available
                    </p>
                  </div>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {variations.map((variation) => (
                    <VariationCard
                      key={variation.id}
                      variation={variation}
                      isSelected={selectedVariation?.id === variation.id}
                      onClick={() => handleVariationSelect(variation)}
                      isBestValue={variation.price > 2000 && variation.price < 10000}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Quantity
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-lg font-bold hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  min={1}
                  max={100}
                  className="w-20 text-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-lg font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-lg font-bold hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Product</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                    {currentProduct?.name || "Not selected"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Book className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Variation</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                    {selectedVariation?.name || "Not selected"}
                  </span>
                </div>

                {requiresProfile && profileVerified && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Profile ID</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white text-xs">
                      {profileId} ✅
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Quantity</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {quantity}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Unit Price</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedVariation ? formatCurrency(selectedVariation.price) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Service Fee</span>
                  </div>
                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    {totalAmount > 0 ? formatCurrency(0) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Wallet Balance</span>
                  </div>
                  <span className={`font-medium ${user.walletBalance >= totalAmount ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(user.walletBalance)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 mt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-bold text-[#1e293b] dark:text-white">
                    {totalAmount > 0 ? formatCurrency(totalAmount) : "—"}
                  </span>
                </div>

                {totalAmount > 0 && user.walletBalance < totalAmount && (
                  <div className="mt-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      ⚠️ Insufficient balance. You need {formatCurrency(totalAmount - user.walletBalance)} more.
                    </p>
                  </div>
                )}

                {/* Transaction PIN Input */}
                <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Transaction PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPin ? "text" : "password"}
                      value={pin}
                      onChange={handlePinChange}
                      placeholder="Enter 4-6 digit PIN"
                      maxLength={6}
                      className={`w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border ${
                        pinError ? "border-red-400 ring-2 ring-red-200" : "border-gray-200"
                      } bg-gray-50 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pinError && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {pinError}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Enter your 4-6 digit transaction PIN to confirm this purchase
                  </p>
                </div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={isLoading || !user.hasWallet || totalAmount === 0 || !selectedProduct || !selectedVariation || user.walletBalance < totalAmount || !pin || pin.length < 4 || (requiresProfile && !profileVerified)}
                className="w-full mt-4 rounded-xl bg-[#1e293b] py-4 text-lg font-semibold text-white transition-all hover:bg-[#0f172a] hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1e293b]/20"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="h-5 w-5" />
                    Confirm & Purchase
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </button>

              {requiresProfile && !profileVerified && (
                <p className="text-center text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  ⚠️ Please verify your JAMB Profile ID before purchasing
                </p>
              )}

              {!user.hasWallet && !isEnsuringWallet && (
                <p className="text-center text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                  ⚠️ You need a wallet to make purchases. Creating one...
                </p>
              )}
            </div>

            {/* Quick Tips */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Tips</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Educational pins are delivered instantly
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  PINs are sent via SMS and email
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Multiple quantities can be purchased at once
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Service fee is included in the price
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  WAEC, NECO, and JAMB available
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  JAMB requires Profile ID verification
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Save your PINs for future use
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ LOADING MODAL */}
      <LoadingModal isOpen={showLoadingModal} />

      {/* ✅ SUCCESS MODAL */}
      {successData && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
          }}
          transactionId={successData.transactionId}
          product={successData.product}
          variation={successData.variation}
          quantity={successData.quantity}
          amount={successData.amount}
          pinDetails={successData.pinDetails}
          onBuyMore={resetForm}
        />
      )}

      {/* ✅ ERROR MODAL */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
        }}
        error={errorMessage}
        onRetry={() => {
          handlePurchase();
        }}
      />
    </div>
  );
}