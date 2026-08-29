// app/dashboard/buy/airtime/page.client.tsx - COMPLETE WITH MODAL & NO PHONE VALIDATION

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Sparkles,
  History,
  ChevronDown,
  ChevronUp,
  Star,
  StarOff,
  Users,
  Lock,
  Eye,
  EyeOff,
  Search,
  X,
} from "lucide-react";

interface Network {
  id: string;
  name: string;
  code: string;
  color: string;
  logo: string;
  iconPath: string;
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

interface AirtimeClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
  };
  networks: Network[];
  recommendedAmounts: number[];
  defaultNetwork: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "Never";
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

// ✅ SUCCESS MODAL COMPONENT
const SuccessModal = ({
  isOpen,
  onClose,
  transactionId,
  phoneNumber,
  amount,
  network,
  onBuyMore,
}: {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  phoneNumber: string;
  amount: number;
  network: string;
  onBuyMore?: () => void;
}) => {
  if (!isOpen) return null;

  // Auto-close after 10 seconds
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
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Success Icon with animation */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 animate-bounce">
          <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>

        {/* Title */}
        <h3 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
          Purchase Successful! 🎉
        </h3>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Your airtime has been sent successfully
        </p>

        {/* Transaction Details */}
        <div className="mb-6 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Network</span>
            <span className="font-medium text-gray-900 dark:text-white">{network}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Phone Number</span>
            <span className="font-medium text-gray-900 dark:text-white">{phoneNumber || "Not provided"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
            <span className="font-bold text-green-600 dark:text-green-400">
              ₦{amount.toLocaleString()}
            </span>
          </div>
          {transactionId && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Transaction ID</span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                {transactionId.slice(0, 8)}...{transactionId.slice(-6)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
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
              Buy More Airtime
            </button>
          )}
        </div>

        {/* Auto-close indicator */}
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
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Error Icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h3 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
          Purchase Failed
        </h3>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          We couldn't complete your airtime purchase
        </p>

        {/* Error Details */}
        <div className="mb-6 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>

        {/* Action Buttons */}
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
              // Navigate to support or help
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

// Amount Button
const AmountButton = ({
  amount,
  isSelected,
  onClick,
}: {
  amount: number;
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
        ₦{amount.toLocaleString()}
      </span>
    </button>
  );
};

// Network Button
const NetworkButton = ({
  network,
  isSelected,
  onClick,
  isAutoDetected,
}: {
  network: Network;
  isSelected: boolean;
  onClick: () => void;
  isAutoDetected?: boolean;
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-lg border-2 p-2 transition-all duration-200 relative ${
        isSelected
          ? "border-blue-400 bg-blue-50 text-gray-900 shadow-md dark:border-blue-600 dark:bg-blue-950/40 dark:text-white"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800"
      }`}
    >
      {isAutoDetected && isSelected && (
        <div className="absolute -top-1 -right-1">
          <span className="text-[7px] bg-green-500 text-white px-1 py-0.5 rounded-full">
            Auto
          </span>
        </div>
      )}
      <div className="h-10 w-10">
        {!imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={network.iconPath}
            alt={network.name}
            className="h-10 w-10 object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-base font-bold ${
            isSelected ? "bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}>
            {network.name.charAt(0)}
          </div>
        )}
      </div>
      <span className={`mt-0.5 text-[10px] font-semibold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
        {network.name}
      </span>
      <span className={`text-[8px] ${isSelected ? "text-blue-500/70 dark:text-blue-400/70" : "text-gray-500 dark:text-gray-400"}`}>
        {network.code}
      </span>
      {isSelected && (
        <span className="mt-0.5 text-[7px] bg-green-100 text-green-700 px-1 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">
          Selected
        </span>
      )}
    </button>
  );
};

// Service Detection Component
const ServiceDetection = ({
  phoneNumber,
  detectedNetwork,
}: {
  phoneNumber: string;
  detectedNetwork: string | null;
}) => {
  if (!phoneNumber || phoneNumber.length < 4) return null;

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-950/30">
      <span className="text-xs text-blue-700 dark:text-blue-300">
        {detectedNetwork ? (
          <>📡 <strong>{detectedNetwork}</strong> detected</>
        ) : (
          <>Enter a valid phone number to detect network</>
        )}
      </span>
    </div>
  );
};

export function AirtimeClient({
  user: initialUser,
  networks,
  recommendedAmounts,
  defaultNetwork,
}: AirtimeClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [selectedNetwork, setSelectedNetwork] = useState<string>(defaultNetwork);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [isEnsuringWallet, setIsEnsuringWallet] = useState(false);
  const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");
  
  // ✅ Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    transactionId: string;
    phoneNumber: string;
    amount: number;
    network: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Dropdown states
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedNetworkData = networks.find((n) => n.id === selectedNetwork);

  // Auto-detect network from phone number
  useEffect(() => {
    if (phoneNumber.length >= 4) {
      const detectNetwork = (number: string) => {
        const prefixes: { [key: string]: string } = {
          '070': 'MTN',
          '080': 'MTN',
          '081': 'MTN',
          '090': 'MTN',
          '091': 'MTN',
          '0701': 'AIRTEL',
          '0708': 'AIRTEL',
          '0802': 'AIRTEL',
          '0808': 'AIRTEL',
          '0812': 'AIRTEL',
          '0901': 'AIRTEL',
          '0902': 'AIRTEL',
          '0907': 'AIRTEL',
          '0805': 'GLO',
          '0807': 'GLO',
          '0811': 'GLO',
          '0815': 'GLO',
          '0905': 'GLO',
          '0909': 'GLO',
          '0809': '9MOBILE',
          '0817': '9MOBILE',
          '0818': '9MOBILE',
          '0908': '9MOBILE',
          '0903': '9MOBILE',
          '0904': '9MOBILE',
        };

        const prefix = number.slice(0, 4);
        const shortPrefix = number.slice(0, 3);

        const detected = prefixes[prefix] || prefixes[shortPrefix] || null;
        
        if (detected) {
          const matchedNetwork = networks.find(n => n.name === detected);
          if (matchedNetwork) {
            setDetectedNetwork(detected);
            setSelectedNetwork(matchedNetwork.id);
            return;
          }
        }
        setDetectedNetwork(null);
      };

      detectNetwork(phoneNumber);
    } else {
      setDetectedNetwork(null);
    }
  }, [phoneNumber, networks]);

  // Filter customers when typing
  useEffect(() => {
    if (phoneNumber.length > 0) {
      const filtered = recentCustomers.filter(c => 
        c.phone.includes(phoneNumber) || 
        (c.fullName && c.fullName.toLowerCase().includes(phoneNumber.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(recentCustomers);
    }
  }, [phoneNumber, recentCustomers]);

  // Fetch recent customers
  useEffect(() => {
    const fetchRecentCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await fetch("/api/customers/recent?limit=10");
        const result = await response.json();
        if (result.success) {
          setRecentCustomers(result.data.customers);
          setFilteredCustomers(result.data.customers);
        }
      } catch (error) {
        console.error("Failed to fetch recent customers:", error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchRecentCustomers();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
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

  const handleSelectCustomer = (customer: Customer) => {
    setPhoneNumber(customer.phone);
    setShowDropdown(false);
    setError("");
    setPinError("");
  };

  const handleInputFocus = () => {
    if (filteredCustomers.length > 0) {
      setShowDropdown(true);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setPhoneNumber(value);
    setError("");
    setPinError("");
    if (value.length > 0 && filteredCustomers.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setPin(value);
      setPinError("");
    }
  };

  const getTotalAmount = () => {
    const amount = selectedAmount || parseInt(customAmount);
    return amount || 0;
  };

  // ✅ Reset form for "Buy More" functionality
  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount("");
    setPhoneNumber("");
    setPin("");
    setError("");
    setPinError("");
    setSuccess(false);
    setTransactionId("");
    setSelectedNetwork(defaultNetwork);
    setDetectedNetwork(null);
  };

  const handlePurchase = async () => {
    // Validate PIN
    if (!pin || pin.length < 4) {
      setPinError("Please enter your 4-6 digit transaction PIN");
      return;
    }

    if (!selectedNetwork) {
      setError("Please select a network provider");
      return;
    }

    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount < 50) {
      setError("Please enter a valid amount (minimum ₦50)");
      return;
    }

    // ✅ REMOVED: Phone number validation - now optional
    // if (!phoneNumber || phoneNumber.length < 10) {
    //   setError("Please enter a valid phone number");
    //   return;
    // }

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
      const response = await fetch("/api/vendors/airtime/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber || "", // Send empty string if not provided
          amount: amount,
          network: selectedNetworkData?.code || "MTN",
          pin: pin,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Purchase failed");
      }

      setSuccess(true);
      const txId = result.data?.transactionId || result.data?.reference || "";
      setTransactionId(txId);
      setPin("");

      // Store success data for modal
      setSuccessData({
        transactionId: txId,
        phoneNumber: phoneNumber || "Not provided",
        amount: amount,
        network: selectedNetworkData?.name || "Unknown",
      });
      setShowSuccessModal(true);

      // Refresh user balance
      const balanceResponse = await fetch("/api/user/balance");
      const balanceData = await balanceResponse.json();
      if (balanceData.success) {
        setUser({
          ...user,
          walletBalance: balanceData.balance,
        });
      }

      // Refresh recent customers
      const customersResponse = await fetch("/api/customers/recent?limit=10");
      const customersResult = await customersResponse.json();
      if (customersResult.success) {
        setRecentCustomers(customersResult.data.customers);
        setFilteredCustomers(customersResult.data.customers);
      }

    } catch (err: any) {
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
  const isAutoDetected = detectedNetwork && networks.find(n => n.name === detectedNetwork)?.id === selectedNetwork;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Buy Airtime</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Top up any Nigerian network instantly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Phone Number & Network Provider - SAME CARD with dropdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recipient Details
              </h2>
              
              {/* Phone Number Input with Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    ref={inputRef}
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    onFocus={handleInputFocus}
                    placeholder="Enter phone number or search recent (optional)"
                    maxLength={11}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-3 text-lg font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 flex items-center gap-2">
                    {loadingCustomers && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {phoneNumber.length > 0 && recentCustomers.length > 0 && (
                      <span className="text-[10px] text-blue-500">
                        {filteredCustomers.length} matches
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">(optional)</span>
                    <span>{phoneNumber.length}/11</span>
                  </div>
                </div>

                {/* Dropdown for recent customers */}
                {showDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        Recent Customers ({filteredCustomers.length})
                      </p>
                    </div>
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                            <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {customer.fullName || "Unknown"}
                              </p>
                              {customer.isFavorite && (
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              )}
                              {customer.customerType === "VIP" && (
                                <span className="text-[8px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded dark:bg-purple-900/30 dark:text-purple-400 flex-shrink-0">
                                  VIP
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {customer.phone}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xs font-medium text-gray-900 dark:text-white">
                            {formatCurrency(customer.totalSpent)}
                          </p>
                          <p className="text-[9px] text-gray-400">
                            {customer.totalTransactions} tx
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Service Detection */}
              <ServiceDetection 
                phoneNumber={phoneNumber} 
                detectedNetwork={detectedNetwork} 
              />

              {/* Network Selection */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Network Provider
                  </label>
                  {detectedNetwork && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Auto-detected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {networks.map((network) => (
                    <NetworkButton
                      key={network.id}
                      network={network}
                      isSelected={selectedNetwork === network.id}
                      onClick={() => setSelectedNetwork(network.id)}
                      isAutoDetected={isAutoDetected}
                    />
                  ))}
                </div>
                {!detectedNetwork && phoneNumber.length >= 4 && (
                  <p className="mt-2 text-[10px] text-yellow-600 dark:text-yellow-400">
                    ⚠️ Could not detect network. Please select manually.
                  </p>
                )}
                {!phoneNumber && (
                  <p className="mt-2 text-[10px] text-gray-400">
                    ℹ️ Phone number is optional - you can proceed without it
                  </p>
                )}
              </div>
            </div>

            {/* Amount Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Amount
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                {recommendedAmounts.map((amount) => (
                  <AmountButton
                    key={amount}
                    amount={amount}
                    isSelected={selectedAmount === amount}
                    onClick={() => handleAmountSelect(amount)}
                  />
                ))}
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  ₦
                </div>
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Enter custom amount (min ₦50)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-4 py-3 text-lg font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
              
              <div className="space-y-3 text-sm">
                {/* Phone Number */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Recipient</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {phoneNumber || "Not provided (optional)"}
                  </span>
                </div>

                {/* Network */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    {selectedNetworkData?.iconPath && (
                      <div className="h-6 w-6 relative">
                        <img 
                          src={selectedNetworkData.iconPath} 
                          alt={selectedNetworkData.name}
                          className="h-6 w-6 object-contain"
                        />
                      </div>
                    )}
                    <span className="text-gray-600 dark:text-gray-400">Network</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedNetworkData?.name || "Not selected"}
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
                    <Shield className="h-4 w-4 text-gray-400" />
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

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={isLoading || !user.hasWallet || totalAmount === 0 || user.walletBalance < totalAmount || !pin || pin.length < 4}
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
                  Minimum airtime purchase is ₦50
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Airtime is delivered instantly
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Network auto-detected from phone number
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Search recent customers by name or number
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  VIP and wholesale customers are highlighted
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Phone number is optional - you can proceed without it
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  You'll receive a confirmation SMS
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ SUCCESS MODAL */}
      {successData && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
          }}
          transactionId={successData.transactionId}
          phoneNumber={successData.phoneNumber}
          amount={successData.amount}
          network={successData.network}
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