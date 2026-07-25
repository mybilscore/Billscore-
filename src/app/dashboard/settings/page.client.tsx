// app/dashboard/settings/page.client.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  Shield,
  Key,
  Webhook,
  Globe,
  Smartphone,
  Mail,
  Phone,
  Wallet,
  CreditCard,
  Settings,
  Check,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  AlertCircle,
  X,
  ChevronRight,
  Switch,
  LogOut,
  Save,
  Link2,
  Zap,
  Clock,
  BarChart3,
  MessageSquare,
  Tv,
  Lightbulb,
  Wifi,
  Loader2,
} from "lucide-react";

// Types
interface ApiKey {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  isActive: boolean;
  isSandbox: boolean;
  rateLimitPerMin: number;
  rateLimitPerHour: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  retryCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface Channel {
  id: string;
  type: string;
  identifier: string;
  isVerified: boolean;
  linkedAt: string;
}

interface SettingsClientProps {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    hasWallet: boolean;
    walletBalance: number;
    isDeveloper: boolean;
    referralCode: string;
  };
  developerData: {
    accountType: string;
    status: string;
    monthlyVolume: number;
    customPricing: any;
    apiKeys: ApiKey[];
    webhooks: Webhook[];
  };
  channels: Channel[];
  subscriptionCount: number;
}

// Helper
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

// ============================================================
// UI COMPONENTS
// ============================================================

