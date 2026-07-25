// app/dashboard/buy/data/page.client.tsx - UPDATED with inline messages

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
  Sparkles,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronUp,
  Star,
  Layers,
  Tag,
  Gift,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  data: string;
  price: number;
  validity: string;
  planCode: string;
}

interface Category {
  id: string;
  name: string;
  plans: Plan[];
}

interface Provider {
  id: string;
  name: string;
  code: string;
  color: string;
  iconPath: string;
  categories: Category[];
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

interface DataClientProps {
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
  defaultProvider: string;
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

// ✅ Reduced Size Service Detection
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
      <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
      <span className="text-xs text-blue-700 dark:text-blue-300">
        {detectedNetwork ? (
          <>Detected: <strong>{detectedNetwork}</strong></>
        ) : (
          <>Enter a valid phone number to detect network</>
        )}
      </span>
    </div>
  );
};

// ✅ Reduced Size Recent Customers Component
const RecentCustomers = ({
  customers,
  onSelect,
  isLoading,
}: {
  customers: Customer[];
  onSelect: (phone: string) => void;
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

  if (!customers || customers.length === 0) {
    return (
      <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
        No recent customers yet.
      </div>
    );
  }

  const displayCustomers = isExpanded ? customers : customers.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Recent Customers
          </span>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
            {customers.length}
          </span>
        </div>
        {customers.length > 3 && (
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
        {displayCustomers.map((customer) => (
          <button
            key={customer.id}
            onClick={() => onSelect(customer.phone)}
            className="w-full flex items-center justify-between rounded-lg border border-gray-100 p-2 text-left transition-all hover:bg-gray-50 hover:border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:border-gray-600 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {customer.fullName || "Unknown"}
                </p>
                {customer.isFavorite && (
                  <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                )}
                {customer.customerType === "VIP" && (
                  <span className="text-[8px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded dark:bg-purple-900/30 dark:text-purple-400">
                    VIP
                  </span>
                )}
                {customer.customerType === "WHOLESALE" && (
                  <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">
                    Bulk
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {customer.phone}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-xs font-medium text-gray-900 dark:text-white">
                {formatCurrency(customer.totalSpent)}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {customer.totalTransactions} tx • {formatDate(customer.lastTransactionAt)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ✅ SMALLER Provider Button - Reduced size
const ProviderButton = ({
  provider,
  isSelected,
  onClick,
  isAutoDetected,
}: {
  provider: Provider;
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
        {!imageError && provider.iconPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={provider.iconPath}
            alt={provider.name}
            className="h-10 w-10 object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-base font-bold ${
            isSelected ? "bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}>
            {provider.name.charAt(0)}
          </div>
        )}
      </div>
      <span className={`mt-0.5 text-[10px] font-semibold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
        {provider.name}
      </span>
      <span className={`text-[8px] ${isSelected ? "text-blue-500/70 dark:text-blue-400/70" : "text-gray-500 dark:text-gray-400"}`}>
        {provider.code}
      </span>
      {isSelected && (
        <span className="mt-0.5 text-[7px] bg-green-100 text-green-700 px-1 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">
          Selected
        </span>
      )}
    </button>
  );
};

// ✅ Clickable Category Tags (Text-based, no border/padding heavy)
const CategoryTag = ({
  category,
  isSelected,
  onClick,
  planCount,
}: {
  category: Category;
  isSelected: boolean;
  onClick: () => void;
  planCount: number;
}) => {
  const getColor = (name: string, selected: boolean) => {
    if (selected) return "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40";
    if (name === "SME") return "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30";
    if (name === "GIFTING") return "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30";
    if (name === "COOPERATE GIFTING") return "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30";
    return "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800";
  };

  const getIcon = (name: string) => {
    if (name === "SME") return <Tag className="h-3 w-3" />;
    if (name === "GIFTING") return <Gift className="h-3 w-3" />;
    if (name === "COOPERATE GIFTING") return <Layers className="h-3 w-3" />;
    return <Tag className="h-3 w-3" />;
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
        isSelected
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ring-1 ring-blue-400 dark:ring-blue-600"
          : `${getColor(category.name, false)} hover:bg-opacity-50`
      }`}
    >
      {getIcon(category.name)}
      <span>{category.name}</span>
      <span className={`text-[10px] ${isSelected ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
        ({planCount})
      </span>
    </button>
  );
};

// ✅ Reduced Size Plan Card - More compact
const PlanCard = ({
  plan,
  isSelected,
  onClick,
}: {
  plan: Plan;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-lg border-2 p-2.5 text-left transition-all duration-200 ${
        isSelected
          ? "border-blue-500 bg-blue-500 text-white shadow-md scale-[1.02]"
          : "border-gray-200 bg-white hover:border-[#1e293b]/30 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      {isSelected && (
        <div className="absolute right-1.5 top-1.5">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
            {plan.data}
          </h4>
          <p className={`text-[10px] truncate ${isSelected ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
            {plan.name}
          </p>
        </div>
        <div className={`text-right ml-2 flex-shrink-0 ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
          <p className="text-sm font-bold">{formatCurrency(plan.price)}</p>
          <p className={`text-[9px] ${isSelected ? "text-white/70" : "text-gray-400"}`}>
            {plan.validity}
          </p>
        </div>
      </div>
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
              Data purchase successful! 🎉
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

export function DataClient({
  user: initialUser,
  providers,
  defaultProvider,
}: DataClientProps) {
  const [user, setUser] = useState(initialUser);
  const [selectedProvider, setSelectedProvider] = useState<string>(defaultProvider);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [transactionData, setTransactionData] = useState<{
    amount: number;
    phoneNumber: string;
    provider: string;
    plan: string;
  } | null>(null);
  const [isEnsuringWallet, setIsEnsuringWallet] = useState(false);
  const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");

  const currentProvider = providers.find((p) => p.id === selectedProvider);
  const currentCategory = currentProvider?.categories.find(c => c.id === selectedCategory);
  const plans = currentCategory?.plans || [];

  // Auto-select first category when provider changes
  useEffect(() => {
    if (currentProvider && currentProvider.categories.length > 0) {
      const firstCategory = currentProvider.categories[0];
      const categoryExists = currentProvider.categories.some(c => c.id === selectedCategory);
      if (!categoryExists) {
        setSelectedCategory(firstCategory.id);
        setSelectedPlan(null);
      }
    }
  }, [selectedProvider, currentProvider]);

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
          const matchedProvider = providers.find(p => p.name === detected);
          if (matchedProvider) {
            setDetectedNetwork(detected);
            setSelectedProvider(matchedProvider.id);
            setSelectedPlan(null);
            return;
          }
        }
        setDetectedNetwork(null);
      };

      detectNetwork(phoneNumber);
    } else {
      setDetectedNetwork(null);
    }
  }, [phoneNumber, providers]);

  // Fetch recent customers
  useEffect(() => {
    const fetchRecentCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await fetch("/api/customers/recent?limit=5");
        const result = await response.json();
        if (result.success) {
          setRecentCustomers(result.data.customers);
        }
      } catch (error) {
        console.error("Failed to fetch recent customers:", error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchRecentCustomers();
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
    setSelectedPlan(null);
    setError("");
    setPinError("");
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedPlan(null);
    setError("");
    setPinError("");
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setError("");
    setPinError("");
  };

  const handleSelectCustomer = (phone: string) => {
    setPhoneNumber(phone);
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

  // ✅ Reset form - keeps selected provider and category
  const resetForm = () => {
    setSelectedPlan(null);
    setPhoneNumber("");
    setPin("");
    setError("");
    setSuccess(false);
    setTransactionId("");
    setTransactionData(null);
    setPinError("");
  };

  const handlePurchase = async () => {
    // Validate PIN
    if (!pin || pin.length < 4) {
      setPinError("Please enter your 4-6 digit transaction PIN");
      return;
    }

    if (!selectedProvider) {
      setError("Please select a network provider");
      return;
    }

    if (!selectedCategory) {
      setError("Please select a category");
      return;
    }

    if (!selectedPlan) {
      setError("Please select a data plan");
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    if (!user.hasWallet) {
      setError("You need a wallet to make purchases");
      return;
    }

    if (user.walletBalance < selectedPlan.price) {
      setError(`Insufficient balance. Your balance is ${formatCurrency(user.walletBalance)}`);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(false);
    setPinError("");

    try {
      const response = await fetch("/api/vendors/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          planCode: selectedPlan.planCode,
          provider: currentProvider?.code || "MTN",
          amount: selectedPlan.price,
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
        amount: selectedPlan.price,
        phoneNumber: phoneNumber,
        provider: currentProvider?.name || "MTN",
        plan: selectedPlan.data,
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

      // Refresh recent customers
      const customersResponse = await fetch("/api/customers/recent?limit=5");
      const customersResult = await customersResponse.json();
      if (customersResult.success) {
        setRecentCustomers(customersResult.data.customers);
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

  const isAutoDetected = detectedNetwork && providers.find(p => p.name === detectedNetwork)?.id === selectedProvider;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Buy Data</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Get the best data bundles from all networks
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Customers - Reduced size */}
            {recentCustomers.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <RecentCustomers
                  customers={recentCustomers}
                  onSelect={handleSelectCustomer}
                  isLoading={loadingCustomers}
                />
              </div>
            )}

            {/* ✅ Phone Number Input - MOVED FIRST */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recipient Phone Number
              </h2>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="08012345678"
                  maxLength={11}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-3 text-lg font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {phoneNumber.length}/11
                </div>
              </div>
              
              {/* Service Detection */}
              <ServiceDetection 
                phoneNumber={phoneNumber} 
                detectedNetwork={detectedNetwork} 
              />

              {/* Customer Info if exists */}
              {phoneNumber.length >= 10 && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-gray-800">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {recentCustomers.find(c => c.phone === phoneNumber)?.fullName 
                      ? `Customer: ${recentCustomers.find(c => c.phone === phoneNumber)?.fullName}`
                      : "New customer - will be saved automatically"
                    }
                  </span>
                </div>
              )}
            </div>

            {/* ✅ Network Provider Selection - REDUCED SIZE */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Network Provider
              </h2>
              {detectedNetwork ? (
                <div className="mb-2 rounded-lg bg-green-50 px-3 py-1.5 dark:bg-green-950/30">
                  <p className="text-xs text-green-700 dark:text-green-400">
                    ✅ Auto-detected: <strong>{detectedNetwork}</strong>
                  </p>
                  <p className="text-[10px] text-green-600 dark:text-green-400/80">
                    You can still manually select a different network below
                  </p>
                </div>
              ) : (
                <p className="mb-2 text-[10px] text-gray-500 dark:text-gray-400">
                  Enter a phone number above to auto-detect the network, or select manually
                </p>
              )}
              <div className="grid grid-cols-4 gap-1.5">
                {providers.map((provider) => (
                  <ProviderButton
                    key={provider.id}
                    provider={provider}
                    isSelected={selectedProvider === provider.id}
                    onClick={() => handleProviderSelect(provider.id)}
                    isAutoDetected={isAutoDetected}
                  />
                ))}
              </div>
            </div>

            {/* ✅ Categories - Clickable Tags (Text-based) */}
            {currentProvider && currentProvider.categories.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Categories
                  </h2>
                  <span className="text-[10px] text-gray-500">
                    {currentProvider.categories.length} available
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentProvider.categories.map((category) => (
                    <CategoryTag
                      key={category.id}
                      category={category}
                      isSelected={selectedCategory === category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      planCount={category.plans.length}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ✅ Data Plans - Compact Grid */}
            {currentCategory && plans.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {currentCategory.name} Plans
                  </h2>
                  <span className="text-[10px] text-gray-500">
                    {plans.length} plans
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isSelected={selectedPlan?.id === plan.id}
                      onClick={() => handlePlanSelect(plan)}
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
                  {/* Phone Number - First */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Recipient</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {phoneNumber || "Not entered"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      {currentProvider?.iconPath && (
                        <div className="h-6 w-6 relative">
                          <img 
                            src={currentProvider.iconPath} 
                            alt={currentProvider.name}
                            className="h-6 w-6 object-contain"
                          />
                        </div>
                      )}
                      <span className="text-gray-600 dark:text-gray-400">Network</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentProvider?.name || "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Category</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentCategory?.name || "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Plan</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPlan?.data || "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Validity</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPlan?.validity || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Service Fee</span>
                    </div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      {selectedPlan ? formatCurrency(0) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Wallet Balance</span>
                    </div>
                    <span className={`font-medium ${user.walletBalance >= (selectedPlan?.price || 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(user.walletBalance)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 mt-2">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-xl font-bold text-[#1e293b] dark:text-white">
                      {selectedPlan ? formatCurrency(selectedPlan.price) : "—"}
                    </span>
                  </div>

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

                  {selectedPlan && user.walletBalance < selectedPlan.price && (
                    <div className="mt-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        ⚠️ Insufficient balance. You need {formatCurrency(selectedPlan.price - user.walletBalance)} more.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handlePurchase}
                disabled={isLoading || !user.hasWallet || !selectedPlan || !selectedCategory || user.walletBalance < (selectedPlan?.price || 0) || !pin || pin.length < 4}
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
                  Data is delivered instantly
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Network auto-detected from phone number
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Click categories to filter plans
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Plans vary by network and category
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Recent customers saved for quick access
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Transaction PIN required for security
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}