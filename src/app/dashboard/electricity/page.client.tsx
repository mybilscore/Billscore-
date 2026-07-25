// app/dashboard/buy/electricity/page.client.tsx - UPDATED

"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  Wifi,
  Zap,
  Tv,
  Check,
  ArrowRight,
  AlertCircle,
  Loader2,
  User,
  CreditCard,
  Clock,
  Shield,
  Lightbulb,
  MapPin,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronUp,
  Star,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface DisCo {
  id: string;
  name: string;
  code: string;
  region: string;
  logo: string;
  color: string;
  meterTypes: string[];
  discoId: number;
}

interface SavedMeter {
  id: string;
  meterNumber: string;
  disco: string;
  name: string | null;
  meterType: string;
  isDefault: boolean;
  createdAt: string;
}

interface Customer {
  id: string;
  phone: string;
  fullName: string | null;
  totalTransactions: number;
  totalSpent: number;
  lastTransactionAt: string | null;
  firstTransactionAt: string;
  customerType: string;
  isFavorite: boolean;
}

interface ElectricityClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
  };
  discos: DisCo[];
  recommendedAmounts: { label: string; value: number }[];
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
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

// ✅ Reduced Size Recent Meters Component
const RecentMeters = ({
  meters,
  onSelect,
  isLoading,
}: {
  meters: SavedMeter[];
  onSelect: (meterNumber: string, disco: string, meterType: string) => void;
  isLoading: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!meters || meters.length === 0) {
    return (
      <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
        No saved meters yet. Add one by making a purchase!
      </div>
    );
  }

  const displayMeters = isExpanded ? meters : meters.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Saved Meters
          </span>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
            {meters.length}
          </span>
        </div>
        {meters.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-0.5"
          >
            {isExpanded ? (
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

      <div className="space-y-1.5">
        {displayMeters.map((meter) => (
          <button
            key={meter.id}
            onClick={() => onSelect(meter.meterNumber, meter.disco, meter.meterType)}
            className="w-full flex items-center justify-between rounded-lg border border-gray-100 p-2 text-left transition-all hover:bg-gray-50 hover:border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:border-gray-600 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {meter.name || `${meter.disco} Meter`}
                </p>
                {meter.isDefault && (
                  <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                )}
                <span className="text-[8px] bg-gray-100 text-gray-700 px-1 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                  {meter.disco}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {meter.meterNumber}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-[10px] text-gray-400">
                {meter.meterType}
              </p>
              <p className="text-[9px] text-gray-400">
                {formatDate(meter.createdAt)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ✅ Reduced Size DisCo Button
const DisCoButton = ({
  disco,
  isSelected,
  onClick,
}: {
  disco: DisCo;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-lg border-2 p-2.5 transition-all duration-200 ${
        isSelected
          ? "border-blue-400 bg-blue-50 text-gray-900 shadow-md dark:border-blue-600 dark:bg-blue-950/40 dark:text-white"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800"
      }`}
    >
      <div className="h-10 w-10 rounded-full flex items-center justify-center text-2xl">
        {disco.logo}
      </div>
      <span className={`mt-0.5 text-[10px] font-semibold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
        {disco.code}
      </span>
      <span className={`text-[8px] ${isSelected ? "text-blue-500/70 dark:text-blue-400/70" : "text-gray-500 dark:text-gray-400"}`}>
        {disco.region}
      </span>
      {isSelected && (
        <span className="mt-0.5 text-[7px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">
          Selected
        </span>
      )}
    </button>
  );
};

// ✅ Reduced Size Amount Button
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
      <span className={`text-sm font-bold ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
        {amount.label}
      </span>
    </button>
  );
};

// ✅ Status Message Component - Inline like Airtime
const StatusMessage = ({ 
  error, 
  success, 
  transactionId 
}: { 
  error: string; 
  success: boolean; 
  transactionId: string;
}) => {
  if (!error && !success) return null;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-900/20 mb-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900/30 dark:bg-green-900/20 mb-3">
        <div className="flex items-start gap-2">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-green-700 dark:text-green-400">
              Electricity token purchased successfully! 🎉
            </p>
            {transactionId && (
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                ID: {transactionId}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export function ElectricityClient({
  user: initialUser,
  discos,
  recommendedAmounts,
}: ElectricityClientProps) {
  const [user, setUser] = useState(initialUser);
  const [selectedDisco, setSelectedDisco] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [meterNumber, setMeterNumber] = useState<string>("");
  const [meterType, setMeterType] = useState<string>("Prepaid");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [transactionData, setTransactionData] = useState<{
    amount: number;
    meterNumber: string;
    disco: string;
    token?: string;
  } | null>(null);
  const [isEnsuringWallet, setIsEnsuringWallet] = useState(false);
  const [savedMeters, setSavedMeters] = useState<SavedMeter[]>([]);
  const [loadingMeters, setLoadingMeters] = useState(false);
  
  // ✅ PIN state
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");

  const currentDisco = discos.find((d) => d.id === selectedDisco);

  // Fetch saved meters
  useEffect(() => {
    const fetchSavedMeters = async () => {
      setLoadingMeters(true);
      try {
        const response = await fetch("/api/saved-meters");
        const result = await response.json();
        if (result.success) {
          setSavedMeters(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch saved meters:", error);
      } finally {
        setLoadingMeters(false);
      }
    };

    fetchSavedMeters();
  }, []);

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

  const handleAmountSelect = (value: number) => {
    setSelectedAmount(value);
    setCustomAmount("");
    setError("");
    setPinError("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
    setError("");
    setPinError("");
  };

  const handleSelectMeter = (meterNumber: string, disco: string, meterType: string) => {
    setMeterNumber(meterNumber);
    setSelectedDisco(discos.find(d => d.code === disco)?.id || "");
    setMeterType(meterType);
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

  // ✅ Reset form - keeps selected disco and meter type
  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount("");
    setMeterNumber("");
    setError("");
    setSuccess(false);
    setTransactionId("");
    setTransactionData(null);
    setPin("");
    setPinError("");
  };

  const getTotalAmount = () => {
    const amount = selectedAmount || parseInt(customAmount);
    return amount || 0;
  };

  const handlePurchase = async () => {
    // ✅ Validate PIN
    if (!pin || pin.length < 4) {
      setPinError("Please enter your 4-6 digit transaction PIN");
      return;
    }

    if (!selectedDisco) {
      setError("Please select a DisCo");
      return;
    }

    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount < 100) {
      setError("Please enter a valid amount (minimum ₦100)");
      return;
    }

    if (!meterNumber || meterNumber.length < 7) {
      setError("Please enter a valid meter number (minimum 7 digits)");
      return;
    }

    if (!user.hasWallet) {
      setError("You need a wallet to make purchases");
      return;
    }

    if (user.walletBalance < amount) {
      setError(`Insufficient balance. Your balance is ${formatCurrency(user.walletBalance)}`);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(false);
    setPinError("");

    try {
      const response = await fetch("/api/vendors/electricity/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meterNumber: meterNumber,
          meterType: meterType.toLowerCase(),
          amount: amount,
          discoCode: currentDisco?.code || "IKEJA",
          discoId: currentDisco?.discoId || 1,
          phone: user.phone,
          pin: pin,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Purchase failed");
      }

      setSuccess(true);
      setTransactionId(result.data?.transactionId || result.data?.reference);
      setTransactionData({
        amount: amount,
        meterNumber: meterNumber,
        disco: currentDisco?.name || "Unknown",
        token: result.data?.token,
      });
      setPin("");

      // Refresh user balance
      const balanceResponse = await fetch("/api/user/balance");
      const balanceData = await balanceResponse.json();
      if (balanceData.success) {
        setUser({
          ...user,
          walletBalance: balanceData.balance,
        });
      }

      // Refresh saved meters
      const metersResponse = await fetch("/api/saved-meters");
      const metersResult = await metersResponse.json();
      if (metersResult.success) {
        setSavedMeters(metersResult.data);
      }

      // ✅ Auto-clear success after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);

    } catch (err: any) {
      setError(err.message || "Purchase failed. Please try again.");
      setTimeout(() => {
        setError("");
      }, 5000);
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
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Buy Electricity</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Purchase electricity tokens for any DisCo in Nigeria
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Saved Meters - replaces Recent Customers */}
            {savedMeters.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <RecentMeters
                  meters={savedMeters}
                  onSelect={handleSelectMeter}
                  isLoading={loadingMeters}
                />
              </div>
            )}

            {/* DisCo Selection - Reduced size */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Select Distribution Company (DisCo)
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                {discos.map((disco) => (
                  <DisCoButton
                    key={disco.id}
                    disco={disco}
                    isSelected={selectedDisco === disco.id}
                    onClick={() => setSelectedDisco(disco.id)}
                  />
                ))}
              </div>
              {currentDisco && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3 w-3" />
                  <span>Region: {currentDisco.region}</span>
                  <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                  <span>Meter Types: {currentDisco.meterTypes.join(", ")}</span>
                </div>
              )}
            </div>

            {/* Meter Number - Reduced size */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Meter Number
              </h2>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={meterNumber}
                  onChange={(e) => setMeterNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Enter your meter number"
                  maxLength={15}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                  {meterNumber.length}/15
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-500">
                <span>Format: 12345678901</span>
                <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                <span>Minimum 7 digits</span>
              </div>
            </div>

            {/* Meter Type - Reduced size */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Meter Type
              </h2>
              <div className="flex gap-2">
                {["Prepaid", "Postpaid"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setMeterType(type)}
                    className={`flex-1 rounded-lg border-2 p-2.5 text-center transition-all duration-200 ${
                      meterType === type
                        ? "border-blue-500 bg-blue-500 text-white shadow-md"
                        : "border-gray-200 bg-white hover:border-[#1e293b]/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${meterType === type ? "text-white" : "text-gray-900 dark:text-white"}`}>
                      {type}
                    </span>
                    <p className={`text-[10px] ${meterType === type ? "text-white/70" : "text-gray-500 dark:text-gray-400"}`}>
                      {type === "Prepaid" ? "Vend tokens instantly" : "Pay after consumption"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Selection - Reduced size */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Select Amount
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
                {recommendedAmounts.map((amount) => (
                  <AmountButton
                    key={amount.value}
                    amount={amount}
                    isSelected={selectedAmount === amount.value}
                    onClick={() => handleAmountSelect(amount.value)}
                  />
                ))}
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                  ₦
                </div>
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Enter custom amount (min ₦100)"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-7 pr-3 py-2 text-sm font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Sidebar - Order Summary and Wallet Info */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h3>
              
              {/* ✅ Status Messages - Inline */}
              <StatusMessage 
                error={error} 
                success={success} 
                transactionId={transactionId} 
              />

              {!error && !success && (
                <div className="space-y-3 text-sm">
                  {/* DisCo */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">DisCo</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentDisco?.code || "Not selected"}
                    </span>
                  </div>

                  {/* Meter Type */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Meter Type</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {meterType}
                    </span>
                  </div>

                  {/* Meter Number */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Meter Number</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {meterNumber || "Not entered"}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Amount</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {totalAmount > 0 ? formatCurrency(totalAmount) : "Not selected"}
                    </span>
                  </div>

                  {/* Service Fee */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Service Fee</span>
                    </div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      {totalAmount > 0 ? formatCurrency(0) : "—"}
                    </span>
                  </div>

                  {/* Wallet Balance */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Wallet Balance</span>
                    </div>
                    <span className={`font-medium ${user.walletBalance >= totalAmount ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(user.walletBalance)}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between py-3 mt-2">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-xl font-bold text-[#1e293b] dark:text-white">
                      {totalAmount > 0 ? formatCurrency(totalAmount) : "—"}
                    </span>
                  </div>

                  {/* Balance Warning */}
                  {totalAmount > 0 && user.walletBalance < totalAmount && (
                    <div className="mt-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        ⚠️ Insufficient balance. You need {formatCurrency(totalAmount - user.walletBalance)} more.
                      </p>
                    </div>
                  )}

                  {/* ✅ Transaction PIN Input */}
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
              )}

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={isLoading || !user.hasWallet || totalAmount === 0 || !selectedDisco || user.walletBalance < totalAmount || !pin || pin.length < 4}
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
                    Confirm & Buy
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </button>

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
                  Token is delivered instantly via SMS
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Minimum purchase is ₦100
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Service fee is included in the price
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Tokens valid for 30 days
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  You'll receive token via SMS and email
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Saved meters for quick access
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}