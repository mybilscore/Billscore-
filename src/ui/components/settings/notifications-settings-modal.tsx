// src/app/[slug]/settings/modals/notification-settings-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  X,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Clock,
  AlertCircle,
  CheckCircle,
  Sprout,
  Award,
  FileText,
  CreditCard,
  Truck,
  Settings,
  Save,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Zap,
  Calendar,
  Shield,
  TrendingUp,
  Package,
  Users,
  Building2,
  Leaf,
} from "lucide-react";

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  initialPrefs: any;
  onSuccess?: () => void;
}

interface FormData {
  // Channel preferences
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  
  // Event notifications
  notifyOnHarvest: boolean;
  notifyOnQa: boolean;
  notifyOnContract: boolean;
  notifyOnPayment: boolean;
  notifyOnShipment: boolean;
  notifyOnAlerts: boolean;
  notifyOnTeam: boolean;
  notifyOnInventory: boolean;
  notifyOnFieldReport: boolean;
  notifyOnClusterUpdate: boolean;
  notifyOnFarmUpdate: boolean;
  
  // Digest settings
  digestFrequency: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursEnabled: boolean;
  
  // Advanced
  emailDigestTime: string;
  includeWeeklySummary: boolean;
  includeMonthlyReport: boolean;
  notifyOnCriticalOnly: boolean;
}

interface NotificationChannel {
  id: string;
  label: string;
  icon: any;
  description: string;
  color: string;
}

interface NotificationEvent {
  id: string;
  label: string;
  icon: any;
  description: string;
  category: "farm" | "quality" | "commercial" | "system";
}

const channels: NotificationChannel[] = [
  { id: "emailEnabled", label: "Email", icon: Mail, description: "Receive notifications via email", color: "text-blue-600" },
  { id: "smsEnabled", label: "SMS", icon: MessageSquare, description: "Receive text messages", color: "text-green-600" },
  { id: "whatsappEnabled", label: "WhatsApp", icon: Smartphone, description: "Receive WhatsApp messages", color: "text-emerald-600" },
  { id: "pushEnabled", label: "Push", icon: Bell, description: "Browser push notifications", color: "text-purple-600" },
  { id: "inAppEnabled", label: "In-App", icon: Globe, description: "Notifications inside the app", color: "text-cyan-600" },
];

const events: NotificationEvent[] = [
  // Farm Events
  { id: "notifyOnHarvest", label: "Harvest Events", icon: Sprout, description: "New harvest recorded, harvest completed", category: "farm" },
  { id: "notifyOnFieldReport", label: "Field Reports", icon: FileText, description: "Reports submitted, approved, or rejected", category: "farm" },
  { id: "notifyOnFarmUpdate", label: "Farm Updates", icon: Leaf, description: "Farm creation, updates, status changes", category: "farm" },
  { id: "notifyOnClusterUpdate", label: "Cluster Updates", icon: Building2, description: "Cluster changes, member additions", category: "farm" },
  
  // Quality Events
  { id: "notifyOnQa", label: "Quality Assurance", icon: Award, description: "QA tests completed, certificates issued", category: "quality" },
  { id: "notifyOnInventory", label: "Inventory", icon: Package, description: "Stock alerts, low inventory warnings", category: "quality" },
  
  // Commercial Events
  { id: "notifyOnContract", label: "Contracts", icon: FileText, description: "Contract approvals, renewals, amendments", category: "commercial" },
  { id: "notifyOnPayment", label: "Payments", icon: CreditCard, description: "Payment received, invoices generated", category: "commercial" },
  { id: "notifyOnShipment", label: "Shipments", icon: Truck, description: "Shipment updates, tracking information", category: "commercial" },
  
  // System Events
  { id: "notifyOnTeam", label: "Team Activity", icon: Users, description: "Team member added, role changes", category: "system" },
  { id: "notifyOnAlerts", label: "Alerts & Warnings", icon: AlertCircle, description: "System alerts, important warnings", category: "system" },
];

const digestOptions = [
  { value: "instant", label: "Instant (send immediately)", icon: Zap, description: "Get notified right away" },
  { value: "hourly", label: "Hourly Digest", icon: Clock, description: "Receive notifications every hour" },
  { value: "daily", label: "Daily Digest", icon: Calendar, description: "One summary per day" },
  { value: "weekly", label: "Weekly Digest", icon: Calendar, description: "Weekly summary report" },
  { value: "never", label: "Never (no digests)", icon: VolumeX, description: "Receive notifications individually" },
];

