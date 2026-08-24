// app/dashboard/subscriptions/page.client.tsx
// COMPLETE UPDATED VERSION - With auto-population and customer info display

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
  Search,
  Users,
  Calendar as CalendarIcon,
  Clock,
  Mail,
  User,
} from "lucide-react";

// Import QR hash utilities
import { generateQRUrl } from "~/lib/qr-hash";

// Types
interface SavedMeter {
  id: string;
  meterNumber: string;
  disco: string;
  name: string | null;
  meterType: string;
  isDefault: boolean;
  customerName?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  meterStatus?: string | null;
  lastVerified?: string | null;
}

interface PreOrder {
  id: string;
  meterNumber: string;
  disco: string;
  amount: number;
  deliveryDate: string;
  status: string;
  type: "ELECTRICITY";
}

interface DisCo {
  id: string;
  name: string;
  code: string;
  region: string;
  logo: string;
  color: string;
  meterTypes: string[];
  serviceID: string;
  discoId: number;
  isFromVTpass?: boolean;
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
  discos: DisCo[];
  recommendedAmounts: { label: string; value: number }[];
  initialPreOrders: PreOrder[];
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

// ✅ Saved Item Component - With customer info display
const SavedItem = ({
  item,
  isSelected,
  onSelect,
  onRemove,
  onGenerateQR,
  onSetDefault,
}: {
  item: SavedMeter;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onGenerateQR: () => void;
  onSetDefault: () => void;
}) => {
  const hasCustomerInfo = item.customerName || item.customerAddress || item.customerPhone || item.customerEmail;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border-2 p-3 transition-all cursor-pointer ${
        isSelected
          ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40"
          : `border-gray-200 hover:border-[#1e293b]/50 dark:border-gray-700 ${hasCustomerInfo ? 'border-green-200 dark:border-green-800/30' : ''}`
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0">
          <Lightbulb className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
              {item.name || "Meter"}
            </p>
            {item.isDefault && (
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
            {item.meterStatus && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                item.meterStatus.toLowerCase() === 'active' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {item.meterStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {item.meterNumber} • {item.disco} • {item.meterType}
          </p>
          {/* ✅ Show customer info if available */}
          {hasCustomerInfo && (
            <div className="mt-1 space-y-0.5">
              {item.customerName && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <User className="h-2.5 w-2.5" />
                  {item.customerName}
                </p>
              )}
              {item.customerAddress && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">
                  <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">{item.customerAddress}</span>
                </p>
              )}
              {item.customerPhone && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5" />
                  {item.customerPhone}
                </p>
              )}
              {item.customerEmail && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">
                  <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">{item.customerEmail}</span>
                </p>
              )}
              {item.lastVerified && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                  Verified: {new Date(item.lastVerified).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          {!hasCustomerInfo && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              No customer details available
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
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
  onGenerateQR,
}: {
  items: SavedMeter[];
  onGenerateQR: (identifier: string, provider: string, serviceType: string) => void;
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <QrCode className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="mt-2 text-sm">No saved meters</p>
        <p className="text-xs">Add one to generate a QR code</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onGenerateQR(item.meterNumber, item.disco, "Electricity")}
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
            {item.name || "Meter"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {item.meterNumber}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            {item.disco}
          </p>
          {item.customerName && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center truncate w-full">
              {item.customerName}
            </p>
          )}
        </button>
      ))}
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

  const qrValue = generateQRUrl(getBaseUrl(), {
    identifier: identifier,
    type: serviceType.toLowerCase(),
    provider: provider,
  });

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

// Add Meter Modal - WITH FULL VERIFICATION
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
  
  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [meterStatus, setMeterStatus] = useState<string>("");
  const [verificationError, setVerificationError] = useState<string>("");

  useEffect(() => {
    if (editingItem) {
      setMeterNumber(editingItem.meterNumber);
      setDisco(editingItem.disco);
      setName(editingItem.name || "");
      setMeterType(editingItem.meterType);
      setIsDefault(editingItem.isDefault);
      // If editing, mark as verified if meter number exists
      if (editingItem.meterNumber) {
        setIsVerified(true);
        setCustomerName(editingItem.customerName || "Saved Meter");
        setCustomerAddress(editingItem.customerAddress || "");
        setCustomerPhone(editingItem.customerPhone || "");
        setCustomerEmail(editingItem.customerEmail || "");
        setMeterStatus(editingItem.meterStatus || "");
      }
    }
  }, [editingItem]);

  // Reset form when modal closes
  const handleClose = () => {
    if (!editingItem) {
      setMeterNumber("");
      setDisco("");
      setName("");
      setMeterType("Prepaid");
      setIsDefault(false);
      setIsVerified(false);
      setCustomerName("");
      setCustomerAddress("");
      setCustomerPhone("");
      setCustomerEmail("");
      setMeterStatus("");
      setVerificationError("");
    }
    onClose();
  };

  if (!isOpen) return null;

  // Handle meter verification
  const handleVerifyMeter = async () => {
    if (!meterNumber || meterNumber.length < 7) {
      setVerificationError("Please enter a valid meter number (minimum 7 digits)");
      toast.error("Please enter a valid meter number");
      return;
    }

    if (!disco) {
      setVerificationError("Please select a DisCo first");
      toast.error("Please select a DisCo first");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");
    setCustomerName("");
    setCustomerAddress("");
    setCustomerPhone("");
    setCustomerEmail("");
    setMeterStatus("");

    try {
      const selectedDisco = discos.find(d => d.code === disco);
      if (!selectedDisco) {
        throw new Error("DisCo not found");
      }

      const response = await fetch("/api/vendors/electricity/verify-meter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceID: selectedDisco.serviceID || selectedDisco.code.toLowerCase(),
          meterNumber: meterNumber,
          meterType: meterType.toLowerCase(),
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setIsVerified(true);
        setCustomerName(result.data.customerName || "Customer Found");
        setCustomerAddress(result.data.customerAddress || "");
        setCustomerPhone(result.data.customerPhone || "");
        setCustomerEmail(result.data.customerEmail || "");
        setMeterStatus(result.data.status || "Active");
        // Auto-populate name if not set
        if (!name) {
          setName(result.data.customerName || `${disco} Meter`);
        }
        toast.success(`✅ Meter verified: ${result.data.customerName}`);
      } else {
        setVerificationError(result.error || "Meter verification failed. Please check the meter number.");
        setIsVerified(false);
        toast.error("❌ Meter verification failed", {
          description: result.error || "Please check the meter number",
        });
      }
    } catch (err: any) {
      setVerificationError(err.message || "Verification failed");
      setIsVerified(false);
      toast.error("❌ Verification failed", {
        description: err.message || "Please try again",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = () => {
    if (!meterNumber || !disco) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isVerified && !editingItem) {
      toast.error("Please verify the meter first");
      return;
    }

    onAdd({
      meterNumber,
      disco,
      name: name || `${disco} Meter`,
      meterType,
      isDefault,
      customerName: customerName || name || undefined,
      customerAddress: customerAddress || undefined,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail || undefined,
      meterStatus: meterStatus || undefined,
      lastVerified: isVerified ? new Date().toISOString() : undefined,
    });
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
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
            {/* Meter Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meter Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={meterNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  setMeterNumber(value);
                  setIsVerified(false);
                  setCustomerName("");
                  setCustomerAddress("");
                  setCustomerPhone("");
                  setCustomerEmail("");
                  setMeterStatus("");
                  setVerificationError("");
                }}
                placeholder="12345678901"
                className={`w-full rounded-lg border px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:bg-gray-800 dark:text-white ${
                  verificationError ? "border-red-400 ring-2 ring-red-200" : "border-gray-200"
                }`}
                disabled={!!editingItem}
              />
              {verificationError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {verificationError}
                </p>
              )}
            </div>

            {/* DisCo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                DisCo <span className="text-red-500">*</span>
              </label>
              <select
                value={disco}
                onChange={(e) => {
                  setDisco(e.target.value);
                  setIsVerified(false);
                  setCustomerName("");
                  setCustomerAddress("");
                  setCustomerPhone("");
                  setCustomerEmail("");
                  setMeterStatus("");
                  setVerificationError("");
                }}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                disabled={!!editingItem}
              >
                <option value="">Select DisCo</option>
                {discos.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
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

            {/* Meter Type */}
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

            {/* Verify Meter Button */}
            {!editingItem && (
              <div>
                <button
                  onClick={handleVerifyMeter}
                  disabled={isVerifying || !meterNumber || meterNumber.length < 7 || !disco}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isVerified
                      ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying Meter...
                    </>
                  ) : isVerified ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Verified ✓
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Verify Meter
                    </>
                  )}
                </button>
                
                {/* Verification Result - FULL INFO */}
                {isVerified && customerName && (
                  <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2.5 dark:border-green-900/30 dark:bg-green-900/20">
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400">
                          Customer: {customerName}
                        </p>
                        {customerAddress && (
                          <p className="text-xs text-green-600 dark:text-green-300 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {customerAddress}
                          </p>
                        )}
                        {customerPhone && (
                          <p className="text-xs text-green-600 dark:text-green-300">
                            📞 {customerPhone}
                          </p>
                        )}
                        {customerEmail && (
                          <p className="text-xs text-green-600 dark:text-green-300">
                            ✉️ {customerEmail}
                          </p>
                        )}
                        <p className="text-[10px] text-green-500 dark:text-green-400 mt-0.5">
                          Meter: {meterNumber} • {meterType} • Status: {meterStatus || "Active"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="mt-1 text-xs text-gray-400">
                  {isVerified 
                    ? "✅ Meter verified successfully!" 
                    : "Verify the meter to confirm it's active and get customer details"}
                </p>
              </div>
            )}

            {/* Set as Default */}
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
            disabled={(!editingItem && !isVerified) || !meterNumber || !disco}
            className="mt-6 w-full rounded-lg bg-[#1e293b] py-3 text-sm font-medium text-white hover:bg-[#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {editingItem ? (
              <>
                <Edit2 className="h-4 w-4" />
                Update Meter
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Meter
              </>
            )}
          </button>

          {!editingItem && !isVerified && meterNumber && disco && (
            <p className="mt-2 text-center text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ Please verify the meter before adding
            </p>
          )}
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
  preOrders,
  isLoading,
}: {
  preOrders: PreOrder[];
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

  if (!preOrders || preOrders.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
        No active schedules yet. Create your first electricity token schedule!
      </div>
    );
  }

  const displayPreOrders = isExpanded ? preOrders : preOrders.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Active Schedules
          </span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
            {preOrders.length}
          </span>
        </div>
        {preOrders.length > 3 && (
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
        {displayPreOrders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {order.meterNumber}
                </p>
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-400">
                  ⚡
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {order.disco} • {formatCurrency(order.amount)}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-xs font-medium text-[#1e293b]">
                {formatDate(order.deliveryDate)}
              </p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                order.status === "PURCHASED" 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : order.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {order.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Amount Button Component
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

// Combined Amount & Delivery Date Component
const AmountAndDeliveryCard = ({
  recommendedAmounts,
  selectedAmount,
  onAmountSelect,
  customAmount,
  onCustomAmountChange,
  deliveryDate,
  onDeliveryDateChange,
}: {
  recommendedAmounts: { label: string; value: number }[];
  selectedAmount: number | null;
  onAmountSelect: (value: number) => void;
  customAmount: string;
  onCustomAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  deliveryDate: string;
  onDeliveryDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
        Amount & Delivery Date
      </h2>
      
      {/* Amount Section */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Select Amount
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
          {recommendedAmounts.map((amount) => (
            <AmountButton
              key={amount.value}
              amount={amount}
              isSelected={selectedAmount === amount.value}
              onClick={() => onAmountSelect(amount.value)}
            />
          ))}
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-base">₦</div>
          <input
            type="text"
            value={customAmount}
            onChange={onCustomAmountChange}
            placeholder="Enter custom amount (min ₦100)"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2.5 text-base font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-3" />

      {/* Delivery Date Section */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Delivery Date
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <input
            type="date"
            value={deliveryDate}
            onChange={onDeliveryDateChange}
            min={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 py-2.5 text-base font-medium focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Minimum 3 days from today for delivery
        </p>
      </div>
    </div>
  );
};

// Main Component
export function SubscriptionClient({
  user: initialUser,
  savedMeters: initialMeters = [],
  discos,
  recommendedAmounts,
  initialPreOrders = [],
}: SubscriptionClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [preOrders, setPreOrders] = useState(initialPreOrders);
  
  const [meters, setMeters] = useState<SavedMeter[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<string | null>(null);
  
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
  
  // PIN State
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string>("");
  
  const currentMeter = meters.find((m) => m.id === selectedMeter);

  // Fetch saved meters from API on mount
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

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setPin(value);
      setPinError("");
    }
  };

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

  // Update meter in database
  const updateMeter = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/saved-meters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error("Failed to update meter:", error);
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

  const handleUpdateMeter = async (data: any) => {
    try {
      if (!editingMeter) return;
      const updated = await updateMeter(editingMeter.id, data);
      setMeters(meters.map(m => m.id === editingMeter.id ? updated : m));
      toast.success("Meter updated successfully!");
      setShowAddMeterModal(false);
      setEditingMeter(null);
    } catch (error) {
      toast.error("Failed to update meter");
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

  // ✅ Updated: Auto-populate meter data when selected
  const handleMeterSelect = (meterId: string) => {
    const meter = meters.find(m => m.id === meterId);
    if (meter) {
      setSelectedMeter(meterId);
      // Auto-populate the meter data (no re-verification needed)
      // The form will use the selected meter data
      setError("");
      setPinError("");
      
      if (meter.customerName) {
        toast.success(`✅ Selected ${meter.customerName}'s meter`);
      } else {
        toast.success(`✅ Selected meter ${meter.meterNumber}`);
      }
    }
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

  const handleDeliveryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeliveryDate(e.target.value);
    setError("");
    setPinError("");
  };

  const handleGenerateQR = (identifier: string, provider: string, serviceType: string) => {
    setQrData({ identifier, provider, serviceType });
    setShowQRModal(true);
  };

  const handleQuickOrder = () => {
    if (!qrData) return;
    setShowQRModal(false);
    
    const meter = meters.find(m => m.meterNumber === qrData.identifier);
    if (meter) {
      setSelectedMeter(meter.id);
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
    setPin("");
    setPinError("");
  };

  const handleCreateSubscription = async () => {
    // Validate PIN first
    if (!pin || pin.length < 4) {
      setPinError("Please enter your 4-6 digit transaction PIN");
      toast.error("Please enter your transaction PIN");
      return;
    }

    if (!selectedMeter) {
      setError("Please select a meter");
      toast.error("Please select a meter");
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
    setPinError("");

    try {
      const payload: any = {
        serviceType: "electricity",
        meterNumber: currentMeter?.meterNumber,
        discoCode: currentMeter?.disco,
        amount,
        deliveryDate,
        paymentOption: "schedule_only",
        pin: pin,
        // ✅ Pass customer data if available
        customerName: currentMeter?.customerName || null,
        customerAddress: currentMeter?.customerAddress || null,
        customerPhone: currentMeter?.customerPhone || null,
        customerEmail: currentMeter?.customerEmail || null,
        meterStatus: currentMeter?.meterStatus || null,
      };

      const response = await fetch("/api/vendors/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.error?.toLowerCase().includes('pin') || result.status === 401 || result.status === 403) {
          setPinError(result.error || "Invalid PIN. Please try again.");
          toast.error("❌ Invalid PIN", {
            description: result.error || "Please check your transaction PIN",
          });
          throw new Error(result.error || "Invalid PIN");
        }
        throw new Error(result.error || "Failed to create subscription");
      }

      const nextDate = new Date(deliveryDate);
      nextDate.setMonth(nextDate.getMonth() + 1);

      const newPreOrder: PreOrder = {
        id: String(Date.now()),
        meterNumber: currentMeter?.meterNumber || "",
        disco: currentMeter?.disco || "",
        amount,
        deliveryDate: deliveryDate,
        status: result.data?.deliveryStatus || "PENDING",
        type: "ELECTRICITY",
      };

      setPreOrders([...preOrders, newPreOrder]);
      const txId = result.data?.id || result.data?.transactionId || String(Date.now());
      setTransactionId(txId);
      
      setSuccessData({
        transactionId: txId,
        amount,
        identifier: currentMeter?.meterNumber || "",
        serviceType: "Electricity",
        provider: currentMeter?.disco || "",
        isScheduled: true,
      });
      setSuccess(true);

      const deliveryLabel = formatDate(deliveryDate);
      const amountLabel = formatCurrency(amount);
      
      if (result.data?.tokenPurchased) {
        toast.success(`✅ Electricity Token Scheduled with Token!`, {
          description: `Token: ${result.data.token} • Delivery: ${deliveryLabel} • ${amountLabel}`,
          duration: 6000,
          icon: "🔑",
        });
      } else if (result.data?.deliveryStatus === "PENDING_PURCHASE") {
        toast.info(`⏳ Electricity Token Scheduled - Token Pending`, {
          description: `Delivery: ${deliveryLabel} • ${amountLabel} • We'll purchase token before delivery`,
          duration: 5000,
          icon: "⏳",
        });
      } else {
        toast.success(`📅 Electricity Token Scheduled Successfully!`, {
          description: `Delivery: ${deliveryLabel} • ${amountLabel}`,
          duration: 5000,
          icon: "📅",
        });
      }

      setPin("");
      setTimeout(() => {
        setSuccess(false);
      }, 5000);

      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to create subscription");
      if (!pinError) {
        toast.error("❌ Failed to create subscription", {
          description: err.message || "Please try again",
        });
      }
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

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Electricity Token Scheduler</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Schedule electricity token deliveries with auto-renewal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Active Schedules */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <ActiveSchedules
                preOrders={preOrders}
                isLoading={false}
              />
            </div>

            {/* Saved Meters */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Saved Meters
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {meters.length} saved
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
                      setEditingMeter(null);
                      setShowAddMeterModal(true);
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
                  {meters.length > 0 ? (
                    meters.map((item) => (
                      <SavedItem
                        key={item.id}
                        item={item}
                        isSelected={selectedMeter === item.id}
                        onSelect={() => handleMeterSelect(item.id)}
                        onRemove={() => handleRemoveMeter(item.id)}
                        onGenerateQR={() => {
                          handleGenerateQR(item.meterNumber, item.disco, "Electricity");
                        }}
                        onSetDefault={() => {
                          handleSetDefaultMeter(item.id);
                        }}
                      />
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <Lightbulb className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm">No saved meters</p>
                      <button
                        onClick={() => {
                          setEditingMeter(null);
                          setShowAddMeterModal(true);
                        }}
                        className="mt-1 text-sm text-[#1e293b] hover:underline"
                      >
                        Add your first meter
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <QRCodeListView
                  items={meters}
                  onGenerateQR={(identifier, provider, serviceType) => {
                    handleGenerateQR(identifier, provider, serviceType);
                  }}
                />
              )}
            </div>

            {/* Amount & Delivery Date - COMBINED CARD */}
            <AmountAndDeliveryCard
              recommendedAmounts={recommendedAmounts}
              selectedAmount={selectedAmount}
              onAmountSelect={handleAmountSelect}
              customAmount={customAmount}
              onCustomAmountChange={handleCustomAmountChange}
              deliveryDate={deliveryDate}
              onDeliveryDateChange={handleDeliveryDateChange}
            />

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
                      Electricity
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Meter</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {currentMeter?.name || "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Meter Number</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {currentMeter?.meterNumber || "—"}
                    </span>
                  </div>

                  {/* Show customer info if available */}
                  {currentMeter?.customerName && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Customer</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                        {currentMeter.customerName}
                      </span>
                    </div>
                  )}
                  {currentMeter?.customerAddress && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Address</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                        {currentMeter.customerAddress}
                      </span>
                    </div>
                  )}
                  {currentMeter?.customerPhone && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Phone</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {currentMeter.customerPhone}
                      </span>
                    </div>
                  )}
                  {currentMeter?.customerEmail && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                        {currentMeter.customerEmail}
                      </span>
                    </div>
                  )}
                  {currentMeter?.meterStatus && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`text-sm font-medium ${
                        currentMeter.meterStatus.toLowerCase() === 'active' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {currentMeter.meterStatus}
                      </span>
                    </div>
                  )}

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

                  {/* Transaction PIN Input */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
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
                      Enter your 4-6 digit transaction PIN to confirm this schedule
                    </p>
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
                      !selectedMeter ||
                      totalAmount === 0 ||
                      !deliveryDate ||
                      !pin ||
                      pin.length < 4}
                    className="w-full mt-3 rounded-lg bg-[#1e293b] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0f172a] hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1e293b]/20"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Lock className="h-5 w-5" />
                        Confirm & Schedule
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