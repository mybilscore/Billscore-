// app/dashboard/buy/cable/page.client.tsx - UPDATED to match Airtime pattern

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
  Radio,
  Users,
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

interface Package {
  id: string;
  name: string;
  price: number;
  channels: string;
  validity: string;
  packageCode: string;
}

interface Provider {
  id: string;
  name: string;
  logo: string;
  color: string;
  packages: Package[];
}

interface SavedDecoder {
  id: string;
  decoderNumber: string;
  provider: string;
  name: string | null;
  package: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface CableClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
  };
  providers: Provider[];
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

// ✅ Recent Decoders Component
const RecentDecoders = ({
  decoders,
  onSelect,
  isLoading,
}: {
  decoders: SavedDecoder[];
  onSelect: (decoderNumber: string) => void;
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

  if (!decoders || decoders.length === 0) {
    return (
      <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
        No saved decoders yet. Add one by making a purchase!
      </div>
    );
  }

  const displayDecoders = isExpanded ? decoders : decoders.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Saved Decoders
          </span>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
            {decoders.length}
          </span>
        </div>
        {decoders.length > 3 && (
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
        {displayDecoders.map((decoder) => (
          <button
            key={decoder.id}
            onClick={() => onSelect(decoder.decoderNumber)}
            className="w-full flex items-center justify-between rounded-lg border border-gray-100 p-2 text-left transition-all hover:bg-gray-50 hover:border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:border-gray-600 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {decoder.name || `${decoder.provider} Decoder`}
                </p>
                {decoder.isDefault && (
                  <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                )}
                <span className="text-[8px] bg-gray-100 text-gray-700 px-1 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                  {decoder.provider}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {decoder.decoderNumber}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              {decoder.package && (
                <p className="text-[10px] font-medium text-gray-900 dark:text-white">
                  {decoder.package}
                </p>
              )}
              <p className="text-[9px] text-gray-400">
                {formatDate(decoder.createdAt)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ✅ Reduced Size Provider Button
const ProviderButton = ({
  provider,
  isSelected,
  onClick,
}: {
  provider: Provider;
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
        {provider.logo}
      </div>
      <span className={`mt-0.5 text-[10px] font-semibold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
        {provider.name}
      </span>
      {isSelected && (
        <span className="mt-0.5 text-[7px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">
          Selected
        </span>
      )}
    </button>
  );
};

// ✅ Reduced Size Package Card
const PackageCard = ({
  pkg,
  isSelected,
  onClick,
}: {
  pkg: Package;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-lg border-2 p-3 text-left transition-all duration-200 ${
        isSelected
          ? "border-blue-500 bg-blue-500 text-white shadow-md scale-[1.02]"
          : "border-gray-200 bg-white hover:border-[#1e293b]/30 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      {isSelected && (
        <div className="absolute right-2 top-2">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
            {pkg.name}
          </h4>
          <div className={`mt-0.5 flex items-center gap-2 text-[10px] ${isSelected ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
            <span className="flex items-center gap-0.5">
              <Radio className="h-3 w-3" />
              {pkg.channels}
            </span>
            <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {pkg.validity}
            </span>
          </div>
        </div>
        <div className={`text-right ml-2 flex-shrink-0 ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
          <p className="text-base font-bold">{formatCurrency(pkg.price)}</p>
        </div>
      </div>
    </button>
  );
};

// ✅ Status Message Component - Same as Airtime
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
              Subscription successful! 🎉
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

export function CableClient({
  user: initialUser,
  providers,
}: CableClientProps) {
  const [user, setUser] = useState(initialUser);
  const [selectedProvider, setSelectedProvider] = useState<string>("dstv");
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [smartCardNumber, setSmartCardNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [transactionData, setTransactionData] = useState<{
    amount: number;
    smartCardNumber: string;
    provider: string;
    packageName: string;
  } | null>(null);
  const [isEnsuringWallet, setIsEnsuringWallet] = useState(false);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);
  const [savedDecoders, setSavedDecoders] = useState<SavedDecoder[]>([]);
  const [loadingDecoders, setLoadingDecoders] = useState(false);
  
  // ✅ PIN state
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");

  const currentProvider = providers.find((p) => p.id === selectedProvider);
  const packages = currentProvider?.packages || [];

  // Auto-select first package when provider changes
  useEffect(() => {
    if (currentProvider && currentProvider.packages.length > 0) {
      setSelectedPackage(currentProvider.packages[0]);
    }
  }, [selectedProvider]);

  // Fetch saved decoders
  useEffect(() => {
    const fetchSavedDecoders = async () => {
      setLoadingDecoders(true);
      try {
        const response = await fetch("/api/saved-decoders");
        const result = await response.json();
        if (result.success) {
          setSavedDecoders(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch saved decoders:", error);
      } finally {
        setLoadingDecoders(false);
      }
    };

    fetchSavedDecoders();
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

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    const newProvider = providers.find((p) => p.id === providerId);
    if (newProvider && newProvider.packages.length > 0) {
      setSelectedPackage(newProvider.packages[0]);
    }
    setError("");
    setPinError("");
  };

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setError("");
    setPinError("");
  };

  const handleSmartCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setSmartCardNumber(value);
    if (value.length >= 10) {
      setShowCustomerLookup(true);
    } else {
      setShowCustomerLookup(false);
      setCustomerName("");
    }
    setError("");
    setPinError("");
  };

  const handleSelectDecoder = (decoderNumber: string) => {
    setSmartCardNumber(decoderNumber);
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

  // ✅ Reset form - keeps selected package and provider
  const resetForm = () => {
    setSmartCardNumber("");
    setCustomerName("");
    setError("");
    setSuccess(false);
    setTransactionId("");
    setTransactionData(null);
    setShowCustomerLookup(false);
    setPin("");
    setPinError("");
  };

  const handlePurchase = async () => {
    // Validate PIN
    if (!pin || pin.length < 4) {
      setPinError("Please enter your 4-6 digit transaction PIN");
      return;
    }

    if (!selectedProvider) {
      setError("Please select a cable provider");
      return;
    }

    if (!selectedPackage) {
      setError("Please select a subscription package");
      return;
    }

    if (!smartCardNumber || smartCardNumber.length < 10) {
      setError("Please enter a valid smart card number");
      return;
    }

    if (!user.hasWallet) {
      setError("You need a wallet to make purchases");
      return;
    }

    if (user.walletBalance < selectedPackage.price) {
      setError(`Insufficient balance. Your balance is ${formatCurrency(user.walletBalance)}`);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(false);
    setPinError("");

    try {
      const response = await fetch("/api/vendors/cable/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smartCardNumber: smartCardNumber,
          packageCode: selectedPackage.packageCode,
          provider: currentProvider?.name || "DSTV",
          amount: selectedPackage.price,
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
        amount: selectedPackage.price,
        smartCardNumber: smartCardNumber,
        provider: currentProvider?.name || "DSTV",
        packageName: selectedPackage.name,
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

      // Refresh saved decoders
      const decodersResponse = await fetch("/api/saved-decoders");
      const decodersResult = await decodersResponse.json();
      if (decodersResult.success) {
        setSavedDecoders(decodersResult.data);
      }

      // ✅ Auto-clear success after 5 seconds (like Airtime)
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Cable TV Subscription</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Subscribe to DSTV, GOTV, or Startimes instantly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Saved Decoders */}
            {savedDecoders.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <RecentDecoders
                  decoders={savedDecoders}
                  onSelect={handleSelectDecoder}
                  isLoading={loadingDecoders}
                />
              </div>
            )}

            {/* Provider Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Select Cable Provider
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {providers.map((provider) => (
                  <ProviderButton
                    key={provider.id}
                    provider={provider}
                    isSelected={selectedProvider === provider.id}
                    onClick={() => handleProviderSelect(provider.id)}
                  />
                ))}
              </div>
            </div>

            {/* Smart Card Number */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Smart Card Number
              </h2>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Radio className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={smartCardNumber}
                  onChange={handleSmartCardChange}
                  placeholder="Enter your smart card number"
                  maxLength={15}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                  {smartCardNumber.length}/15
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-500">
                <span>Format: 1234567890</span>
                <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                <span>Minimum 10 digits</span>
              </div>
            </div>

            {/* Customer Lookup */}
            {showCustomerLookup && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-2.5 dark:border-green-900/30 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">
                      Customer Found
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300">
                      {customerName || "Loading..."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Available Packages */}
            {currentProvider && packages.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {currentProvider.name} Packages
                  </h2>
                  <span className="text-[10px] text-gray-500">
                    {packages.length} packages
                  </span>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {packages.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      isSelected={selectedPackage?.id === pkg.id}
                      onClick={() => handlePackageSelect(pkg)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary and Wallet Info */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h3>
              
              {/* ✅ Status Messages - Inline like Airtime */}
              <StatusMessage 
                error={error} 
                success={success} 
                transactionId={transactionId} 
              />

              {!error && !success && (
                <div className="space-y-3 text-sm">
                  {/* Provider */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Provider</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentProvider?.name || "Not selected"}
                    </span>
                  </div>

                  {/* Package */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Tv className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Package</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPackage?.name || "Not selected"}
                    </span>
                  </div>

                  {/* Channels */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Channels</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPackage?.channels || "—"}
                    </span>
                  </div>

                  {/* Validity */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Validity</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPackage?.validity || "—"}
                    </span>
                  </div>

                  {/* Smart Card */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Smart Card</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {smartCardNumber || "Not entered"}
                    </span>
                  </div>

                  {/* Service Fee */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Service Fee</span>
                    </div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      {selectedPackage ? formatCurrency(0) : "—"}
                    </span>
                  </div>

                  {/* Wallet Balance */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Wallet Balance</span>
                    </div>
                    <span className={`font-medium ${user.walletBalance >= (selectedPackage?.price || 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(user.walletBalance)}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between py-3 mt-2">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-xl font-bold text-[#1e293b] dark:text-white">
                      {selectedPackage ? formatCurrency(selectedPackage.price) : "—"}
                    </span>
                  </div>

                  {/* Balance Warning */}
                  {selectedPackage && user.walletBalance < selectedPackage.price && (
                    <div className="mt-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        ⚠️ Insufficient balance. You need {formatCurrency(selectedPackage.price - user.walletBalance)} more.
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
                disabled={isLoading || !user.hasWallet || !selectedPackage || !smartCardNumber || user.walletBalance < (selectedPackage?.price || 0) || !pin || pin.length < 4}
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
                    Confirm & Subscribe
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
                  Subscription activates instantly
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Valid for 30 days from purchase
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Service fee is included in the price
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  You'll receive confirmation via SMS
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Smart card number is required
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Saved decoders for quick access
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}