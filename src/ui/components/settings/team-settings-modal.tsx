// src/app/[slug]/settings/modals/team-settings-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  X,
  User,
  Mail,
  Phone,
  UserCog,
  Shield,
  Key,
  Calendar,
  Save,
  Trash2,
  Check,
  XCircle,
  Loader2,
  Crown,
  Briefcase,
  Clock,
  AlertCircle,
  ChevronDown,
  Plus,
  Search,
  Eye,
  Edit,
  Building2,
  Globe,
  Store,
  Package,
  Tractor,
  DollarSign,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  member: any | null;
  onSuccess: () => void;
}

interface UserSearchResult {
  id: number;
  name: string;
  email: string;
  partyId: number;
  role: string;
  photoUrl?: string;
}

interface FormData {
  id: string;
  individualId: string;
  name: string;
  email: string;
  role: string;
  permissionLevel: string;
  platforms: string[];
  isPrimary: boolean;
  canSignContracts: boolean;
  canApprovePayments: boolean;
  canCommitResources: boolean;
  requiresCoSigner: boolean;
  coSignerId: string;
  financialLimit: string;
  contractLimit: string;
  startDate: string;
  endDate: string;
  scopeDescription: string;
  notes: string;
}

const permissionLevels = [
  { value: "viewer", label: "Viewer", icon: Eye, description: "Can view all data but cannot make changes", color: "text-blue-600" },
  { value: "editor", label: "Editor", icon: Edit, description: "Can view and edit data", color: "text-green-600" },
  { value: "manager", label: "Manager", icon: Briefcase, description: "Can manage operations and approve requests", color: "text-orange-600" },
  { value: "admin", label: "Admin", icon: Shield, description: "Full access to all settings except billing", color: "text-purple-600" },
  { value: "owner", label: "Owner", icon: Crown, description: "Complete control including ownership transfer", color: "text-yellow-600" },
];

const platforms = [
  { value: "EMAP", label: "Farm Management (EMAP)", icon: Tractor, description: "Access to field operations, harvest recording, and farm data" },
  { value: "EMAPS", label: "Processing & Sales (EMAPS)", icon: Package, description: "Access to quality testing, inventory, and export management" },
  { value: "EMMP", label: "Marketplace (EMMP)", icon: Store, description: "Access to buyer portal, contracts, and commercial data" },
  { value: "ALL", label: "All Platforms", icon: Globe, description: "Full access across all El-Meena platforms" },
];

