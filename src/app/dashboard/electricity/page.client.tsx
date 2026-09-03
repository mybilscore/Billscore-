"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import QRCode from "react-qr-code";
import {
  Zap,
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
  Search,
  Filter,
  X,
  TrendingUp,
  Sparkles,
  MapPin,
  Building,
  Smartphone,
  Lightbulb,
  ChevronDown as ChevronDownIcon,
  QrCode as QrCodeIcon,
  Copy,
  Download,
  Share2,
  Link as LinkIcon,
  Store,
  ExternalLink,
  Mail,
  Phone,
  Home,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

// Import QR hash utilities
import { generateQRUrl, generateQRDisplayLink } from "~/lib/qr-hash";

// Types - COMPLETE with all customer fields
interface DisCo {
  id: string;
  name: string;
  code: string;
  displayName?: string;
  region: string;
  logo: string;
  color: string;
  meterTypes: string[];
  serviceID: string;
  discoId: number | string;
}

interface SavedMeter {
  id: string;
  meterNumber: string;
  disco: string;
  name: string | null;
  meterType: string;
  isDefault: boolean;
  createdAt: string;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  meterStatus: string | null;
  lastVerified: string | null;
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

// ✅ LOADING MODAL WITH ANIMATED LOGO
const LoadingModal = ({ isOpen }: { isOpen: boolean }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center">
        {/* Outer ring pulse */}
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

        {/* Loading Text */}
        <div className="mt-6 text-center">
          <h3 className="text-xl font-semibold text-white">Processing...</h3>
          <p className="mt-2 text-sm text-gray-300">Please wait while we complete your purchase</p>
        </div>

        {/* Animated Dots */}
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
  meterNumber,
  amount,
  disco,
  token,
  onBuyMore,
}: {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  meterNumber: string;
  amount: number;
  disco: string;
  token?: string;
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
          <Zap className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>

        <h3 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
          Electricity Purchase Successful! 🎉
        </h3>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Your electricity token has been generated successfully
        </p>

        <div className="mb-6 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">DisCo</span>
            <span className="font-medium text-gray-900 dark:text-white">{disco}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Meter Number</span>
            <span className="font-medium text-gray-900 dark:text-white">{meterNumber || "Not provided"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
            <span className="font-bold text-green-600 dark:text-green-400">
              {formatCurrency(amount)}
            </span>
          </div>
          {token && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Token</span>
              <span className="font-mono text-xs font-bold text-gray-900 dark:text-white break-all max-w-[200px] text-right">
                {token}
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

        {token && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(token);
              toast.success("Token copied to clipboard!");
            }}
            className="w-full mb-3 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Token
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
              Buy More Electricity
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
          We couldn't complete your electricity purchase
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

// QR Code Modal
const QRCodeModal = ({
  isOpen,
  onClose,
  identifier,
  serviceType,
  provider,
  userId,
  qrValue,
  onQuickOrder,
  businessName = "Bilscore",
}: {
  isOpen: boolean;
  onClose: () => void;
  identifier: string;
  serviceType: string;
  provider: string;
  userId: string;
  qrValue: string;
  onQuickOrder: () => void;
  businessName?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFullLink, setShowFullLink] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const urlParams = new URLSearchParams(qrValue.split('?')[1]);
  const hashShort = urlParams.get('h')?.substring(0, 8) || '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyQR = () => {
    handleCopyLink();
  };

  const handleDownloadQR = async () => {
    setIsDownloading(true);
    try {
      const qrSvg = qrRef.current?.querySelector("svg");
      if (!qrSvg) throw new Error("QR code not found");

      const svgData = new XMLSerializer().serializeToString(qrSvg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(
          new Blob([svgData], { type: "image/svg+xml" })
        );
      });

      canvas.width = 400;
      canvas.height = 400;
      ctx?.drawImage(img, 0, 0, 400, 400);

      const link = document.createElement("a");
      link.download = `${serviceType}_${identifier}_QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("QR code downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download QR code");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${serviceType} Payment QR Code`,
          text: `Scan to pay for ${provider} ${serviceType.toLowerCase()} ${identifier}\n\n${qrValue}`,
          url: qrValue,
        });
      } else {
        await navigator.clipboard.writeText(qrValue);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleOpenLink = () => {
    window.open(qrValue, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-800 z-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-5">
          <div className="text-center mb-4">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e293b] shadow-lg">
              <QrCodeIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {serviceType} QR Code
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {provider} • {identifier}
            </p>
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <Shield className="h-3.5 w-3.5" />
              Secured • {hashShort}...
            </div>
          </div>

          <div ref={qrRef} className="flex justify-center mb-4">
            <div className="rounded-xl border-2 border-gray-200 bg-white p-4 dark:border-gray-700">
              <QRCode
                value={qrValue}
                size={180}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox="0 0 256 256"
                bgColor="#ffffff"
                fgColor="#1e293b"
                level="H"
              />
              <div className="mt-3 text-center">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {businessName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {serviceType} • {identifier}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={handleDownloadQR}
              disabled={isDownloading}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download
            </button>
            <button
              onClick={handleShare}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              onClick={handleCopyQR}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center justify-center gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy
            </button>
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">QR Link</span>
              <button
                onClick={() => setShowFullLink(!showFullLink)}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {showFullLink ? 'Hide' : 'Show full'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-mono text-gray-700 dark:text-gray-300 ${showFullLink ? 'break-all' : 'truncate'}`}>
                  {qrValue}
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                title="Copy link"
              >
                {copiedLink ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleOpenLink}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                title="Open link"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
            {copiedLink && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✅ Copied to clipboard!
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-700 text-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</p>
              <p className="text-xs font-medium text-gray-900 dark:text-white mt-0.5 truncate">{serviceType}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-700 text-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Provider</p>
              <p className="text-xs font-medium text-gray-900 dark:text-white mt-0.5 truncate">{provider}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-700 text-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Identifier</p>
              <p className="text-xs font-mono font-medium text-gray-900 dark:text-white mt-0.5 truncate">{identifier}</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={onQuickOrder}
              className="w-full rounded-xl bg-[#1e293b] py-3 text-sm font-semibold text-white hover:bg-[#0f172a] transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Quick Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// SavedMeters Component - Shows complete customer info
const SavedMeters = ({
  meters,
  onSelect,
  onViewQR,
  onGetQRDisplayLink,
  isLoading,
  baseUrl,
  userId,
}: {
  meters: SavedMeter[];
  onSelect: (meterNumber: string) => void;
  onViewQR: (identifier: string, provider: string, serviceType: string) => void;
  onGetQRDisplayLink: (identifier: string, provider: string, serviceType: string) => void;
  isLoading: boolean;
  baseUrl: string;
  userId: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedQRDisplayLink, setCopiedQRDisplayLink] = useState<Record<string, boolean>>({});

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

  const handleCopyQRDisplayLink = async (meterNumber: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedQRDisplayLink(prev => ({ ...prev, [meterNumber]: true }));
      setTimeout(() => setCopiedQRDisplayLink(prev => ({ ...prev, [meterNumber]: false })), 3000);
      toast.success("QR Display link copied!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

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

      <div className="space-y-2">
        {displayMeters.map((meter) => {
          const qrDisplayLink = generateQRDisplayLink(
            baseUrl,
            meter.meterNumber,
            "electricity",
            meter.disco,
            userId // ✅ Pass userId
          );

          const hasCustomerInfo = meter.customerName || meter.customerAddress || meter.customerPhone || meter.customerEmail;

          return (
            <div
              key={meter.id}
              className={`rounded-lg border p-2 transition-all hover:bg-gray-50 hover:border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:border-gray-600 ${
                hasCustomerInfo ? 'border-green-200 dark:border-green-800/30' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onSelect(meter.meterNumber)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {meter.name || `${meter.disco} Meter`}
                    </p>
                    {meter.isDefault && (
                      <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                    )}
                    <span className="text-[8px] bg-gray-100 text-gray-700 px-1 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                      {meter.meterType}
                    </span>
                    {meter.meterStatus && (
                      <span className={`text-[8px] px-1 py-0.5 rounded ${
                        meter.meterStatus.toLowerCase() === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {meter.meterStatus}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {meter.meterNumber} • {meter.disco}
                  </p>
                  
                  {/* Customer Information Section */}
                  {/* {hasCustomerInfo && (
                    <div className="mt-1.5 p-1.5 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700/50">
                      {meter.customerName && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-700 dark:text-gray-300">
                          <User className="h-2.5 w-2.5 text-gray-400" />
                          <span className="font-medium">{meter.customerName}</span>
                        </div>
                      )}
                      {meter.customerAddress && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                          <MapPin className="h-2.5 w-2.5 text-gray-400" />
                          <span className="truncate">{meter.customerAddress}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {meter.customerPhone && (
                          <div className="flex items-center gap-0.5 text-[9px] text-gray-500 dark:text-gray-400">
                            <Phone className="h-2.5 w-2.5 text-gray-400" />
                            <span>{meter.customerPhone}</span>
                          </div>
                        )}
                        {meter.customerEmail && (
                          <div className="flex items-center gap-0.5 text-[9px] text-gray-500 dark:text-gray-400">
                            <Mail className="h-2.5 w-2.5 text-gray-400" />
                            <span className="truncate max-w-[120px]">{meter.customerEmail}</span>
                          </div>
                        )}
                      </div>
                      {meter.lastVerified && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                          <span>Verified: {new Date(meter.lastVerified).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )} */}
                  
                  {!hasCustomerInfo && (
                    <div className="mt-1 text-[9px] text-gray-400 dark:text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        No customer details available
                      </span>
                    </div>
                  )}
                </button>
                
                {/* <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => onViewQR(meter.meterNumber, meter.disco, "Electricity")}
                    className="rounded-lg p-1.5 text-gray-400 hover:text-[#1e293b] transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="View QR Code"
                  >
                    <QrCodeIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onGetQRDisplayLink(meter.meterNumber, meter.disco, "Electricity")}
                    className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    title="Get QR Link"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-[9px] text-gray-400">
                    {formatDate(meter.createdAt)}
                  </p>
                </div> */}
              </div>

              {/* QR Display Link */}
              {/* <div className="mt-1 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1">
                <LinkIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">QR Link:</span>
                <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 truncate flex-1">
                  {qrDisplayLink.replace(/^https?:\/\/[^\/]+/, '')}
                </p>
                <button
                  onClick={() => handleCopyQRDisplayLink(meter.meterNumber, qrDisplayLink)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Copy QR Display link"
                >
                  {copiedQRDisplayLink[meter.meterNumber] ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div> */}
            </div>
          );
        })}
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
      className={`rounded-lg border-2 p-2.5 text-center transition-all duration-200 ${
        isSelected
          ? "border-blue-500 bg-blue-500 text-white shadow-md"
          : "border-gray-200 bg-white hover:border-[#1e293b]/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      <span className={`text-base font-bold ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>
        {amount.label}
      </span>
    </button>
  );
};

// Main Component
export function ElectricityClient({
  user: initialUser,
  discos,
  recommendedAmounts,
}: ElectricityClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [selectedDisco, setSelectedDisco] = useState<string | null>(null);
  const [meterNumber, setMeterNumber] = useState<string>("");
  const [meterType, setMeterType] = useState<string>("Prepaid");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [transactionToken, setTransactionToken] = useState<string>("");
  const [isEnsuringWallet, setIsEnsuringWallet] = useState(false);
  const [savedMeters, setSavedMeters] = useState<SavedMeter[]>([]);
  const [loadingMeters, setLoadingMeters] = useState(false);
  
  // ✅ Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    transactionId: string;
    meterNumber: string;
    amount: number;
    disco: string;
    token: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // QR Code state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ 
    identifier: string; 
    provider: string; 
    serviceType: string; 
    userId: string;
    qrValue: string;
    hash: string;
    expiresAt?: string;
  } | null>(null);
  
  // PIN state
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");
  
  // Meter verification state - PERSISTED with all customer data
  const [verifying, setVerifying] = useState(false);
  const [verifiedMeter, setVerifiedMeter] = useState<{
    customerName: string;
    meterNumber: string;
    meterType: string;
    status: string;
    customerAddress?: string;
    customerPhone?: string;
    customerEmail?: string;
  } | null>(null);

  // Dropdown state for DisCo
  const [showDiscoDropdown, setShowDiscoDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentDisco = discos.find((d) => d.id === selectedDisco);

  // Get base URL
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
  };

  // Filter discos based on search
  const filteredDiscos = discos.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDiscoDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Verify meter using API route - PERSISTS customer data
  useEffect(() => {
    const verifyMeter = async () => {
      if (!meterNumber || meterNumber.length < 10 || !selectedDisco) {
        setVerifiedMeter(null);
        return;
      }
      
      setVerifying(true);
      setVerifiedMeter(null);
      
      try {
        const disco = discos.find(d => d.id === selectedDisco);
        if (!disco) {
          console.warn('⚠️ [Verify Meter] Disco not found for id:', selectedDisco);
          setVerifying(false);
          return;
        }
        
        console.log('🔍 [Verify Meter] Sending request:', {
          serviceID: disco.serviceID || disco.code,
          meterNumber,
          meterType: meterType.toLowerCase(),
          disco: disco.discoId || 1,
          discoName: disco.displayName || disco.name,
          discoCode: disco.code,
        });
        
        const response = await fetch("/api/vendors/electricity/verify-meter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serviceID: disco.serviceID || disco.code,
            meterNumber: meterNumber,
            meterType: meterType.toLowerCase(),
            disco: disco.discoId || 1,
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          // Store ALL customer data from verification
          setVerifiedMeter({
            customerName: result.data.customerName,
            meterNumber: result.data.meterNumber,
            meterType: result.data.meterType,
            status: result.data.status,
            customerAddress: result.data.customerAddress,
            customerPhone: result.data.customerPhone,
            customerEmail: result.data.customerEmail,
          });
          console.log('✅ [Verify Meter] Verification successful:', result.data.customerName);
        } else {
          setVerifiedMeter(null);
          console.log('⚠️ [Verify Meter] Verification failed:', result.error);
        }
      } catch (error) {
        console.error("❌ [Verify Meter] Error:", error);
        setVerifiedMeter(null);
      } finally {
        setVerifying(false);
      }
    };
    
    const timer = setTimeout(verifyMeter, 800);
    return () => clearTimeout(timer);
  }, [meterNumber, selectedDisco, meterType]);

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

  // ✅ UPDATED: Handle View QR Code with userId
  const handleViewQR = (identifier: string, provider: string, serviceType: string) => {
    const baseUrl = getBaseUrl();
    
    const qrValue = generateQRUrl(baseUrl, {
      identifier: identifier,
      type: serviceType.toLowerCase(),
      provider: provider,
      userId: user.id, // ✅ Added userId
    });
    
    const url = new URL(qrValue);
    const params = new URLSearchParams(url.search);
    const hash = params.get('h');
    const expiresAt = params.get('e');
    
    setQrData({
      identifier: identifier,
      provider: provider,
      serviceType: serviceType,
      userId: user.id,
      qrValue: qrValue,
      hash: hash || '',
      expiresAt: expiresAt || undefined,
    });
    setShowQRModal(true);
  };

  // ✅ UPDATED: Handle Get QR Display Link with userId
  const handleGetQRDisplayLink = (identifier: string, provider: string, serviceType: string) => {
    const baseUrl = getBaseUrl();
    const encryptedLink = generateQRDisplayLink(
      baseUrl,
      identifier,
      serviceType.toLowerCase(),
      provider,
      user.id // ✅ Added userId
    );
    router.push(encryptedLink.replace(baseUrl, ''));
  };

  // Handle Quick Order from QR
  const handleQuickOrder = () => {
    if (!qrData) return;
    setShowQRModal(false);
    setMeterNumber(qrData.identifier);
    const matchedDisco = discos.find(d => d.code === qrData.provider || d.name === qrData.provider);
    if (matchedDisco) {
      setSelectedDisco(matchedDisco.id);
    }
    document.getElementById('meter-number-input')?.focus();
  };

  const handleDiscoSelect = (discoId: string) => {
    setSelectedDisco(discoId);
    setVerifiedMeter(null);
    setError("");
    setPinError("");
    setShowDiscoDropdown(false);
    setSearchTerm("");
  };

  const handleMeterTypeChange = (type: string) => {
    setMeterType(type);
    setVerifiedMeter(null);
    setError("");
    setPinError("");
  };

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

  // When selecting a saved meter, auto-populate ALL data without re-verification
  const handleSelectSavedMeter = (meterNumber: string) => {
    // Find the meter from saved meters
    const meter = savedMeters.find(m => m.meterNumber === meterNumber);
    
    if (!meter) {
      toast.error("Meter not found");
      return;
    }

    // Auto-populate all meter data
    setMeterNumber(meter.meterNumber);
    
    // Set the DisCo
    const disco = discos.find(d => d.code === meter.disco);
    if (disco) {
      setSelectedDisco(disco.id);
    }
    
    // Set meter type
    setMeterType(meter.meterType || "Prepaid");
    
    // Restore customer data if available (NO re-verification needed!)
    if (meter.customerName) {
      setVerifiedMeter({
        customerName: meter.customerName,
        meterNumber: meter.meterNumber,
        meterType: meter.meterType,
        status: meter.meterStatus || "ACTIVE",
        customerAddress: meter.customerAddress || undefined,
        customerPhone: meter.customerPhone || undefined,
        customerEmail: meter.customerEmail || undefined,
      });
      
      console.log("📝 [Electricity] Restored customer data from saved meter:", {
        name: meter.customerName,
        address: meter.customerAddress,
        phone: meter.customerPhone,
        email: meter.customerEmail,
        status: meter.meterStatus,
      });
    } else {
      setVerifiedMeter(null);
    }
    
    setError("");
    setPinError("");
    
    if (meter.customerName) {
      toast.success(`✅ Loaded ${meter.customerName}'s meter`);
    } else {
      toast.success(`✅ Loaded meter ${meter.meterNumber}`);
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
    return selectedAmount || parseInt(customAmount) || 0;
  };

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount("");
    setMeterNumber("");
    setPin("");
    setError("");
    setPinError("");
    setSuccess(false);
    setTransactionId("");
    setTransactionToken("");
    setSelectedDisco(null);
    setVerifiedMeter(null);
  };

  // UPDATED: Pass customer data to purchase API
  const handlePurchase = async () => {
    if (!pin || pin.length < 4) {
      setPinError("Please enter your 4-6 digit transaction PIN");
      return;
    }

    if (!selectedDisco) {
      setError("Please select a DisCo");
      return;
    }

    const amount = getTotalAmount();
    if (!amount || amount < 100) {
      setError("Please enter a valid amount (minimum ₦100)");
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

    // ✅ Show loading modal
    setShowLoadingModal(true);
    setIsLoading(true);
    setError("");
    setSuccess(false);
    setPinError("");

    try {
      const disco = discos.find(d => d.id === selectedDisco);
      
      // Build payload with customer data from verification
      const payload: any = {
        meterNumber: meterNumber || "",
        amount: amount,
        discoCode: disco?.code || "",
        meterType: meterType,
        pin: pin,
      };

      // Pass customer data if available (from verification)
      if (verifiedMeter && verifiedMeter.customerName) {
        payload.customerName = verifiedMeter.customerName;
        payload.customerAddress = verifiedMeter.customerAddress || "";
        payload.customerPhone = verifiedMeter.customerPhone || "";
        payload.customerEmail = verifiedMeter.customerEmail || "";
        payload.meterStatus = verifiedMeter.status || "ACTIVE";
        console.log("📝 [Electricity] Passing customer data to purchase:", {
          name: verifiedMeter.customerName,
          address: verifiedMeter.customerAddress,
          phone: verifiedMeter.customerPhone,
          email: verifiedMeter.customerEmail,
          status: verifiedMeter.status,
        });
      }

      const response = await fetch("/api/vendors/electricity/purchase", {
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
      const token = result.data?.token || result.data?.customerToken || "";
      setTransactionId(txId);
      setTransactionToken(token);
      setPin("");
      setVerifiedMeter(null);

      // ✅ Store success data for modal
      setSuccessData({
        transactionId: txId,
        meterNumber: meterNumber || "Not provided",
        amount: amount,
        disco: disco?.displayName || disco?.name || "Unknown",
        token: token,
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

      // Refresh saved meters
      const metersResponse = await fetch("/api/saved-meters");
      const metersResult = await metersResponse.json();
      if (metersResult.success) {
        setSavedMeters(metersResult.data);
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
        {/* QR Code Modal */}
        {qrData && (
          <QRCodeModal
            isOpen={showQRModal}
            onClose={() => {
              setShowQRModal(false);
              setQrData(null);
            }}
            identifier={qrData.identifier}
            serviceType={qrData.serviceType}
            provider={qrData.provider}
            userId={qrData.userId}
            qrValue={qrData.qrValue}
            onQuickOrder={handleQuickOrder}
          />
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Buy Electricity</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Purchase electricity tokens for any DisCo
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Saved Meters with QR Code */}
            {savedMeters.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <SavedMeters
                  meters={savedMeters}
                  onSelect={handleSelectSavedMeter}
                  onViewQR={handleViewQR}
                  onGetQRDisplayLink={handleGetQRDisplayLink}
                  isLoading={loadingMeters}
                  baseUrl={getBaseUrl()}
                  userId={user.id} // ✅ Pass userId
                />
              </div>
            )}

            {/* Combined Meter Number & DisCo Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Meter Details
              </h2>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <input
                  id="meter-number-input"
                  type="text"
                  value={meterNumber}
                  onChange={(e) => {
                    setMeterNumber(e.target.value.replace(/[^0-9]/g, ""));
                    setVerifiedMeter(null);
                  }}
                  placeholder="Enter your meter number (optional)"
                  maxLength={15}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-3 text-lg font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">(optional)</span>
                  <span>{meterNumber.length}/15</span>
                </div>
              </div>

              {/* DisCo Dropdown */}
              <div className="mt-4 relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Select DisCo
                </label>
                <button
                  onClick={() => setShowDiscoDropdown(!showDiscoDropdown)}
                  className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <div className="flex items-center gap-3">
                    {currentDisco ? (
                      <>
                        <span className="text-xl">{currentDisco.logo}</span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {currentDisco.displayName || currentDisco.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {currentDisco.region} • {currentDisco.code}
                          </p>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Select a DisCo
                      </span>
                    )}
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showDiscoDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDiscoDropdown && (
                  <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    <div className="sticky top-0 bg-white dark:bg-gray-900 p-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search DisCo..."
                          className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {filteredDiscos.length > 0 ? (
                      filteredDiscos.map((disco) => (
                        <button
                          key={disco.id}
                          onClick={() => handleDiscoSelect(disco.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                            selectedDisco === disco.id ? 'bg-blue-50 dark:bg-blue-950/40' : ''
                          }`}
                        >
                          <span className="text-xl">{disco.logo}</span>
                          <div className="flex-1 text-left">
                            <p className={`font-medium ${selectedDisco === disco.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                              {disco.displayName || disco.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {disco.region} • {disco.meterTypes.join(', ')}
                            </p>
                          </div>
                          {selectedDisco === disco.id && (
                            <Check className="h-5 w-5 text-blue-500" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                        No DisCo found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Meter Type */}
              {selectedDisco && currentDisco && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Meter Type
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    {currentDisco.meterTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleMeterTypeChange(type)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                          meterType === type
                            ? "bg-blue-500 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Status - Shows persisted customer data */}
              {verifying && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verifying meter...
                </div>
              )}

              {verifiedMeter && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/30 dark:bg-green-900/20">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">
                        ✅ Verified: {verifiedMeter.customerName}
                      </p>
                      <p className="text-[10px] text-green-600 dark:text-green-300">
                        Meter: {verifiedMeter.meterNumber} • Type: {verifiedMeter.meterType} • Status: {verifiedMeter.status}
                      </p>
                      {verifiedMeter.customerAddress && (
                        <p className="text-[10px] text-green-600 dark:text-green-300">
                          📍 {verifiedMeter.customerAddress}
                        </p>
                      )}
                      {verifiedMeter.customerPhone && (
                        <p className="text-[10px] text-green-600 dark:text-green-300">
                          📞 {verifiedMeter.customerPhone}
                        </p>
                      )}
                      {verifiedMeter.customerEmail && (
                        <p className="text-[10px] text-green-600 dark:text-green-300">
                          ✉️ {verifiedMeter.customerEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!meterNumber && (
                <p className="mt-2 text-[10px] text-gray-400">
                  ℹ️ Meter number is optional - you can proceed without it
                </p>
              )}
            </div>

            {/* Amount Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Amount
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
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
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  ₦
                </div>
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Enter custom amount (min ₦100)"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2.5 text-base font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
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
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">DisCo</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {currentDisco?.displayName || currentDisco?.name || "Not selected"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Meter Number</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {meterNumber || "Not provided (optional)"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Meter Type</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {meterType || "—"}
                  </span>
                </div>

                {/* Display customer data in order summary */}
                {verifiedMeter && (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Customer</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-xs">
                        {verifiedMeter.customerName}
                      </span>
                    </div>
                    {verifiedMeter.customerAddress && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Address</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white text-xs truncate max-w-[150px]">
                          {verifiedMeter.customerAddress}
                        </span>
                      </div>
                    )}
                    {verifiedMeter.customerPhone && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Phone</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white text-xs">
                          {verifiedMeter.customerPhone}
                        </span>
                      </div>
                    )}
                    {verifiedMeter.customerEmail && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">Email</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white text-xs truncate max-w-[150px]">
                          {verifiedMeter.customerEmail}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Amount</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {totalAmount > 0 ? formatCurrency(totalAmount) : "Not selected"}
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
                    <Wallet className="h-4 w-4 text-gray-400" />
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
            </div>

            {/* Quick Tips */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Tips</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Enter your meter number to auto-verify (optional)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Tokens are delivered instantly
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Search and select your DisCo
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Verify meter before purchase
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Saved meters for quick access
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  QR codes are securely encrypted
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Meter number is optional - you can proceed without it
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Transaction PIN required for security
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1e293b]">•</span>
                  Customer details are saved with your meter
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
          meterNumber={successData.meterNumber}
          amount={successData.amount}
          disco={successData.disco}
          token={successData.token}
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