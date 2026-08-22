// app/dashboard/buy/data/page.client.tsx - COMPLETE FIXED
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
  ShoppingBag,
  History,
  ChevronDown,
  ChevronUp,
  Star,
  Tag,
  Gift,
  Lock,
  Eye,
  EyeOff,
  Layers,
  Search,
  Calendar,
  Briefcase,
  Sun,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  CalendarClock,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  data: string;
  price: number;
  validity: string;
  planCode: string;
  vendorPrice?: number;
  description?: string;
  amountMB?: number;
  planType?: string;
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

interface NetworkInfo {
  id: string;
  name: string;
  code: string;
  color: string;
  logo: string;
  network: string;
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
  vendorInfo?: {
    id: string;
    name: string;
    code: string;
  } | null;
  networks?: NetworkInfo[];
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

// ✅ Detect network from phone number
const detectNetworkFromPhone = (phone: string, networks: NetworkInfo[] = []) => {
  if (!phone || phone.length < 4) return null;

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
    '0809': 'NINEMOBILE',
    '0817': 'NINEMOBILE',
    '0818': 'NINEMOBILE',
    '0908': 'NINEMOBILE',
    '0903': 'NINEMOBILE',
    '0904': 'NINEMOBILE',
  };

  const prefix = phone.slice(0, 4);
  const shortPrefix = phone.slice(0, 3);

  const detected = prefixes[prefix] || prefixes[shortPrefix] || null;
  
  if (detected && networks.length > 0) {
    const matchedNetwork = networks.find(n => 
      n.name === detected || n.code === detected || n.network === detected
    );
    if (matchedNetwork) {
      return matchedNetwork;
    }
  }
  
  return null;
};

// ✅ Service Detection Component
const ServiceDetection = ({
  phoneNumber,
  detectedNetwork,
}: {
  phoneNumber: string;
  detectedNetwork: NetworkInfo | null;
}) => {
  if (!phoneNumber || phoneNumber.length < 4) return null;

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-950/30">
      <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
      <span className="text-xs text-blue-700 dark:text-blue-300">
        {detectedNetwork ? (
          <>📡 <strong>{detectedNetwork.name}</strong> detected</>
        ) : (
          <>Enter a valid phone number to detect network</>
        )}
      </span>
    </div>
  );
};

// ✅ Provider Button
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

// ✅ Category Tag - Updated for Plan Types (SME, Daily, Weekly, Monthly, 2 Monthly, Yearly)
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
    
    if (name === 'SME') {
      return "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30";
    }
    if (name === 'Daily') {
      return "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30";
    }
    if (name === 'Weekly') {
      return "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30";
    }
    if (name === 'Monthly') {
      return "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30";
    }
    if (name === '2 Monthly') {
      return "text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30";
    }
    if (name === 'Yearly') {
      return "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30";
    }
    return "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800";
  };

  const getIcon = (name: string) => {
    if (name === 'SME') {
      return <Briefcase className="h-3 w-3" />;
    }
    if (name === 'Daily') {
      return <Sun className="h-3 w-3" />;
    }
    if (name === 'Weekly') {
      return <CalendarDays className="h-3 w-3" />;
    }
    if (name === 'Monthly') {
      return <CalendarRange className="h-3 w-3" />;
    }
    if (name === '2 Monthly') {
      return <CalendarCheck className="h-3 w-3" />;
    }
    if (name === 'Yearly') {
      return <CalendarClock className="h-3 w-3" />;
    }
    return <Calendar className="h-3 w-3" />;
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

// ✅ Plan Card
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
      className={`group relative rounded-lg border-2 p-2.5 text-left transition-all duration-200 min-h-[70px] ${
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
      <div className="flex flex-col h-full justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
            {plan.data}
          </h4>
          <p className={`text-[10px] truncate ${isSelected ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
            {plan.name}
          </p>
        </div>
        <div className={`text-left mt-1 ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
          <p className="text-sm font-bold">{formatCurrency(plan.price)}</p>
          <p className={`text-[8px] ${isSelected ? "text-white/70" : "text-gray-400"}`}>
            {plan.validity}
          </p>
        </div>
      </div>
    </button>
  );
};

// ✅ Status Message Component
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
  vendorInfo,
  networks = [],
}: DataClientProps) {
  const router = useRouter();
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
  const [detectedNetwork, setDetectedNetwork] = useState<NetworkInfo | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");
  
  // ✅ Dropdown states
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      const detected = detectNetworkFromPhone(phoneNumber, networks);
      setDetectedNetwork(detected);
      
      if (detected) {
        const matchedProvider = providers.find(p => 
          p.name === detected.name || p.code === detected.code
        );
        if (matchedProvider) {
          setSelectedProvider(matchedProvider.id);
          setSelectedPlan(null);
        }
      }
    } else {
      setDetectedNetwork(null);
    }
  }, [phoneNumber, networks, providers]);

  // ✅ Filter customers when typing
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

  // ✅ Handle click outside to close dropdown
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

  // ✅ Handle selecting a customer from dropdown
  const handleSelectCustomer = (customer: Customer) => {
    setPhoneNumber(customer.phone);
    setShowDropdown(false);
    setError("");
    setPinError("");
  };

  // ✅ Handle input focus
  const handleInputFocus = () => {
    if (filteredCustomers.length > 0) {
      setShowDropdown(true);
    }
  };

  // ✅ Handle input change
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
          planId: selectedPlan.id,
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
      setShowDropdown(false);

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

      // Auto-clear success after 5 seconds
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

  const isAutoDetected = detectedNetwork && providers.find(p => p.name === detectedNetwork.name)?.id === selectedProvider;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Buy Data</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Get the best data bundles from all networks
            {vendorInfo && (
              <span className="text-xs text-gray-400 ml-2">
                • Powered by {vendorInfo.name}
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* ✅ Phone Number & Network Provider */}
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
                    placeholder="Enter phone number or search recent"
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
                    <span>{phoneNumber.length}/11</span>
                  </div>
                </div>

                {/* ✅ Dropdown for recent customers */}
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
                {!detectedNetwork && phoneNumber.length >= 4 && (
                  <p className="mt-2 text-[10px] text-yellow-600 dark:text-yellow-400">
                    ⚠️ Could not detect network. Please select manually.
                  </p>
                )}
              </div>
            </div>

            {/* Categories - Grouped by Plan Type (SME, Daily, Weekly, Monthly, 2 Monthly, Yearly) */}
            {currentProvider && currentProvider.categories.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Plan Categories
                  </h2>
                  <span className="text-[10px] text-gray-500">
                    {currentProvider.categories.length} options
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
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  No data plans available for {currentProvider?.name || 'this provider'}
                </p>
              </div>
            )}

            {/* Data Plans - 5 columns */}
            {currentCategory && plans.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {currentCategory.name} Plans
                  </h2>
                  <span className="text-[10px] text-gray-500">
                    {plans.length} plans
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-[500px] overflow-y-auto pr-1">
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
            ) : currentCategory ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  No plans available in this category
                </p>
              </div>
            ) : null}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h3>
              
              <StatusMessage 
                error={error} 
                success={success} 
                transactionId={transactionId} 
              />

              {!error && !success && (
                <div className="space-y-3 text-sm">
                  {/* Phone Number */}
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
                      <Briefcase className="h-4 w-4 text-gray-400" />
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
                      {selectedPlan?.validity || "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Amount</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPlan ? formatCurrency(selectedPlan.price) : "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
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
                  Search recent customers by name or number
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Filter plans by category (SME, Daily, Weekly, Monthly, 2 Monthly, Yearly)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Plans vary by network and category
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