export function NotificationSettingsModal({ 
  isOpen, 
  onClose, 
  slug, 
  initialPrefs, 
  onSuccess 
}: NotificationSettingsModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"all" | "farm" | "quality" | "commercial" | "system">("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    // Channel preferences
    emailEnabled: initialPrefs?.emailEnabled ?? true,
    smsEnabled: initialPrefs?.smsEnabled ?? true,
    whatsappEnabled: initialPrefs?.whatsappEnabled ?? false,
    pushEnabled: initialPrefs?.pushEnabled ?? true,
    inAppEnabled: initialPrefs?.inAppEnabled ?? true,
    
    // Event notifications
    notifyOnHarvest: initialPrefs?.notifyOnHarvest ?? true,
    notifyOnQa: initialPrefs?.notifyOnQa ?? true,
    notifyOnContract: initialPrefs?.notifyOnContract ?? true,
    notifyOnPayment: initialPrefs?.notifyOnPayment ?? true,
    notifyOnShipment: initialPrefs?.notifyOnShipment ?? true,
    notifyOnAlerts: initialPrefs?.notifyOnAlerts ?? true,
    notifyOnTeam: initialPrefs?.notifyOnTeam ?? true,
    notifyOnInventory: initialPrefs?.notifyOnInventory ?? true,
    notifyOnFieldReport: initialPrefs?.notifyOnFieldReport ?? true,
    notifyOnClusterUpdate: initialPrefs?.notifyOnClusterUpdate ?? true,
    notifyOnFarmUpdate: initialPrefs?.notifyOnFarmUpdate ?? true,
    
    // Digest settings
    digestFrequency: initialPrefs?.digestFrequency || "daily",
    quietHoursStart: initialPrefs?.quietHoursStart || "22:00",
    quietHoursEnd: initialPrefs?.quietHoursEnd || "07:00",
    quietHoursEnabled: initialPrefs?.quietHoursEnabled ?? false,
    
    // Advanced
    emailDigestTime: initialPrefs?.emailDigestTime || "08:00",
    includeWeeklySummary: initialPrefs?.includeWeeklySummary ?? true,
    includeMonthlyReport: initialPrefs?.includeMonthlyReport ?? true,
    notifyOnCriticalOnly: initialPrefs?.notifyOnCriticalOnly ?? false,
  });

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/${slug}/settings/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to save notification preferences");
      }

      toast.success("Notification preferences saved successfully!");
      
      onSuccess?.();
      onClose();
      
      router.refresh();
      
    } catch (error: any) {
      console.error("Error saving notification preferences:", error);
      toast.error(error.message || "Failed to save preferences. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    const allEvents = events.map(e => e.id);
    const allEnabled = allEvents.every(eventId => formData[eventId as keyof FormData]);
    
    allEvents.forEach(eventId => {
      handleCheckboxChange(eventId, !allEnabled);
    });
  };

  const handleSelectCategory = (category: string) => {
    const categoryEvents = events.filter(e => e.category === category).map(e => e.id);
    const allEnabled = categoryEvents.every(eventId => formData[eventId as keyof FormData]);
    
    categoryEvents.forEach(eventId => {
      handleCheckboxChange(eventId, !allEnabled);
    });
  };

  const getEnabledCount = () => {
    return events.filter(e => formData[e.id as keyof FormData]).length;
  };

  const getCategoryCount = (category: string) => {
    const categoryEvents = events.filter(e => e.category === category);
    const enabled = categoryEvents.filter(e => formData[e.id as keyof FormData]).length;
    return { total: categoryEvents.length, enabled };
  };

  const filteredEvents = activeCategory === "all" 
    ? events 
    : events.filter(e => e.category === activeCategory);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notification Settings
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose how and when you want to receive notifications
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Notification Channels */}
              <div className="border rounded-lg p-4 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notification Channels
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {channels.map((channel) => {
                    const Icon = channel.icon;
                    const isEnabled = formData[channel.id as keyof FormData] as boolean;
                    return (
                      <label
                        key={channel.id}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                          isEnabled
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => handleCheckboxChange(channel.id, e.target.checked)}
                          className="sr-only"
                        />
                        <Icon className={`h-6 w-6 ${isEnabled ? channel.color : "text-gray-400"}`} />
                        <span className={`text-xs font-medium ${isEnabled ? "text-gray-900 dark:text-white" : "text-gray-500"}`}>
                          {channel.label}
                        </span>
                        <p className="text-[10px] text-gray-400 text-center hidden md:block">
                          {channel.description}
                        </p>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Category Tabs */}
              <div className="border rounded-lg p-4 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Events to Notify
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      {getEnabledCount() === events.length ? "Deselect All" : "Select All"}
                    </button>
                    <span className="text-xs text-gray-400">
                      {getEnabledCount()}/{events.length} selected
                    </span>
                  </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      activeCategory === "all"
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    All Events
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("farm")}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      activeCategory === "farm"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    Farm
                    <span className="ml-1 text-xs opacity-75">
                      ({getCategoryCount("farm").enabled}/{getCategoryCount("farm").total})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("quality")}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      activeCategory === "quality"
                        ? "bg-yellow-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    Quality
                    <span className="ml-1 text-xs opacity-75">
                      ({getCategoryCount("quality").enabled}/{getCategoryCount("quality").total})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("commercial")}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      activeCategory === "commercial"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    Commercial
                    <span className="ml-1 text-xs opacity-75">
                      ({getCategoryCount("commercial").enabled}/{getCategoryCount("commercial").total})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("system")}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      activeCategory === "system"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    System
                    <span className="ml-1 text-xs opacity-75">
                      ({getCategoryCount("system").enabled}/{getCategoryCount("system").total})
                    </span>
                  </button>
                </div>

                {/* Category Quick Actions */}
                {activeCategory !== "all" && (
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSelectCategory(activeCategory)}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      {getCategoryCount(activeCategory).enabled === getCategoryCount(activeCategory).total
                        ? `Deselect All ${activeCategory} Events`
                        : `Select All ${activeCategory} Events`}
                    </button>
                  </div>
                )}

                {/* Events Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredEvents.map((event) => {
                    const Icon = event.icon;
                    const isEnabled = formData[event.id as keyof FormData] as boolean;
                    const categoryColors = {
                      farm: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
                      quality: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20",
                      commercial: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
                      system: "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20",
                    };
                    
                    return (
                      <label
                        key={event.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isEnabled
                            ? `${categoryColors[event.category]} border-opacity-100`
                            : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => handleCheckboxChange(event.id, e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {event.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Digest & Quiet Hours */}
              <div className="border rounded-lg p-4 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Digest & Quiet Hours</span>
                  </div>
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                
                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    {/* Digest Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Digest Frequency
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {digestOptions.map((option) => {
                          const Icon = option.icon;
                          const isSelected = formData.digestFrequency === option.value;
                          return (
                            <label
                              key={option.value}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                                  : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                              }`}
                            >
                              <input
                                type="radio"
                                name="digestFrequency"
                                value={option.value}
                                checked={isSelected}
                                onChange={(e) => handleSelectChange("digestFrequency", e.target.value)}
                                className="sr-only"
                              />
                              <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-gray-400"}`} />
                              <span className={`text-xs text-center ${isSelected ? "text-gray-900 dark:text-white" : "text-gray-500"}`}>
                                {option.label.split(" ")[0]}
                              </span>
                              <p className="text-[10px] text-gray-400 text-center hidden md:block">
                                {option.description}
                              </p>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quiet Hours Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <Moon className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Quiet Hours
                          </p>
                          <p className="text-xs text-gray-500">
                            Silence notifications during specific hours
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.quietHoursEnabled}
                          onChange={(e) => handleCheckboxChange("quietHoursEnabled", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {formData.quietHoursEnabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={formData.quietHoursStart}
                            onChange={(e) => handleSelectChange("quietHoursStart", e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={formData.quietHoursEnd}
                            onChange={(e) => handleSelectChange("quietHoursEnd", e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Advanced Settings */}
              <div className="border rounded-lg p-4 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Settings
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Digest Time
                    </label>
                    <input
                      type="time"
                      value={formData.emailDigestTime}
                      onChange={(e) => handleSelectChange("emailDigestTime", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.includeWeeklySummary}
                        onChange={(e) => handleCheckboxChange("includeWeeklySummary", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Include weekly summary report
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.includeMonthlyReport}
                        onChange={(e) => handleCheckboxChange("includeMonthlyReport", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Include monthly performance report
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.notifyOnCriticalOnly}
                        onChange={(e) => handleCheckboxChange("notifyOnCriticalOnly", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Critical notifications only (ignore non-urgent updates)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Notifications are sent based on your selected channels and preferences. 
                    Some notifications may be delayed during quiet hours. Critical alerts will still be sent.
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}