// app/dashboard/buy/cable/page.client.tsx - COMPLETE UPDATED VERSION

"use client";

import { useState, useEffect, useRef } from "react";
import {
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
  Clock as ClockIcon,
  RefreshCw,
  ChevronDown as ChevronDownIcon,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

interface Package {
  id: string;
  name: string;
  price: number;
  channels: string;
  validity: string;
  packageCode: string;
  variationCode: string;
  description?: string;
  isPopular?: boolean;
  isBestValue?: boolean;
}

interface Provider {
  id: string;
  name: string;
  logo: string;
  color: string;
  serviceId: string;
  packages: Package[];
}

// ✅ Updated SavedDecoder interface with customer fields
interface SavedDecoder {
  id: string;
  decoderNumber: string;
  provider: string;
  name: string | null;
  package: string | null;
  isDefault: boolean;
  createdAt: string;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  decoderStatus: string | null;
  lastVerified: string | null;
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

// ✅ Updated RecentDecoders Component - Shows customer info
const RecentDecoders = ({
  decoders,
  onSelect,
  isLoading,
}: {
  decoders: SavedDecoder[];
  onSelect: (decoderNumber: string, provider?: string) => void;
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
  const hasCustomerInfo = (decoder: SavedDecoder) => 
    decoder.customerName || decoder.customerAddress || decoder.customerPhone || decoder.customerEmail;

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
        {displayDecoders.map((decoder) => {
          const hasInfo = hasCustomerInfo(decoder);
          
          return (
            <button
              key={decoder.id}
              onClick={() => onSelect(decoder.decoderNumber, decoder.provider)}
              className={`w-full flex items-center justify-between rounded-lg border p-2 text-left transition-all hover:bg-gray-50 hover:border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:border-gray-600 group ${
                hasInfo ? 'border-green-200 dark:border-green-800/30' : 'border-gray-100'
              }`}
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
                  {decoder.decoderStatus && (
                    <span className={`text-[8px] px-1 py-0.5 rounded ${
                      decoder.decoderStatus.toLowerCase() === 'active' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {decoder.decoderStatus}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {decoder.decoderNumber}
                </p>
                {/* ✅ Show customer info */}
                {decoder.customerName && (
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                    <User className="h-2.5 w-2.5" />
                    {decoder.customerName}
                  </p>
                )}
                {decoder.customerAddress && (
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    <span className="truncate">{decoder.customerAddress}</span>
                  </p>
                )}
                {decoder.customerPhone && (
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5" />
                    {decoder.customerPhone}
                  </p>
                )}
                {decoder.customerEmail && (
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">
                    <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                    <span className="truncate max-w-[100px]">{decoder.customerEmail}</span>
                  </p>
                )}
                {decoder.lastVerified && (
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Check className="h-2.5 w-2.5 text-green-500" />
                    Verified: {new Date(decoder.lastVerified).toLocaleDateString()}
                  </p>
                )}
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
                <span className="text-[8px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to select →
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ✅ Package Card
const PackageCard = ({
  pkg,
  isSelected,
  onClick,
  isBestValue,
}: {
  pkg: Package;
  isSelected: boolean;
  onClick: () => void;
  isBestValue?: boolean;
}) => {
  const fullName = pkg.name;
  const isLongName = pkg.name.length > 40;

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

      {pkg.isPopular && !isBestValue && (
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
        {fullName}
      </h4>

      <div className={`mt-2 flex items-center gap-2 text-[9px] ${isSelected ? "text-blue-600/80 dark:text-blue-400/80" : "text-gray-500 dark:text-gray-400"}`}>
        <span className="flex items-center gap-0.5">
          <Radio className="h-2.5 w-2.5" />
          {pkg.channels}
        </span>
        <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
        <span className="flex items-center gap-0.5">
          <ClockIcon className="h-2.5 w-2.5" />
          {pkg.validity}
        </span>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className={`text-lg font-bold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
          {formatCurrency(pkg.price)}
        </span>
        <span className="text-[8px] text-gray-400 dark:text-gray-500">
          /month
        </span>
      </div>

      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-b-xl" />
      )}
    </button>
  );
};

// ✅ Package Filters
const PackageFilters = ({
  packages,
  onFilterChange,
}: {
  packages: Package[];
  onFilterChange: (filtered: Package[]) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState<"all" | "low" | "medium" | "high">("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let filtered = packages;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.packageCode.toLowerCase().includes(term)
      );
    }

    const prices = packages.map(p => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / (prices.length || 1);

    if (priceRange === "low") {
      filtered = filtered.filter(p => p.price < avgPrice * 0.7);
    } else if (priceRange === "medium") {
      filtered = filtered.filter(p => p.price >= avgPrice * 0.7 && p.price <= avgPrice * 1.3);
    } else if (priceRange === "high") {
      filtered = filtered.filter(p => p.price > avgPrice * 1.3);
    }

    onFilterChange(filtered);
  }, [searchTerm, priceRange, packages]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search packages..."
          className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            showFilters
              ? "bg-[#1e293b] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <div className="flex-1" />

        <span className="text-[10px] text-gray-500">
          {packages.length} packages
        </span>
      </div>

      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Price:</span>
            {["all", "low", "medium", "high"].map((range) => (
              <button
                key={range}
                onClick={() => setPriceRange(range as any)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  priceRange === range
                    ? "bg-[#1e293b] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                }`}
              >
                {range === "all" ? "All" : range === "low" ? "Low" : range === "medium" ? "Medium" : "High"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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

// ✅ Main Component
export function CableClient({
  user: initialUser,
}: CableClientProps) {
  const [user, setUser] = useState(initialUser);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const [smartCardNumber, setSmartCardNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [decoderStatus, setDecoderStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [isEnsuringWallet, setIsEnsuringWallet] = useState(false);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);
  const [savedDecoders, setSavedDecoders] = useState<SavedDecoder[]>([]);
  const [loadingDecoders, setLoadingDecoders] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // ✅ Dropdown states
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");

  const currentProvider = providers.find((p) => p.id === selectedProvider);
  const packages = currentProvider?.packages || [];

  // ✅ Filter providers based on search
  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProviderDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ✅ Fetch packages from VTpass API
  useEffect(() => {
    const fetchPackages = async () => {
      setLoadingProviders(true);
      try {
        const providerConfigs = [
          { id: "dstv", name: "DSTV", logo: "📺", color: "blue", serviceId: "dstv" },
          { id: "gotv", name: "GOTV", logo: "📡", color: "green", serviceId: "gotv" },
          { id: "startimes", name: "Startimes", logo: "⭐", color: "yellow", serviceId: "startimes" },
        ];

        const fetchedProviders: Provider[] = [];

        for (const config of providerConfigs) {
          const isProduction = process.env.NODE_ENV === "production";
          const baseUrl = isProduction 
            ? "https://vtpass.com/api/service-variations"
            : "https://sandbox.vtpass.com/api/service-variations";
          
          const response = await fetch(`${baseUrl}?serviceID=${config.serviceId}`);
          
          if (!response.ok) {
            console.warn(`Failed to fetch ${config.name} packages: ${response.status}`);
            continue;
          }

          const data = await response.json();
          
          if (data.response_description === "000" && data.content?.variations) {
            const packages: Package[] = data.content.variations.map((v: any) => {
              const price = parseFloat(v.variation_amount) || 0;
              const name = v.name || "";
              
              const isPopular = name.toLowerCase().includes("premium") || 
                               name.toLowerCase().includes("compact plus") ||
                               name.toLowerCase().includes("max") ||
                               name.toLowerCase().includes("supa");
              
              const isBestValue = price > 2000 && price < 8000 && 
                                 !name.toLowerCase().includes("premium") &&
                                 !name.toLowerCase().includes("lite");
              
              return {
                id: v.variation_code,
                name: name,
                price: price,
                channels: "100+",
                validity: "30 Days",
                packageCode: v.variation_code,
                variationCode: v.variation_code,
                isPopular: isPopular,
                isBestValue: isBestValue,
              };
            });

            const validPackages = packages
              .filter(p => p.price > 0)
              .sort((a, b) => a.price - b.price);

            fetchedProviders.push({
              ...config,
              packages: validPackages,
            });
          }
        }

        setProviders(fetchedProviders);
        
        if (fetchedProviders.length > 0) {
          setSelectedProvider(fetchedProviders[0].id);
          if (fetchedProviders[0].packages.length > 0) {
            setSelectedPackage(fetchedProviders[0].packages[0]);
            setFilteredPackages(fetchedProviders[0].packages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch cable packages:", error);
        setError("Failed to load cable packages. Please refresh.");
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchPackages();
  }, []);

  // Update filtered packages when provider changes
  useEffect(() => {
    const provider = providers.find(p => p.id === selectedProvider);
    if (provider) {
      setFilteredPackages(provider.packages);
      if (provider.packages.length > 0 && !selectedPackage) {
        setSelectedPackage(provider.packages[0]);
      }
    }
  }, [selectedProvider, providers]);

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

  // ✅ AUTO-SELECT PROVIDER when a saved decoder is selected
  const handleSelectDecoder = (decoderNumber: string, provider?: string) => {
    setSmartCardNumber(decoderNumber);
    setError("");
    setPinError("");
    setShowCustomerLookup(true);
    
    // Find the decoder in saved list to get customer info
    const decoder = savedDecoders.find(d => d.decoderNumber === decoderNumber);
    if (decoder) {
      if (decoder.customerName) {
        setCustomerName(decoder.customerName);
      }
      if (decoder.customerAddress) {
        setCustomerAddress(decoder.customerAddress);
      }
      if (decoder.customerPhone) {
        setCustomerPhone(decoder.customerPhone);
      }
      if (decoder.customerEmail) {
        setCustomerEmail(decoder.customerEmail);
      }
      if (decoder.decoderStatus) {
        setDecoderStatus(decoder.decoderStatus);
      }
    }
    
    if (provider) {
      const matchedProvider = providers.find(p => 
        p.name.toLowerCase() === provider.toLowerCase() ||
        p.id.toLowerCase() === provider.toLowerCase()
      );
      
      if (matchedProvider) {
        setSelectedProvider(matchedProvider.id);
        if (matchedProvider.packages.length > 0) {
          setSelectedPackage(matchedProvider.packages[0]);
          setFilteredPackages(matchedProvider.packages);
        }
        toast.success(`✅ Switched to ${matchedProvider.name} based on saved decoder`);
      } else {
        toast.info(`ℹ️ Saved decoder provider "${provider}" found, but no matching package provider available`);
      }
    }
  };

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
      setFilteredPackages(newProvider.packages);
    }
    setError("");
    setPinError("");
    setShowProviderDropdown(false);
    setSearchTerm("");
  };

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setError("");
    setPinError("");
  };

  const handleFilterChange = (filtered: Package[]) => {
    setFilteredPackages(filtered);
  };

  const handleSmartCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setSmartCardNumber(value);
    if (showCustomerLookup) {
      setShowCustomerLookup(false);
      setCustomerName("");
      setCustomerAddress("");
      setCustomerPhone("");
      setCustomerEmail("");
      setDecoderStatus("");
    }
    setError("");
    setPinError("");
  };

  // ✅ Verify Decoder Function - Stores complete customer info
  const handleVerifyDecoder = async () => {
    if (!smartCardNumber || smartCardNumber.length < 10) {
      setError("Please enter a valid smart card number (minimum 10 digits)");
      toast.error("Please enter a valid smart card number");
      return;
    }

    if (!selectedProvider) {
      setError("Please select a provider first");
      toast.error("Please select a provider first");
      return;
    }

    setIsVerifying(true);
    setError("");
    setCustomerName("");
    setCustomerAddress("");
    setCustomerPhone("");
    setCustomerEmail("");
    setDecoderStatus("");

    try {
      const serviceMap: Record<string, string> = {
        'DSTV': 'dstv',
        'GOTV': 'gotv',
        'Startimes': 'startimes',
      };

      const serviceID = serviceMap[currentProvider?.name || ''] || 'dstv';

      const response = await fetch("/api/vendors/cable/verify-decoder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceID: serviceID,
          smartCardNumber: smartCardNumber,
          packageCode: selectedPackage?.packageCode || undefined,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // ✅ Store ALL customer info
        setCustomerName(result.data.customerName || "Customer Found");
        setCustomerAddress(result.data.customerAddress || "");
        setCustomerPhone(result.data.customerPhone || "");
        setCustomerEmail(result.data.customerEmail || "");
        setDecoderStatus(result.data.status || "Active");
        setShowCustomerLookup(true);
        
        if (result.data.provider) {
          const matchedProvider = providers.find(p => 
            p.name.toLowerCase() === result.data.provider.toLowerCase() ||
            p.id.toLowerCase() === result.data.provider.toLowerCase()
          );
          if (matchedProvider) {
            setSelectedProvider(matchedProvider.id);
          }
        }
        
        toast.success(`✅ Customer found: ${result.data.customerName}`);
      } else {
        setError(result.error || "Customer not found. Please check the smart card number.");
        setShowCustomerLookup(false);
        toast.error("❌ Customer not found", {
          description: "Please verify the smart card number",
        });
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
      toast.error("❌ Verification failed", {
        description: err.message || "Please try again",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setPin(value);
      setPinError("");
    }
  };

  const handlePurchase = async () => {
    if (!pin || pin.length < 4) {
      setPinError("Please enter your 4-6 digit transaction PIN");
      toast.error("Please enter your transaction PIN");
      return;
    }

    if (!selectedProvider) {
      setError("Please select a cable provider");
      toast.error("Please select a cable provider");
      return;
    }

    if (!selectedPackage) {
      setError("Please select a subscription package");
      toast.error("Please select a subscription package");
      return;
    }

    if (!smartCardNumber || smartCardNumber.length < 10) {
      setError("Please enter a valid smart card number");
      toast.error("Please enter a valid smart card number");
      return;
    }

    if (!user.hasWallet) {
      setError("You need a wallet to make purchases");
      toast.error("You need a wallet to make purchases");
      return;
    }

    if (user.walletBalance < selectedPackage.price) {
      setError(`Insufficient balance. Your balance is ${formatCurrency(user.walletBalance)}`);
      toast.error("Insufficient balance");
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
      setPin("");
      setSmartCardNumber("");
      setShowCustomerLookup(false);
      setCustomerName("");
      setCustomerAddress("");
      setCustomerPhone("");
      setCustomerEmail("");
      setDecoderStatus("");

      const balanceResponse = await fetch("/api/user/balance");
      const balanceData = await balanceResponse.json();
      if (balanceData.success) {
        setUser({
          ...user,
          walletBalance: balanceData.balance,
        });
      }

      const decodersResponse = await fetch("/api/saved-decoders");
      const decodersResult = await decodersResponse.json();
      if (decodersResult.success) {
        setSavedDecoders(decodersResult.data);
      }

      toast.success("✅ Subscription successful!", {
        description: `${currentProvider?.name} - ${selectedPackage.name} for ${formatCurrency(selectedPackage.price)}`,
      });

      setTimeout(() => {
        setSuccess(false);
      }, 5000);

    } catch (err: any) {
      setError(err.message || "Purchase failed. Please try again.");
      toast.error("❌ Purchase failed", {
        description: err.message || "Please try again",
      });
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

  if (loadingProviders) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 mx-auto text-[#1e293b] animate-spin" />
          <p className="mt-4 text-gray-500">Loading cable packages...</p>
        </div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unable to Load Packages</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We couldn't load the cable TV packages. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#1e293b] text-white rounded-lg hover:bg-[#0f172a] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
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
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <RecentDecoders
                  decoders={savedDecoders}
                  onSelect={handleSelectDecoder}
                  isLoading={loadingDecoders}
                />
              </div>
            )}

            {/* ✅ Combined Smart Card Number & Provider Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Decoder Details
              </h2>

              {/* Smart Card Number Input */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Radio className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={smartCardNumber}
                  onChange={handleSmartCardChange}
                  placeholder="Enter your smart card number"
                  maxLength={15}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-3 text-lg font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {smartCardNumber.length}/15
                </div>
              </div>

              {/* ✅ Provider Dropdown */}
              <div className="mt-4 relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Provider
                </label>
                <button
                  onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                  className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <div className="flex items-center gap-3">
                    {currentProvider ? (
                      <>
                        <span className="text-2xl">{currentProvider.logo}</span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {currentProvider.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {currentProvider.packages.length} packages available
                          </p>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Select a provider
                      </span>
                    )}
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showProviderDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown List */}
                {showProviderDropdown && (
                  <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {/* Search Input */}
                    <div className="sticky top-0 bg-white dark:bg-gray-900 p-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search provider..."
                          className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {filteredProviders.length > 0 ? (
                      filteredProviders.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => handleProviderSelect(provider.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                            selectedProvider === provider.id ? 'bg-blue-50 dark:bg-blue-950/40' : ''
                          }`}
                        >
                          <span className="text-2xl">{provider.logo}</span>
                          <div className="flex-1 text-left">
                            <p className={`font-medium ${selectedProvider === provider.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                              {provider.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {provider.packages.length} packages
                            </p>
                          </div>
                          {selectedProvider === provider.id && (
                            <Check className="h-5 w-5 text-blue-500" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                        No provider found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ✅ Verify Button */}
              {smartCardNumber.length >= 10 && !showCustomerLookup && (
                <button
                  onClick={handleVerifyDecoder}
                  disabled={isVerifying}
                  className="mt-4 w-full rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Search className="h-4 w-4" />
                      Verify Customer
                    </span>
                  )}
                </button>
              )}

              {/* ✅ Re-verify Button */}
              {showCustomerLookup && (
                <button
                  onClick={handleVerifyDecoder}
                  disabled={isVerifying}
                  className="mt-4 w-full rounded-lg bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Re-verifying...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Re-verify Customer
                    </span>
                  )}
                </button>
              )}

              {/* ✅ Customer Lookup Result - Complete Info */}
              {showCustomerLookup && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/30 dark:bg-green-900/20">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">
                        Customer Found
                      </p>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                        {customerName || "Unknown Customer"}
                      </p>
                      {customerAddress && (
                        <p className="text-xs text-green-600 dark:text-green-300 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {customerAddress}
                        </p>
                      )}
                      {customerPhone && (
                        <p className="text-xs text-green-600 dark:text-green-300 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customerPhone}
                        </p>
                      )}
                      {customerEmail && (
                        <p className="text-xs text-green-600 dark:text-green-300 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {customerEmail}
                        </p>
                      )}
                      <p className="text-[10px] text-green-500 dark:text-green-400 mt-0.5">
                        Smart Card: {smartCardNumber} • Status: {decoderStatus || "Active"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Available Packages - 3-COLUMN GRID */}
            {currentProvider && packages.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {currentProvider.name} Packages
                    </h2>
                    <p className="text-[10px] text-gray-500">
                      {packages.length} packages available
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">
                      {filteredPackages.length} shown
                    </span>
                  </div>
                </div>

                {/* Filters */}
                <PackageFilters
                  packages={packages}
                  onFilterChange={handleFilterChange}
                />

                {/* 3-COLUMN PACKAGE GRID */}
                <div className="mt-3">
                  {filteredPackages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredPackages.map((pkg) => (
                        <PackageCard
                          key={pkg.id}
                          pkg={pkg}
                          isSelected={selectedPackage?.id === pkg.id}
                          onClick={() => handlePackageSelect(pkg)}
                          isBestValue={pkg.isBestValue}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                      <Search className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p>No packages match your filters</p>
                      <button
                        onClick={() => {
                          const provider = providers.find(p => p.id === selectedProvider);
                          if (provider) {
                            setFilteredPackages(provider.packages);
                          }
                        }}
                        className="mt-1 text-xs text-blue-600 hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Package count */}
                {filteredPackages.length > 0 && (
                  <div className="mt-3 text-center">
                    <span className="text-[10px] text-gray-400">
                      Showing {filteredPackages.length} of {packages.length} packages
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary and Wallet Info */}
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
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400">Provider</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentProvider?.name || "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Tv className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Package</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white text-right text-xs max-w-[140px]">
                      {selectedPackage?.name || "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Channels</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPackage?.channels || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Validity</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPackage?.validity || "—"}
                    </span>
                  </div>

                  {/* ✅ Show customer info in order summary */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Customer</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white text-right text-xs max-w-[140px]">
                      {showCustomerLookup ? customerName || "Verified" : "Not verified"}
                    </span>
                  </div>
                  
                  {showCustomerLookup && customerAddress && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Address</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-right text-xs max-w-[140px] truncate">
                        {customerAddress}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Service Fee</span>
                    </div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      {selectedPackage ? formatCurrency(0) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Wallet Balance</span>
                    </div>
                    <span className={`font-medium ${user.walletBalance >= (selectedPackage?.price || 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(user.walletBalance)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-xl font-bold text-[#1e293b] dark:text-white">
                      {selectedPackage ? formatCurrency(selectedPackage.price) : "—"}
                    </span>
                  </div>

                  {selectedPackage && user.walletBalance < selectedPackage.price && (
                    <div className="mt-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        ⚠️ Insufficient balance. You need {formatCurrency(selectedPackage.price - user.walletBalance)} more.
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
              )}

              <button
                onClick={handlePurchase}
                disabled={isLoading || !user.hasWallet || !selectedPackage || !smartCardNumber || user.walletBalance < (selectedPackage?.price || 0) || !pin || pin.length < 4 || !showCustomerLookup}
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

              {!showCustomerLookup && smartCardNumber.length >= 10 && (
                <p className="text-center text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  ⚠️ Please verify your smart card first
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
                  Verify your smart card before purchasing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Search and select your provider
                </li>
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
                  Saved decoders for quick access
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Transaction PIN required for security
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Customer details are saved with your decoder
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}