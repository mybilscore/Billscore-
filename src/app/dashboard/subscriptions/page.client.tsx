// app/dashboard/subscriptions/page.client.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import {
  Phone,
  Wifi,
  Zap,
  Tv,
  Check,
  ArrowRight,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Repeat,
  QrCode,
  Copy,
  Download,
  Share2,
  Plus,
  Trash2,
  X,
  Lightbulb,
  MapPin,
  Link as LinkIcon,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  Eye,
  Store,
  Edit2,
  Star,
  StarOff,
  Lock,
  EyeOff,
  Shield,
} from "lucide-react";

// ✅ Import QR hash utilities
import { generateQRUrl } from "~/lib/qr-hash";

// Types
interface SavedMeter {
  id: string;
  meterNumber: string;
  disco: string;
  name: string | null;
  meterType: string;
  isDefault: boolean;
}

interface SavedDecoder {
  id: string;
  decoderNumber: string;
  provider: string;
  name: string | null;
  package: string | null;
  isDefault: boolean;
}

interface Subscription {
  id: string;
  meterNumber?: string;
  decoderNumber?: string;
  disco?: string;
  provider?: string;
  amount: number;
  deliveryDate: string;
  nextRenewalDate: string;
  type: "ELECTRICITY" | "CABLE_TV";
}

interface DisCo {
  id: string;
  name: string;
  code: string;
  discoId: number;
}

interface CableProvider {
  id: string;
  name: string;
  code: string;
}

interface SubscriptionClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
  };
  savedMeters: SavedMeter[];
  savedDecoders: SavedDecoder[];
  discos: DisCo[];
  cableProviders: CableProvider[];
  recommendedAmounts: { label: string; value: number }[];
  initialSubscriptions: Subscription[];
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

// Service Type Button
const ServiceTypeButton = ({
  type,
  icon,
  label,
  description,
  isSelected,
  onClick,
}: {
  type: string;
  icon: string;
  label: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-all duration-200 ${
        isSelected
          ? "border-blue-400 bg-blue-50 text-gray-900 shadow-md dark:border-blue-600 dark:bg-blue-950/40 dark:text-white"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800"
      }`}
    >
      <div className="h-10 w-10 rounded-full flex items-center justify-center text-2xl">
        {icon}
      </div>
      <span className={`mt-1 text-sm font-semibold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
        {label}
      </span>
      <span className={`text-xs ${isSelected ? "text-blue-500/70 dark:text-blue-400/70" : "text-gray-500 dark:text-gray-400"}`}>
        {description}
      </span>
    </button>
  );
};