export function TeamSettingsModal({ isOpen, onClose, slug, member, onSuccess }: TeamSettingsModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSearch, setShowSearch] = useState(!member);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFinancial, setShowFinancial] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    id: member?.id || "",
    individualId: member?.individualId || "",
    name: member?.name || "",
    email: member?.email || "",
    role: member?.role || "",
    permissionLevel: member?.permissionLevel || "editor",
    platforms: member?.platforms || ["ALL"],
    isPrimary: member?.isPrimary || false,
    canSignContracts: member?.canSignContracts || false,
    canApprovePayments: member?.canApprovePayments || false,
    canCommitResources: member?.canCommitResources || false,
    requiresCoSigner: member?.requiresCoSigner || false,
    coSignerId: member?.coSignerId || "",
    financialLimit: member?.financialLimit || "",
    contractLimit: member?.contractLimit || "",
    startDate: member?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    endDate: member?.endDate?.split('T')[0] || "",
    scopeDescription: member?.scopeDescription || "",
    notes: member?.notes || "",
  });

  // Search for users when search term changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/${slug}/settings/users/search?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) throw new Error("Search failed");
        const results = await response.json();
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        toast.error("Failed to search users");
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, slug]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handlePlatformToggle = (platformValue: string) => {
    setFormData(prev => {
      let newPlatforms = [...prev.platforms];
      
      if (platformValue === "ALL") {
        newPlatforms = ["ALL"];
      } else {
        if (newPlatforms.includes("ALL")) {
          newPlatforms = [platformValue];
        } else if (newPlatforms.includes(platformValue)) {
          newPlatforms = newPlatforms.filter(p => p !== platformValue);
        } else {
          newPlatforms.push(platformValue);
        }
        
        if (newPlatforms.length === 0) {
          newPlatforms = ["ALL"];
        }
      }
      
      return { ...prev, platforms: newPlatforms };
    });
  };

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    setFormData(prev => ({
      ...prev,
      individualId: user.id.toString(),
      name: user.name,
      email: user.email,
    }));
    setShowSearch(false);
  };

  const validateStep1 = () => {
    if (!formData.individualId && !member) {
      toast.error("Please select a user");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.permissionLevel) {
      toast.error("Please select a permission level");
      return false;
    }
    if (formData.platforms.length === 0) {
      toast.error("Please select at least one platform");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep2()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url = member 
        ? `/api/${slug}/settings/team/${member.id}`
        : `/api/${slug}/settings/team`;
      
      const method = member ? "PUT" : "POST";
      
      const payload = {
        individualId: parseInt(formData.individualId),
        name: formData.name,
        email: formData.email,
        role: formData.role,
        permissionLevel: formData.permissionLevel,
        platforms: formData.platforms,
        canSignContracts: formData.canSignContracts,
        canApprovePayments: formData.canApprovePayments,
        canCommitResources: formData.canCommitResources,
        requiresCoSigner: formData.requiresCoSigner,
        coSignerId: formData.coSignerId ? parseInt(formData.coSignerId) : null,
        financialLimit: formData.financialLimit ? parseFloat(formData.financialLimit) : null,
        contractLimit: formData.contractLimit ? parseFloat(formData.contractLimit) : null,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        scopeDescription: formData.scopeDescription,
        notes: formData.notes,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save team member");
      }

      toast.success(member ? "Team member updated" : "Team member added");
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        id: "",
        individualId: "",
        name: "",
        email: "",
        role: "",
        permissionLevel: "editor",
        platforms: ["ALL"],
        isPrimary: false,
        canSignContracts: false,
        canApprovePayments: false,
        canCommitResources: false,
        requiresCoSigner: false,
        coSignerId: "",
        financialLimit: "",
        contractLimit: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        scopeDescription: "",
        notes: "",
      });
      setCurrentStep(1);
      setSelectedUser(null);
      setShowSearch(true);
      
      router.refresh();
      
    } catch (error: any) {
      console.error("Error saving team member:", error);
      toast.error(error.message || "Failed to save team member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!member) return;
    
    const confirmed = confirm(`Are you sure you want to remove ${member.name} from your team?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/${slug}/settings/team/${member.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove team member");

      toast.success("Team member removed successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to remove team member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    if (member) return null;
    
    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Select User</span>
          </div>
        </div>
        <div className="w-12 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex-1">
          <div className={`flex items-center ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Set Permissions</span>
          </div>
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Users className="h-5 w-5" />
        Select Team Member
      </h3>
      
      {showSearch ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search for User *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-3 border border-gray-200 rounded-lg divide-y divide-gray-200 dark:border-gray-700 dark:divide-gray-700 max-h-64 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className="w-full p-3 text-left hover:bg-gray-50 transition-colors dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center dark:bg-gray-800">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 rotate-270" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchTerm.length >= 2 && searchResults.length === 0 && !isSearching && (
            <div className="mt-8 text-center">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No users found</p>
              <p className="text-xs text-gray-400 mt-1">
                Make sure the user has an account on the platform
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowSearch(false)}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedUser?.name}</p>
              <p className="text-xs text-gray-500">{selectedUser?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowSearch(true);
              setSelectedUser(null);
              setFormData(prev => ({
                ...prev,
                individualId: "",
                name: "",
                email: "",
              }));
            }}
            className="text-sm text-primary hover:text-primary/80"
          >
            Change
          </button>
        </div>
      )}

      {selectedUser && (
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This user will be added to your team with the permissions you set in the next step.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      <h3 className="text-lg font-medium flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10">
        <Shield className="h-5 w-5" />
        Set Permissions
      </h3>

      {/* Selected user summary */}
      {!member && selectedUser && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg sticky top-12 z-10">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Adding user: <span className="font-bold">{selectedUser.name}</span>
          </p>
        </div>
      )}

      {member && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center dark:bg-gray-700">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</p>
              <p className="text-xs text-gray-500">{member.email}</p>
              {member.isPrimary && (
                <span className="inline-flex items-center gap-1 text-xs text-yellow-600 mt-1">
                  <Crown className="h-3 w-3" />
                  Account Owner
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permission Level */}
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Permission Level *
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {permissionLevels.map((level) => {
            const Icon = level.icon;
            const isSelected = formData.permissionLevel === level.value;
            return (
              <label
                key={level.value}
                className={`relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="permissionLevel"
                  value={level.value}
                  checked={isSelected}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`${isSelected ? level.color : "text-gray-400"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isSelected ? level.color : "text-gray-700 dark:text-gray-300"}`}>
                      {level.label}
                    </span>
                    {isSelected && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{level.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Platform Access */}
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Platform Access *
        </h4>
        <div className="space-y-2">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const isSelected = formData.platforms.includes(platform.value);
            return (
              <label
                key={platform.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handlePlatformToggle(platform.value)}
                  className="sr-only"
                />
                <div className={`${isSelected ? "text-primary" : "text-gray-400"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isSelected ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                      {platform.label}
                    </span>
                    {isSelected && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{platform.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Role Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Role Description
        </label>
        <input
          type="text"
          name="role"
          value={formData.role}
          onChange={handleChange}
          placeholder="e.g., Field Operations Manager, Quality Control Lead"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-1">Optional - Describe their specific responsibilities</p>
      </div>

      {/* Scope Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Scope of Authority
        </label>
        <textarea
          name="scopeDescription"
          value={formData.scopeDescription}
          onChange={handleChange}
          rows={2}
          placeholder="Describe what this team member can do and their area of responsibility..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Financial & Contract Limits - Expandable */}
      <div className="border rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowFinancial(!showFinancial)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Financial & Contract Limits</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showFinancial ? 'rotate-180' : ''}`} />
        </button>
        
        {showFinancial && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Financial Limit (₦)
                </label>
                <input
                  type="number"
                  name="financialLimit"
                  value={formData.financialLimit}
                  onChange={handleChange}
                  placeholder="e.g., 1000000"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Maximum amount per transaction</p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Contract Limit (₦)
                </label>
                <input
                  type="number"
                  name="contractLimit"
                  value={formData.contractLimit}
                  onChange={handleChange}
                  placeholder="e.g., 5000000"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Maximum contract value they can sign</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="canSignContracts"
                  checked={formData.canSignContracts}
                  onChange={(e) => handleCheckboxChange("canSignContracts", e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Can sign contracts</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="canApprovePayments"
                  checked={formData.canApprovePayments}
                  onChange={(e) => handleCheckboxChange("canApprovePayments", e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Can approve payments</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="canCommitResources"
                  checked={formData.canCommitResources}
                  onChange={(e) => handleCheckboxChange("canCommitResources", e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Can commit resources</span>
              </label>
            </div>

            {(formData.canSignContracts || formData.canApprovePayments) && (
              <div className="p-3 bg-yellow-50 rounded-lg dark:bg-yellow-900/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      This member has financial authority. Consider setting approval limits above.
                    </p>
                    
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        name="requiresCoSigner"
                        checked={formData.requiresCoSigner}
                        onChange={(e) => handleCheckboxChange("requiresCoSigner", e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Requires co-signer for approvals</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validity Period */}
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Validity Period
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              End Date (Optional)
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank for permanent access</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Internal Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          placeholder="Add any notes about this team member's role, responsibilities, or special considerations..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Primary Member Notice */}
      {member?.isPrimary && (
        <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <div className="flex items-start gap-2">
            <Crown className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Account Owner
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                This is the primary account owner. Some permissions cannot be modified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Team members will receive an email invitation to join your organization.
          </p>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  const isEditing = !!member;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <UserCog className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isEditing ? "Edit Team Member" : "Add Team Member"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isEditing 
                    ? "Update role and permissions for this team member"
                    : "Invite someone to join your team and manage your farm operations"}
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

          {/* Step Indicator */}
          {!isEditing && renderStepIndicator()}

          {/* Form */}
          <div className="p-6">
            {!isEditing && currentStep === 1 && renderStep1()}
            {((!isEditing && currentStep === 2) || isEditing) && renderStep2()}
          </div>

          {/* Footer */}
          <div className="flex justify-between border-t px-6 py-4 dark:border-gray-700">
            {!isEditing ? (
              <>
                {currentStep === 1 ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                )}
                
                {currentStep === 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!formData.individualId}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isEditing ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {isEditing ? "Update Member" : "Add Member"}
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <div className="flex w-full justify-end gap-3">
                {!member?.isPrimary && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Member
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Member
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}