// Settings Section Header
const SectionHeader = ({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon: any;
  action?: React.ReactNode;
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#040724]/10">
          <Icon className="h-5 w-5 text-[#040724]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// Settings Card
const SettingsCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 ${className}`}>
      {children}
    </div>
  );
};

// Toggle Switch
const ToggleSwitch = ({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
          enabled ? "bg-[#040724]" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};

// ============================================================
// API KEY MODAL
// ============================================================

const ApiKeyModal = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, isSandbox: boolean) => void;
}) => {
  const [name, setName] = useState("");
  const [isSandbox, setIsSandbox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    await onCreate(name, isSandbox);
    setIsLoading(false);
    setName("");
    setIsSandbox(false);
    onClose();
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
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#040724]/10">
              <Key className="h-6 w-6 text-[#040724]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create API Key</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Generate a new API key for integration</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Key Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production API Key"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-[#040724] focus:ring-2 focus:ring-[#040724]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-400">A descriptive name to identify this key</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Sandbox Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Test integration without real transactions</p>
              </div>
              <button
                onClick={() => setIsSandbox(!isSandbox)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isSandbox ? "bg-[#040724]" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isSandbox ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isLoading}
              className="w-full rounded-xl bg-[#040724] py-3 text-white hover:bg-[#1e2b5a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="h-5 w-5" />
                  Generate API Key
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// API KEY DISPLAY MODAL
// ============================================================

const ApiKeyDisplayModal = ({
  isOpen,
  onClose,
  apiKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  apiKey: { key: string; name: string } | null;
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !apiKey) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">API Key Generated</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Copy your API key now. You won't be able to see it again.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">API Key Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{apiKey.name}</p>
            </div>
            <div className="rounded-xl border-2 border-[#040724] bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your API Key</p>
                  <p className="font-mono text-sm font-bold text-[#040724] dark:text-white break-all">{apiKey.key}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 rounded-lg bg-[#040724] px-3 py-2 text-sm text-white hover:bg-[#1e2b5a] transition-all flex items-center gap-1"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/30 dark:bg-yellow-900/20">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                ⚠️ Keep this key secure. Do not share it publicly or commit it to version control.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-[#040724] py-3 text-white hover:bg-[#1e2b5a] transition-all"
          >
            I've copied my key
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// API KEY CARD
// ============================================================

const ApiKeyCard = ({
  apiKey,
  onRevoke,
}: {
  apiKey: ApiKey;
  onRevoke: (id: string) => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.keyPrefix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-gray-100 p-4 dark:border-gray-700 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 dark:text-white">{apiKey.name}</h4>
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              apiKey.isActive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {apiKey.isActive ? "Active" : "Revoked"}
            </span>
            {apiKey.isSandbox && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                Sandbox
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="font-mono text-gray-600 dark:text-gray-400">
              {apiKey.keyPrefix}••••••••
            </span>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-[#040724] transition-colors"
              title="Copy key prefix"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Rate: {apiKey.rateLimitPerMin}/min</span>
            <span>•</span>
            <span>{apiKey.rateLimitPerHour}/hour</span>
            {apiKey.lastUsedAt && (
              <>
                <span>•</span>
                <span>Last used: {formatDate(apiKey.lastUsedAt)}</span>
              </>
            )}
            {apiKey.expiresAt && (
              <>
                <span>•</span>
                <span>Expires: {formatDate(apiKey.expiresAt)}</span>
              </>
            )}
            <span>•</span>
            <span>Created: {formatDate(apiKey.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={() => onRevoke(apiKey.id)}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Revoke API key"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================
// WEBHOOK MODAL
// ============================================================

const WebhookModal = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (url: string, events: string[]) => void;
}) => {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const webhookEvents = [
    { id: "TRANSACTION_COMPLETED", label: "Transaction Completed" },
    { id: "TRANSACTION_FAILED", label: "Transaction Failed" },
    { id: "PREORDER_DELIVERED", label: "Pre-Order Delivered" },
    { id: "PREORDER_FAILED", label: "Pre-Order Failed" },
    { id: "SUBSCRIPTION_RENEWED", label: "Subscription Renewed" },
    { id: "SUBSCRIPTION_FAILED", label: "Subscription Failed" },
    { id: "WALLET_CREDITED", label: "Wallet Credited" },
    { id: "WALLET_DEBITED", label: "Wallet Debited" },
    { id: "LOAN_DISBURSED", label: "Loan Disbursed" },
    { id: "LOAN_COMPLETED", label: "Loan Completed" },
    { id: "LOAN_DEFAULTED", label: "Loan Defaulted" },
  ];

  if (!isOpen) return null;

  const toggleEvent = (eventId: string) => {
    if (events.includes(eventId)) {
      setEvents(events.filter((e) => e !== eventId));
    } else {
      setEvents([...events, eventId]);
    }
  };

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    await onCreate(url, events.length > 0 ? events : ["TRANSACTION_COMPLETED"]);
    setIsLoading(false);
    setUrl("");
    setEvents([]);
    onClose();
  };

  const selectAllEvents = () => {
    setEvents(webhookEvents.map((e) => e.id));
  };

  const deselectAllEvents = () => {
    setEvents([]);
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
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#040724]/10">
              <Webhook className="h-6 w-6 text-[#040724]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Webhook</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure a webhook for real-time events</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Webhook URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-app.com/webhook"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-[#040724] focus:ring-2 focus:ring-[#040724]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-400">HTTPS endpoints are recommended for security</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Events
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllEvents}
                    className="text-xs text-[#040724] hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <button
                    onClick={deselectAllEvents}
                    className="text-xs text-[#040724] hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 dark:border-gray-700">
                {webhookEvents.map((event) => (
                  <div key={event.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`webhook-event-${event.id}`}
                      checked={events.includes(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="rounded border-gray-300 text-[#040724] focus:ring-[#040724] h-4 w-4"
                    />
                    <label htmlFor={`webhook-event-${event.id}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {event.label}
                    </label>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {events.length === 0 ? "No events selected (will default to Transaction Completed)" : `${events.length} events selected`}
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!url.trim() || isLoading}
              className="w-full rounded-xl bg-[#040724] py-3 text-white hover:bg-[#1e2b5a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Add Webhook
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// WEBHOOK CARD
// ============================================================

const WebhookCard = ({
  webhook,
  onDelete,
  onToggle,
}: {
  webhook: Webhook;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) => {
  return (
    <div className="rounded-lg border border-gray-100 p-4 dark:border-gray-700 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">{webhook.url}</h4>
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              webhook.isActive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {webhook.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {webhook.events.map((event) => (
              <span key={event} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {event.replace("_", " ")}
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Retries: {webhook.retryCount}</span>
            {webhook.lastTriggeredAt && (
              <>
                <span>•</span>
                <span>Last triggered: {formatDate(webhook.lastTriggeredAt)}</span>
              </>
            )}
            <span>•</span>
            <span>Created: {formatDate(webhook.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onToggle(webhook.id)}
            className={`rounded-lg p-2 transition-colors ${
              webhook.isActive
                ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            title={webhook.isActive ? "Deactivate" : "Activate"}
          >
            {webhook.isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onDelete(webhook.id)}
            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Delete webhook"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN SETTINGS CLIENT
// ============================================================

export function SettingsClient({
  user,
  developerData,
  channels,
  subscriptionCount,
}: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "profile" | "notifications" | "security" | "developer" | "webhooks" | "channels"
  >("profile");

  // Profile states
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [notifyOnNewDevice, setNotifyOnNewDevice] = useState(true);
  const [notifyOnNewLocation, setNotifyOnNewLocation] = useState(true);

  // Notification states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [transactionAlerts, setTransactionAlerts] = useState(true);
  const [promotionalEmails, setPromotionalEmails] = useState(false);

  // API Keys states
  const [apiKeys, setApiKeys] = useState(developerData.apiKeys);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showApiKeyDisplay, setShowApiKeyDisplay] = useState(false);
  const [newApiKey, setNewApiKey] = useState<{ key: string; name: string } | null>(null);

  // Webhooks states
  const [webhooks, setWebhooks] = useState(developerData.webhooks);
  const [showWebhookModal, setShowWebhookModal] = useState(false);

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "channels", label: "Channels", icon: Globe },
    ...(user.isDeveloper ? [
      { id: "developer", label: "API Keys", icon: Key },
      { id: "webhooks", label: "Webhooks", icon: Webhook },
    ] : []),
  ];

  // ===== HANDLERS =====

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateApiKey = async (name: string, isSandbox: boolean) => {
    // Simulate API key generation
    const generatedKey = `bilscore_${isSandbox ? "sandbox_" : "live_"}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: name,
      key: generatedKey,
      keyPrefix: generatedKey.substring(0, 12),
      isActive: true,
      isSandbox: isSandbox,
      rateLimitPerMin: isSandbox ? 100 : 50,
      rateLimitPerHour: isSandbox ? 5000 : 1000,
      lastUsedAt: null,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    };
    setApiKeys([...apiKeys, newKey]);
    setNewApiKey({ key: generatedKey, name: name });
    setShowApiKeyDisplay(true);
  };

  const handleRevokeApiKey = (id: string) => {
    if (confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
      setApiKeys(apiKeys.filter((key) => key.id !== id));
    }
  };

  const handleCreateWebhook = async (url: string, events: string[]) => {
    const newWebhook: Webhook = {
      id: `wh_${Date.now()}`,
      url: url,
      events: events.length > 0 ? events : ["TRANSACTION_COMPLETED"],
      isActive: true,
      retryCount: 3,
      lastTriggeredAt: null,
      createdAt: new Date().toISOString(),
    };
    setWebhooks([...webhooks, newWebhook]);
  };

  const handleToggleWebhook = (id: string) => {
    setWebhooks(
      webhooks.map((wh) =>
        wh.id === id ? { ...wh, isActive: !wh.isActive } : wh
      )
    );
  };

  const handleDeleteWebhook = (id: string) => {
    if (confirm("Are you sure you want to delete this webhook?")) {
      setWebhooks(webhooks.filter((wh) => wh.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      {/* Modals */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onCreate={handleCreateApiKey}
      />
      <ApiKeyDisplayModal
        isOpen={showApiKeyDisplay}
        onClose={() => setShowApiKeyDisplay(false)}
        apiKey={newApiKey}
      />
      <WebhookModal
        isOpen={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        onCreate={handleCreateWebhook}
      />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#040724] dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your account, security, and integrations
        </p>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT - Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sticky top-24">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-[#040724] text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                    {tab.id === "developer" && apiKeys.length > 0 && (
                      <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                        {apiKeys.length}
                      </span>
                    )}
                    {tab.id === "webhooks" && webhooks.length > 0 && (
                      <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                        {webhooks.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* RIGHT - Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* ===================== PROFILE TAB ===================== */}
          {activeTab === "profile" && (
            <>
              <SettingsCard>
                <SectionHeader
                  title="Profile Information"
                  description="Update your personal information"
                  icon={User}
                />
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-[#040724] focus:ring-2 focus:ring-[#040724]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-[#040724] focus:ring-2 focus:ring-[#040724]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-[#040724] focus:ring-2 focus:ring-[#040724]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Referral Code
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={user.referralCode}
                        readOnly
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(user.referralCode);
                        }}
                        className="rounded-xl bg-[#040724] px-4 py-3 text-white hover:bg-[#1e2b5a] transition-colors"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Role</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.role.replace("_", " ")}</p>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Verified
                    </span>
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#040724] py-3 text-white hover:bg-[#1e2b5a] transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : saveSuccess ? (
                      <>
                        <Check className="h-5 w-5" /> Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </SettingsCard>

              <SettingsCard>
                <SectionHeader
                  title="Wallet"
                  description="Manage your wallet and payment methods"
                  icon={Wallet}
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Balance</p>
                      <p className="text-2xl font-bold text-[#040724] dark:text-white">
                        {user.hasWallet ? formatCurrency(user.walletBalance) : "No wallet"}
                      </p>
                    </div>
                    {user.hasWallet && (
                      <div className="flex gap-2">
                        <button className="rounded-lg bg-[#040724] px-4 py-2 text-sm text-white hover:bg-[#1e2b5a]">
                          Fund
                        </button>
                        <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                          Withdraw
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Account Status</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Active</span>
                  </div>
                </div>
              </SettingsCard>
            </>
          )}

          {/* ===================== NOTIFICATIONS TAB ===================== */}
          {activeTab === "notifications" && (
            <SettingsCard>
              <SectionHeader
                title="Notification Preferences"
                description="Choose how you want to receive notifications"
                icon={Bell}
              />
              <div className="space-y-4">
                <ToggleSwitch
                  enabled={emailNotifications}
                  onChange={() => setEmailNotifications(!emailNotifications)}
                  label="Email Notifications"
                  description="Receive updates via email"
                />
                <ToggleSwitch
                  enabled={smsNotifications}
                  onChange={() => setSmsNotifications(!smsNotifications)}
                  label="SMS Notifications"
                  description="Receive updates via SMS"
                />
                <ToggleSwitch
                  enabled={pushNotifications}
                  onChange={() => setPushNotifications(!pushNotifications)}
                  label="Push Notifications"
                  description="Receive push notifications on mobile"
                />
                <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Alert Preferences</h4>
                  <ToggleSwitch
                    enabled={transactionAlerts}
                    onChange={() => setTransactionAlerts(!transactionAlerts)}
                    label="Transaction Alerts"
                    description="Get notified for all transactions"
                  />
                  <ToggleSwitch
                    enabled={promotionalEmails}
                    onChange={() => setPromotionalEmails(!promotionalEmails)}
                    label="Promotional Emails"
                    description="Receive special offers and updates"
                  />
                </div>
              </div>
            </SettingsCard>
          )}

          {/* ===================== SECURITY TAB ===================== */}
          {activeTab === "security" && (
            <>
              <SettingsCard>
                <SectionHeader
                  title="Security Settings"
                  description="Manage your account security"
                  icon={Shield}
                />
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Password</h4>
                    <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                      Change Password
                    </button>
                  </div>
                  <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h4>
                    <ToggleSwitch
                      enabled={twoFactorEnabled}
                      onChange={() => setTwoFactorEnabled(!twoFactorEnabled)}
                      label="Enable 2FA"
                      description="Add an extra layer of security"
                    />
                  </div>
                  <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Security Alerts</h4>
                    <ToggleSwitch
                      enabled={notifyOnNewDevice}
                      onChange={() => setNotifyOnNewDevice(!notifyOnNewDevice)}
                      label="New Device Alerts"
                      description="Get notified when a new device logs in"
                    />
                    <ToggleSwitch
                      enabled={notifyOnNewLocation}
                      onChange={() => setNotifyOnNewLocation(!notifyOnNewLocation)}
                      label="New Location Alerts"
                      description="Get notified when logging in from a new location"
                    />
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard>
                <SectionHeader
                  title="Sessions"
                  description="Manage active sessions"
                  icon={Globe}
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Current Session</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Chrome on MacOS • Today</p>
                    </div>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Mobile App</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">iPhone • 2 days ago</p>
                    </div>
                    <button className="text-sm text-red-600 hover:underline dark:text-red-400">Revoke</button>
                  </div>
                  <button className="w-full rounded-lg border border-red-200 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20">
                    Log Out All Devices
                  </button>
                </div>
              </SettingsCard>
            </>
          )}

          {/* ===================== CHANNELS TAB ===================== */}
          {activeTab === "channels" && (
            <SettingsCard>
              <SectionHeader
                title="Connected Channels"
                description="Manage your connected channels"
                icon={Globe}
              />
              <div className="space-y-3">
                {channels.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Globe className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2">No channels connected</p>
                  </div>
                ) : (
                  channels.map((channel) => (
                    <div key={channel.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        {channel.type === "WHATSAPP" && <MessageSquare className="h-6 w-6 text-green-500" />}
                        {channel.type === "MOBILE_APP" && <Smartphone className="h-6 w-6 text-blue-500" />}
                        {channel.type === "USSD" && <Phone className="h-6 w-6 text-purple-500" />}
                        {channel.type === "SMS" && <Mail className="h-6 w-6 text-yellow-500" />}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{channel.type}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{channel.identifier}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          channel.isVerified
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {channel.isVerified ? "Verified" : "Pending"}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(channel.linkedAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SettingsCard>
          )}

          {/* ===================== DEVELOPER / API KEYS TAB ===================== */}
          {activeTab === "developer" && user.isDeveloper && (
            <>
              <SettingsCard>
                <SectionHeader
                  title="API Keys"
                  description="Manage your API keys for integrating with Bilscore"
                  icon={Key}
                  action={
                    <button
                      onClick={() => setShowApiKeyModal(true)}
                      className="flex items-center gap-2 rounded-lg bg-[#040724] px-4 py-2 text-sm text-white hover:bg-[#1e2b5a] transition-colors"
                    >
                      <Plus className="h-4 w-4" /> New Key
                    </button>
                  }
                />
                <div className="space-y-3">
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Key className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2">No API keys created yet</p>
                      <p className="text-sm">Create your first API key to start integrating</p>
                    </div>
                  ) : (
                    apiKeys.map((key) => (
                      <ApiKeyCard
                        key={key.id}
                        apiKey={key}
                        onRevoke={handleRevokeApiKey}
                      />
                    ))
                  )}
                </div>
              </SettingsCard>

              <SettingsCard>
                <SectionHeader
                  title="API Usage"
                  description="Monitor your API usage"
                  icon={BarChart3}
                />
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#040724] dark:text-white">1,234</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Requests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">98.5%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#040724] dark:text-white">124ms</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avg Response</p>
                  </div>
                </div>
              </SettingsCard>
            </>
          )}

          {/* ===================== WEBHOOKS TAB ===================== */}
          {activeTab === "webhooks" && user.isDeveloper && (
            <SettingsCard>
              <SectionHeader
                title="Webhooks"
                description="Configure webhooks for real-time events"
                icon={Webhook}
                action={
                  <button
                    onClick={() => setShowWebhookModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-[#040724] px-4 py-2 text-sm text-white hover:bg-[#1e2b5a] transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Webhook
                  </button>
                }
              />
              <div className="space-y-3">
                {webhooks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Webhook className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2">No webhooks configured</p>
                    <p className="text-sm">Add a webhook to receive real-time event notifications</p>
                  </div>
                ) : (
                  webhooks.map((webhook) => (
                    <WebhookCard
                      key={webhook.id}
                      webhook={webhook}
                      onDelete={handleDeleteWebhook}
                      onToggle={handleToggleWebhook}
                    />
                  ))
                )}
              </div>
            </SettingsCard>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>Bilscore – Power Your World, Anytime, Anywhere</p>
        <div className="flex items-center justify-center gap-3 mt-1">
          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> WhatsApp Bot</span>
          <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> USSD *123#</span>
          <span className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
          <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> Mobile App</span>
        </div>
      </div>
    </div>
  );
}