// Saved Item Component
const SavedItem = ({
  item,
  type,
  isSelected,
  onSelect,
  onRemove,
  onGenerateQR,
  onSetDefault,
}: {
  item: SavedMeter | SavedDecoder;
  type: "electricity" | "cable";
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onGenerateQR: () => void;
  onSetDefault: () => void;
}) => {
  const identifier = type === "electricity" 
    ? (item as SavedMeter).meterNumber 
    : (item as SavedDecoder).decoderNumber;
  const provider = type === "electricity" 
    ? (item as SavedMeter).disco 
    : (item as SavedDecoder).provider;
  const name = item.name || (type === "electricity" ? "Meter" : "Decoder");
  const extra = type === "electricity" 
    ? (item as SavedMeter).meterType 
    : (item as SavedDecoder).package;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border-2 p-3 transition-all cursor-pointer ${
        isSelected
          ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40"
          : "border-gray-200 hover:border-[#1e293b]/50 dark:border-gray-700"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          {type === "electricity" ? (
            <Lightbulb className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Tv className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
            {item.isDefault && (
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {identifier} • {provider}
            {extra && ` • ${extra}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetDefault();
          }}
          className="rounded-lg p-2 text-gray-400 hover:text-yellow-500 transition-colors"
          title={item.isDefault ? "Default" : "Set as default"}
        >
          {item.isDefault ? (
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGenerateQR();
          }}
          className="rounded-lg p-2 text-gray-400 hover:text-[#1e293b] transition-colors"
          title="View QR Code"
        >
          <QrCode className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-lg p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        {isSelected && <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      </div>
    </div>
  );
};

// QR Code List View Component
const QRCodeListView = ({
  items,
  type,
  onGenerateQR,
}: {
  items: (SavedMeter | SavedDecoder)[];
  type: "electricity" | "cable";
  onGenerateQR: (identifier: string, provider: string, serviceType: string) => void;
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <QrCode className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="mt-2 text-sm">No saved {type === "electricity" ? "meters" : "decoders"}</p>
        <p className="text-xs">Add one to generate a QR code</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => {
        const identifier = type === "electricity" 
          ? (item as SavedMeter).meterNumber 
          : (item as SavedDecoder).decoderNumber;
        const provider = type === "electricity" 
          ? (item as SavedMeter).disco 
          : (item as SavedDecoder).provider;
        const name = item.name || (type === "electricity" ? "Meter" : "Decoder");

        return (
          <button
            key={item.id}
            onClick={() => onGenerateQR(identifier, provider, type === "electricity" ? "Electricity" : "Cable TV")}
            className="flex flex-col items-center rounded-lg border-2 border-gray-200 p-3 transition-all hover:border-[#1e293b] hover:shadow-md dark:border-gray-700 dark:hover:border-gray-500"
          >
            <div className="relative mb-2">
              <div className="h-16 w-16 rounded-lg bg-[#1e293b] flex items-center justify-center">
                <QrCode className="h-8 w-8 text-white" />
              </div>
              {item.isDefault && (
                <div className="absolute -top-1 -right-1 rounded-full bg-yellow-500 p-0.5">
                  <Star className="h-3 w-3 text-white fill-white" />
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white text-center line-clamp-1">
              {name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {identifier}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {provider}
            </p>
          </button>
        );
      })}
    </div>
  );
};

// ✅ Updated QR Code Modal with reduced height and better organization
const QRCodeModal = ({
  isOpen,
  onClose,
  identifier,
  serviceType,
  provider,
  onQuickOrder,
  businessName = "Bilscore",
}: {
  isOpen: boolean;
  onClose: () => void;
  identifier: string;
  serviceType: string;
  provider: string;
  onQuickOrder: () => void;
  businessName?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
  };

  // ✅ Generate hashed QR URL
  const qrValue = generateQRUrl(getBaseUrl(), {
    identifier: identifier,
    type: serviceType.toLowerCase(),
    provider: provider,
  });

  // Extract hash for display
  const urlParams = new URLSearchParams(qrValue.split('?')[1]);
  const hashShort = urlParams.get('h')?.substring(0, 8) || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast.success("Link copied to clipboard!");
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

      canvas.width = 300;
      canvas.height = 300;
      ctx?.drawImage(img, 0, 0, 300, 300);

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
          text: `Scan to pay for ${provider} ${serviceType.toLowerCase()} ${identifier}`,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-gray-800 z-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-4">
          {/* Header - Compact */}
          <div className="text-center mb-3">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b] shadow-lg">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {serviceType} QR Code
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {provider} • {identifier}
            </p>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
              <Shield className="h-3 w-3" />
              Secured • {hashShort}...
            </div>
          </div>

          {/* QR Code - Smaller */}
          <div ref={qrRef} className="flex justify-center mb-3">
            <div className="rounded-xl border-2 border-gray-200 bg-white p-3 dark:border-gray-700">
              <QRCode
                value={qrValue}
                size={160}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox="0 0 256 256"
                bgColor="#ffffff"
                fgColor="#1e293b"
              />
              <div className="mt-2 text-center">
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {businessName}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {serviceType} • {identifier}
                </p>
              </div>
            </div>
          </div>

          {/* Details - Compact Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Type</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{serviceType}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Provider</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{provider}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-700 col-span-2">
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Identifier</p>
              <p className="text-sm font-mono font-medium text-gray-900 dark:text-white truncate">{identifier}</p>
            </div>
          </div>

          {/* Secure Link - Compact */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2 mb-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate flex-1">
                {qrValue}
              </p>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 text-gray-400 hover:text-[#1e293b] transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            {copied && (
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                ✅ Copied!
              </p>
            )}
          </div>

          {/* Actions - Compact */}
          <div className="space-y-2">
            <button
              onClick={onQuickOrder}
              className="w-full rounded-lg bg-[#1e293b] py-2.5 text-sm font-medium text-white hover:bg-[#0f172a] transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Quick Order
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadQR}
                disabled={isDownloading}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download
              </button>
              <button
                onClick={handleShare}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Meter Modal
const AddMeterModal = ({
  isOpen,
  onClose,
  onAdd,
  discos,
  editingItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
  discos: DisCo[];
  editingItem?: SavedMeter | null;
}) => {
  const [meterNumber, setMeterNumber] = useState("");
  const [disco, setDisco] = useState("");
  const [name, setName] = useState("");
  const [meterType, setMeterType] = useState("Prepaid");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setMeterNumber(editingItem.meterNumber);
      setDisco(editingItem.disco);
      setName(editingItem.name || "");
      setMeterType(editingItem.meterType);
      setIsDefault(editingItem.isDefault);
    }
  }, [editingItem]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!meterNumber || !disco) {
      toast.error("Please fill in all required fields");
      return;
    }

    onAdd({
      meterNumber,
      disco,
      name: name || `${disco} Meter`,
      meterType,
      isDefault,
    });
    onClose();
    setMeterNumber("");
    setDisco("");
    setName("");
    setMeterType("Prepaid");
    setIsDefault(false);
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
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e293b]">
              {editingItem ? (
                <Edit2 className="h-6 w-6 text-white" />
              ) : (
                <Plus className="h-6 w-6 text-white" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingItem ? "Edit Meter" : "Add Meter"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {editingItem ? "Update your saved meter" : "Save your meter for quick access"}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meter Number
              </label>
              <input
                type="text"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="12345678901"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                DisCo
              </label>
              <select
                value={disco}
                onChange={(e) => setDisco(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select DisCo</option>
                {discos.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Home Meter"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meter Type
              </label>
              <select
                value={meterType}
                onChange={(e) => setMeterType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Prepaid">Prepaid</option>
                <option value="Postpaid">Postpaid</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300 text-[#1e293b] focus:ring-[#1e293b]"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">
                Set as default
              </label>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!meterNumber || !disco}
            className="mt-6 w-full rounded-lg bg-[#1e293b] py-3 text-sm font-medium text-white hover:bg-[#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingItem ? "Update Meter" : "Add Meter"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Decoder Modal
const AddDecoderModal = ({
  isOpen,
  onClose,
  onAdd,
  cableProviders,
  editingItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
  cableProviders: CableProvider[];
  editingItem?: SavedDecoder | null;
}) => {
  const [decoderNumber, setDecoderNumber] = useState("");
  const [provider, setProvider] = useState("");
  const [name, setName] = useState("");
  const [pkg, setPkg] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setDecoderNumber(editingItem.decoderNumber);
      setProvider(editingItem.provider);
      setName(editingItem.name || "");
      setPkg(editingItem.package || "");
      setIsDefault(editingItem.isDefault);
    }
  }, [editingItem]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!decoderNumber || !provider) {
      toast.error("Please fill in all required fields");
      return;
    }

    onAdd({
      decoderNumber,
      provider,
      name: name || `${provider} Decoder`,
      package: pkg || "Standard",
      isDefault,
    });
    onClose();
    setDecoderNumber("");
    setProvider("");
    setName("");
    setPkg("");
    setIsDefault(false);
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
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e293b]">
              {editingItem ? (
                <Edit2 className="h-6 w-6 text-white" />
              ) : (
                <Plus className="h-6 w-6 text-white" />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingItem ? "Edit Decoder" : "Add Decoder"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {editingItem ? "Update your saved decoder" : "Save your decoder for quick access"}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Decoder Number
              </label>
              <input
                type="text"
                value={decoderNumber}
                onChange={(e) => setDecoderNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="1234567890"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select Provider</option>
                {cableProviders.map((p) => (
                  <option key={p.id} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Home Decoder"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Package (optional)
              </label>
              <input
                type="text"
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                placeholder="Premium, Plus, Basic"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefaultDecoder"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300 text-[#1e293b] focus:ring-[#1e293b]"
              />
              <label htmlFor="isDefaultDecoder" className="text-sm text-gray-700 dark:text-gray-300">
                Set as default
              </label>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!decoderNumber || !provider}
            className="mt-6 w-full rounded-lg bg-[#1e293b] py-3 text-sm font-medium text-white hover:bg-[#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingItem ? "Update Decoder" : "Add Decoder"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Status Message Component
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-900/20 mb-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/30 dark:bg-green-900/20 mb-3">
        <div className="flex items-start gap-2">
          <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Scheduled successfully! 📅
            </p>
            {transactionId && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
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

// Active Schedules Component
const ActiveSchedules = ({
  subscriptions,
  isLoading,
}: {
  subscriptions: Subscription[];
  isLoading: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
        No active schedules yet. Create your first bill schedule!
      </div>
    );
  }

  const displaySubscriptions = isExpanded ? subscriptions : subscriptions.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Active Schedules
          </span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
            {subscriptions.length}
          </span>
        </div>
        {subscriptions.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-0.5"
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
        {displaySubscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {sub.meterNumber || sub.decoderNumber}
                </p>
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-400">
                  {sub.type === "ELECTRICITY" ? "⚡" : "📺"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {sub.disco || sub.provider} • {formatCurrency(sub.amount)}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-xs font-medium text-[#1e293b]">
                {formatDate(sub.deliveryDate)}
              </p>
              <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Active
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function SubscriptionClient({
  user: initialUser,
  savedMeters: initialMeters = [],
  savedDecoders: initialDecoders = [],
  discos,
  cableProviders,
  recommendedAmounts,
  initialSubscriptions = [],
}: SubscriptionClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [serviceType, setServiceType] = useState<"electricity" | "cable">("electricity");
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  
  const [meters, setMeters] = useState<SavedMeter[]>([]);
  const [decoders, setDecoders] = useState<SavedDecoder[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<string | null>(null);
  const [selectedDecoder, setSelectedDecoder] = useState<string | null>(null);
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [isEnsuringWallet, setIsEnsuringWallet] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ identifier: string; provider: string; serviceType: string } | null>(null);
  const [showAddMeterModal, setShowAddMeterModal] = useState(false);
  const [showAddDecoderModal, setShowAddDecoderModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    transactionId: string;
    amount: number;
    identifier: string;
    serviceType: string;
    provider: string;
    isScheduled?: boolean;
  } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"meters" | "qrcodes">("meters");
  const [editingMeter, setEditingMeter] = useState<SavedMeter | null>(null);
  const [editingDecoder, setEditingDecoder] = useState<SavedDecoder | null>(null);
  
  const currentMeter = meters.find((m) => m.id === selectedMeter);
  const currentDecoder = decoders.find((d) => d.id === selectedDecoder);

  // Fetch saved meters and decoders from API on mount
  useEffect(() => {
    const fetchSavedItems = async () => {
      try {
        const metersRes = await fetch("/api/saved-meters");
        if (metersRes.ok) {
          const metersData = await metersRes.json();
          if (metersData.success && metersData.data) {
            setMeters(metersData.data);
            const defaultMeter = metersData.data.find((m: SavedMeter) => m.isDefault);
            if (defaultMeter) {
              setSelectedMeter(defaultMeter.id);
            } else if (metersData.data.length > 0) {
              setSelectedMeter(metersData.data[0].id);
            }
          }
        }

        const decodersRes = await fetch("/api/saved-decoders");
        if (decodersRes.ok) {
          const decodersData = await decodersRes.json();
          if (decodersData.success && decodersData.data) {
            setDecoders(decodersData.data);
            const defaultDecoder = decodersData.data.find((d: SavedDecoder) => d.isDefault);
            if (defaultDecoder) {
              setSelectedDecoder(defaultDecoder.id);
            } else if (decodersData.data.length > 0) {
              setSelectedDecoder(decodersData.data[0].id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch saved items:", error);
      }
    };

    fetchSavedItems();
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

  // Save meter to database
  const saveMeter = async (data: any) => {
    try {
      const response = await fetch("/api/saved-meters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error("Failed to save meter:", error);
      throw error;
    }
  };

  // Save decoder to database
  const saveDecoder = async (data: any) => {
    try {
      const response = await fetch("/api/saved-decoders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error("Failed to save decoder:", error);
      throw error;
    }
  };

  const handleAddMeter = async (data: any) => {
    try {
      const saved = await saveMeter(data);
      setMeters([...meters, saved]);
      if (saved.isDefault || meters.length === 0) {
        setSelectedMeter(saved.id);
      }
      toast.success("Meter saved successfully!");
    } catch (error) {
      toast.error("Failed to save meter");
    }
  };

  const handleAddDecoder = async (data: any) => {
    try {
      const saved = await saveDecoder(data);
      setDecoders([...decoders, saved]);
      if (saved.isDefault || decoders.length === 0) {
        setSelectedDecoder(saved.id);
      }
      toast.success("Decoder saved successfully!");
    } catch (error) {
      toast.error("Failed to save decoder");
    }
  };

  const handleUpdateMeter = async (data: any) => {
    try {
      if (!editingMeter) return;
      const response = await fetch(`/api/saved-meters/${editingMeter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        setMeters(meters.map(m => m.id === editingMeter.id ? result.data : m));
        toast.success("Meter updated successfully!");
        setShowAddMeterModal(false);
        setEditingMeter(null);
      }
    } catch (error) {
      toast.error("Failed to update meter");
    }
  };

  const handleUpdateDecoder = async (data: any) => {
    try {
      if (!editingDecoder) return;
      const response = await fetch(`/api/saved-decoders/${editingDecoder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        setDecoders(decoders.map(d => d.id === editingDecoder.id ? result.data : d));
        toast.success("Decoder updated successfully!");
        setShowAddDecoderModal(false);
        setEditingDecoder(null);
      }
    } catch (error) {
      toast.error("Failed to update decoder");
    }
  };

  const handleRemoveMeter = async (meterId: string) => {
    try {
      const response = await fetch(`/api/saved-meters/${meterId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        const updatedMeters = meters.filter((m) => m.id !== meterId);
        setMeters(updatedMeters);
        if (selectedMeter === meterId) {
          setSelectedMeter(updatedMeters.length > 0 ? updatedMeters[0].id : null);
        }
        toast.success("Meter removed");
      }
    } catch (error) {
      toast.error("Failed to remove meter");
    }
  };

  const handleRemoveDecoder = async (decoderId: string) => {
    try {
      const response = await fetch(`/api/saved-decoders/${decoderId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        const updatedDecoders = decoders.filter((d) => d.id !== decoderId);
        setDecoders(updatedDecoders);
        if (selectedDecoder === decoderId) {
          setSelectedDecoder(updatedDecoders.length > 0 ? updatedDecoders[0].id : null);
        }
        toast.success("Decoder removed");
      }
    } catch (error) {
      toast.error("Failed to remove decoder");
    }
  };

  const handleSetDefaultMeter = async (meterId: string) => {
    try {
      const response = await fetch(`/api/saved-meters/${meterId}/default`, {
        method: "PUT",
      });
      const result = await response.json();
      if (result.success) {
        setMeters(meters.map(m => ({
          ...m,
          isDefault: m.id === meterId
        })));
        toast.success("Default meter set");
      }
    } catch (error) {
      toast.error("Failed to set default");
    }
  };

  const handleSetDefaultDecoder = async (decoderId: string) => {
    try {
      const response = await fetch(`/api/saved-decoders/${decoderId}/default`, {
        method: "PUT",
      });
      const result = await response.json();
      if (result.success) {
        setDecoders(decoders.map(d => ({
          ...d,
          isDefault: d.id === decoderId
        })));
        toast.success("Default decoder set");
      }
    } catch (error) {
      toast.error("Failed to set default");
    }
  };

  const handleMeterSelect = (meterId: string) => {
    setSelectedMeter(meterId);
    setError("");
  };

  const handleDecoderSelect = (decoderId: string) => {
    setSelectedDecoder(decoderId);
    setError("");
  };

  const handleAmountSelect = (value: number) => {
    setSelectedAmount(value);
    setCustomAmount("");
    setError("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
    setError("");
  };

  const handleGenerateQR = (identifier: string, provider: string, serviceType: string) => {
    setQrData({ identifier, provider, serviceType });
    setShowQRModal(true);
  };

  const handleQuickOrder = () => {
    if (!qrData) return;
    setShowQRModal(false);
    
    if (qrData.serviceType === "Electricity") {
      const meter = meters.find(m => m.meterNumber === qrData.identifier);
      if (meter) {
        setSelectedMeter(meter.id);
        setServiceType("electricity");
      }
    } else {
      const decoder = decoders.find(d => d.decoderNumber === qrData.identifier);
      if (decoder) {
        setSelectedDecoder(decoder.id);
        setServiceType("cable");
      }
    }
    
    setTimeout(() => {
      handleCreateSubscription();
    }, 500);
  };

  const getTotalAmount = () => {
    const amount = selectedAmount || parseInt(customAmount);
    return amount || 0;
  };

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount("");
    setDeliveryDate("");
    setError("");
    setSuccess(false);
    setTransactionId("");
  };

  const handleCreateSubscription = async () => {
    if (serviceType === "electricity" && !selectedMeter) {
      setError("Please select a meter");
      toast.error("Please select a meter");
      return;
    }
    if (serviceType === "cable" && !selectedDecoder) {
      setError("Please select a decoder");
      toast.error("Please select a decoder");
      return;
    }

    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount < 100) {
      setError("Please enter a valid amount (minimum ₦100)");
      toast.error("Please enter a valid amount (minimum ₦100)");
      return;
    }

    if (!deliveryDate) {
      setError("Please select a delivery date");
      toast.error("Please select a delivery date");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const service = serviceType === "electricity" ? "electricity" : "cable";
      
      const payload: any = {
        serviceType: service,
        meterNumber: serviceType === "electricity" ? currentMeter?.meterNumber : null,
        decoderNumber: serviceType === "cable" ? currentDecoder?.decoderNumber : null,
        discoCode: serviceType === "electricity" ? currentMeter?.disco : null,
        provider: serviceType === "cable" ? currentDecoder?.provider : null,
        amount,
        deliveryDate,
        paymentOption: "schedule_only",
      };

      const response = await fetch("/api/vendors/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create subscription");
      }

      const nextDate = new Date(deliveryDate);
      nextDate.setMonth(nextDate.getMonth() + 1);

      const newSubscription: Subscription = {
        id: String(Date.now()),
        meterNumber: serviceType === "electricity" ? currentMeter?.meterNumber : undefined,
        decoderNumber: serviceType === "cable" ? currentDecoder?.decoderNumber : undefined,
        disco: serviceType === "electricity" ? currentMeter?.disco : undefined,
        provider: serviceType === "cable" ? currentDecoder?.provider : undefined,
        amount,
        deliveryDate: deliveryDate,
        nextRenewalDate: nextDate.toISOString(),
        type: serviceType === "electricity" ? "ELECTRICITY" : "CABLE_TV",
      };

      setSubscriptions([...subscriptions, newSubscription]);
      const txId = result.data?.id || result.data?.transactionId || String(Date.now());
      setTransactionId(txId);
      
      setSuccessData({
        transactionId: txId,
        amount,
        identifier: serviceType === "electricity" ? currentMeter?.meterNumber || "" : currentDecoder?.decoderNumber || "",
        serviceType: serviceType === "electricity" ? "Electricity" : "Cable TV",
        provider: serviceType === "electricity" ? currentMeter?.disco || "" : currentDecoder?.provider || "",
        isScheduled: true,
      });
      setSuccess(true);

      // Show success toast notification
      const serviceLabel = serviceType === "electricity" ? "Electricity" : "Cable TV";
      const deliveryLabel = formatDate(deliveryDate);
      const amountLabel = formatCurrency(amount);
      
      if (result.data?.tokenPurchased) {
        toast.success(`✅ ${serviceLabel} Scheduled with Token!`, {
          description: `Token: ${result.data.token} • Delivery: ${deliveryLabel} • ${amountLabel}`,
          duration: 6000,
          icon: "🔑",
        });
      } else if (result.data?.deliveryStatus === "PENDING_PURCHASE") {
        toast.info(`⏳ ${serviceLabel} Scheduled - Token Pending`, {
          description: `Delivery: ${deliveryLabel} • ${amountLabel} • We'll purchase token before delivery`,
          duration: 5000,
          icon: "⏳",
        });
      } else {
        toast.success(`📅 ${serviceLabel} Scheduled Successfully!`, {
          description: `Delivery: ${deliveryLabel} • ${amountLabel}`,
          duration: 5000,
          icon: "📅",
        });
      }

      // Auto-clear success after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);

      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to create subscription");
      toast.error("❌ Failed to create subscription", {
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

  const totalAmount = getTotalAmount();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Modals */}
        {qrData && (
          <QRCodeModal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            identifier={qrData.identifier}
            provider={qrData.provider}
            serviceType={qrData.serviceType}
            onQuickOrder={handleQuickOrder}
          />
        )}

        <AddMeterModal
          isOpen={showAddMeterModal}
          onClose={() => {
            setShowAddMeterModal(false);
            setEditingMeter(null);
          }}
          onAdd={editingMeter ? handleUpdateMeter : handleAddMeter}
          discos={discos}
          editingItem={editingMeter}
        />

        <AddDecoderModal
          isOpen={showAddDecoderModal}
          onClose={() => {
            setShowAddDecoderModal(false);
            setEditingDecoder(null);
          }}
          onAdd={editingDecoder ? handleUpdateDecoder : handleAddDecoder}
          cableProviders={cableProviders}
          editingItem={editingDecoder}
        />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Bill Scheduler</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Schedule electricity token or cable TV deliveries with auto-renewal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Active Schedules */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <ActiveSchedules
                subscriptions={subscriptions}
                isLoading={false}
              />
            </div>

            {/* Service Type Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Select Service Type
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <ServiceTypeButton
                  type="electricity"
                  icon="⚡"
                  label="Electricity"
                  description="Schedule tokens"
                  isSelected={serviceType === "electricity"}
                  onClick={() => {
                    setServiceType("electricity");
                    setSelectedDecoder(null);
                  }}
                />
                <ServiceTypeButton
                  type="cable"
                  icon="📺"
                  label="Cable TV"
                  description="Schedule subscriptions"
                  isSelected={serviceType === "cable"}
                  onClick={() => {
                    setServiceType("cable");
                    setSelectedMeter(null);
                  }}
                />
              </div>
            </div>

            {/* Saved Meters/Decoders */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {serviceType === "electricity" ? "Saved Meters" : "Saved Decoders"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {serviceType === "electricity" ? meters.length : decoders.length} saved
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
                    <button
                      onClick={() => setActiveSubTab("meters")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                        activeSubTab === "meters"
                          ? "bg-[#1e293b] text-white"
                          : "text-gray-500 hover:text-[#1e293b] dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <Eye className="h-4 w-4 inline mr-1" />
                      List
                    </button>
                    <button
                      onClick={() => setActiveSubTab("qrcodes")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                        activeSubTab === "qrcodes"
                          ? "bg-[#1e293b] text-white"
                          : "text-gray-500 hover:text-[#1e293b] dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <QrCode className="h-4 w-4 inline mr-1" />
                      QR Codes
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (serviceType === "electricity") {
                        setEditingMeter(null);
                        setShowAddMeterModal(true);
                      } else {
                        setEditingDecoder(null);
                        setShowAddDecoderModal(true);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#1e293b] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f172a] transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>

              {activeSubTab === "meters" ? (
                <div className="space-y-2">
                  {(serviceType === "electricity" ? meters : decoders).length > 0 ? (
                    (serviceType === "electricity" ? meters : decoders).map((item) => (
                      <SavedItem
                        key={item.id}
                        item={item}
                        type={serviceType}
                        isSelected={serviceType === "electricity" 
                          ? selectedMeter === item.id 
                          : selectedDecoder === item.id}
                        onSelect={() => {
                          if (serviceType === "electricity") {
                            handleMeterSelect(item.id);
                          } else {
                            handleDecoderSelect(item.id);
                          }
                        }}
                        onRemove={() => {
                          if (serviceType === "electricity") {
                            handleRemoveMeter(item.id);
                          } else {
                            handleRemoveDecoder(item.id);
                          }
                        }}
                        onGenerateQR={() => {
                          const identifier = serviceType === "electricity" 
                            ? (item as SavedMeter).meterNumber 
                            : (item as SavedDecoder).decoderNumber;
                          const provider = serviceType === "electricity" 
                            ? (item as SavedMeter).disco 
                            : (item as SavedDecoder).provider;
                          handleGenerateQR(identifier, provider, serviceType === "electricity" ? "Electricity" : "Cable TV");
                        }}
                        onSetDefault={() => {
                          if (serviceType === "electricity") {
                            handleSetDefaultMeter(item.id);
                          } else {
                            handleSetDefaultDecoder(item.id);
                          }
                        }}
                      />
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <Lightbulb className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm">No saved {serviceType === "electricity" ? "meters" : "decoders"}</p>
                      <button
                        onClick={() => {
                          if (serviceType === "electricity") {
                            setEditingMeter(null);
                            setShowAddMeterModal(true);
                          } else {
                            setEditingDecoder(null);
                            setShowAddDecoderModal(true);
                          }
                        }}
                        className="mt-1 text-sm text-[#1e293b] hover:underline"
                      >
                        Add your first {serviceType === "electricity" ? "meter" : "decoder"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <QRCodeListView
                  items={serviceType === "electricity" ? meters : decoders}
                  type={serviceType}
                  onGenerateQR={(identifier, provider, serviceType) => {
                    handleGenerateQR(identifier, provider, serviceType);
                  }}
                />
              )}
            </div>

            {/* Amount Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Amount</h2>
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
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-base">₦</div>
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Enter custom amount (min ₦100)"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2.5 text-base font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Delivery Date */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Delivery Date
              </h2>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Minimum 3 days from today for delivery
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-900/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Order Summary */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sticky top-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Order Summary
              </h3>
              
              <StatusMessage 
                error={error} 
                success={success} 
                transactionId={transactionId} 
              />

              {!error && !success && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Service</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {serviceType === "electricity" ? "Electricity" : "Cable TV"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {serviceType === "electricity" ? "Meter" : "Decoder"}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {serviceType === "electricity" 
                        ? currentMeter?.name || "Not selected"
                        : currentDecoder?.name || "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {serviceType === "electricity" ? "Meter Number" : "Decoder Number"}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {serviceType === "electricity"
                        ? currentMeter?.meterNumber || "—"
                        : currentDecoder?.decoderNumber || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Delivery Date</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {deliveryDate ? formatDate(deliveryDate) : "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {totalAmount > 0 ? formatCurrency(totalAmount) : "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Service Fee</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {totalAmount > 0 ? formatCurrency(0) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Wallet Balance</span>
                    <span className={`text-sm font-medium ${user.walletBalance >= totalAmount ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(user.walletBalance)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 mt-1 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-[#1e293b] dark:text-white">
                      {totalAmount > 0 ? formatCurrency(totalAmount) : "—"}
                    </span>
                  </div>

                  <button
                    onClick={handleCreateSubscription}
                    disabled={isLoading || 
                      (serviceType === "electricity" ? !selectedMeter : !selectedDecoder) ||
                      totalAmount === 0 ||
                      !deliveryDate}
                    className="w-full mt-3 rounded-lg bg-[#1e293b] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0f172a] hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1e293b]/20"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Schedule
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Amount Button Component (used in the page)
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