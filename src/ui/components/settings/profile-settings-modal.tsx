// src/app/[slug]/settings/modals/profile-settings-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Globe,
  Calendar,
  IdCard,
  Camera,
  Save,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  Briefcase,
  Users,
  Home,
  PhoneCall,
  AtSign,
  Flag,
  UserRound,
  CalendarDays,
  Building,
  Landmark,
  CreditCard,
  Wallet,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  data: {
    section?: "profile" | "contact" | "address";
    contact?: any;
    address?: any;
  } | null;
  initialData: any;
  onSuccess: () => void;
}

type TabType = "profile" | "contact" | "address";

interface ProfileFormData {
  // Individual fields
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  occupation: string;
  employer: string;
  
  // Organization fields
  orgName: string;
  legalName: string;
  orgType: string;
  registrationNumber: string;
  taxId: string;
  website: string;
  employeeCount: string;
  yearFounded: string;
  
  // Community fields
  communityName: string;
  communityType: string;
  population: string;
  region: string;
  localGovernment: string;
  ward: string;
  village: string;
  
  // Common fields
  preferredLanguage: string;
  digitalLiteracyLevel: string;
}

interface ContactFormData {
  id: string;
  type: string;
  value: string;
  isPrimary: boolean;
  isEmergency: boolean;
  countryCode: string;
}

interface AddressFormData {
  id: string;
  type: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  latitude: string;
  longitude: string;
}

// Helper function to format date for input field
const formatDateForInput = (date: string | Date | null | undefined): string => {
  if (!date) return "";
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return "";
};

export function ProfileSettingsModal({ 
  isOpen, 
  onClose, 
  slug, 
  data, 
  initialData, 
  onSuccess 
}: ProfileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    // Individual fields
    title: initialData.profile?.title || "",
    firstName: initialData.profile?.firstName || "",
    middleName: initialData.profile?.middleName || "",
    lastName: initialData.profile?.lastName || "",
    preferredName: initialData.profile?.preferredName || "",
    gender: initialData.profile?.gender || "",
    dateOfBirth: formatDateForInput(initialData.profile?.dateOfBirth), // FIXED: Use helper function
    nationality: initialData.profile?.nationality || "NIGERIAN",
    occupation: initialData.profile?.occupation || "",
    employer: initialData.profile?.employer || "",
    
    // Organization fields
    orgName: initialData.profile?.orgName || "",
    legalName: initialData.profile?.legalName || "",
    orgType: initialData.profile?.orgType || "",
    registrationNumber: initialData.profile?.registrationNumber || "",
    taxId: initialData.profile?.taxId || "",
    website: initialData.profile?.website || "",
    employeeCount: initialData.profile?.employeeCount || "",
    yearFounded: initialData.profile?.yearFounded || "",
    
    // Community fields
    communityName: initialData.profile?.communityName || "",
    communityType: initialData.profile?.communityType || "",
    population: initialData.profile?.population || "",
    region: initialData.profile?.region || "",
    localGovernment: initialData.profile?.localGovernment || "",
    ward: initialData.profile?.ward || "",
    village: initialData.profile?.village || "",
    
    // Common fields
    preferredLanguage: initialData.profile?.preferredLanguage || "ENGLISH",
    digitalLiteracyLevel: initialData.profile?.digitalLiteracyLevel || "",
  });

  // Contact form state
  const [contactForm, setContactForm] = useState<ContactFormData>({
    id: data?.contact?.id || "",
    type: data?.contact?.type || "EMAIL",
    value: data?.contact?.value || "",
    isPrimary: data?.contact?.isPrimary || false,
    isEmergency: data?.contact?.isEmergency || false,
    countryCode: data?.contact?.countryCode || "+234",
  });

  // Address form state
  const [addressForm, setAddressForm] = useState<AddressFormData>({
    id: data?.address?.id || "",
    type: data?.address?.type || "PHYSICAL",
    addressLine1: data?.address?.addressLine1 || "",
    addressLine2: data?.address?.addressLine2 || "",
    city: data?.address?.city || "",
    state: data?.address?.state || "",
    postalCode: data?.address?.postalCode || "",
    country: data?.address?.country || "NG",
    isPrimary: data?.address?.isPrimary || false,
    latitude: data?.address?.latitude || "",
    longitude: data?.address?.longitude || "",
  });

  // Set active tab based on passed data
  useEffect(() => {
    if (data?.section === "contact") {
      setActiveTab("contact");
      if (data.contact) {
        setContactForm({
          id: data.contact.id || "",
          type: data.contact.type || "EMAIL",
          value: data.contact.value || "",
          isPrimary: data.contact.isPrimary || false,
          isEmergency: data.contact.isEmergency || false,
          countryCode: data.contact.countryCode || "+234",
        });
      } else {
        // Reset form for new contact
        setContactForm({
          id: "",
          type: "EMAIL",
          value: "",
          isPrimary: false,
          isEmergency: false,
          countryCode: "+234",
        });
      }
    } else if (data?.section === "address") {
      setActiveTab("address");
      if (data.address) {
        setAddressForm({
          id: data.address.id || "",
          type: data.address.type || "PHYSICAL",
          addressLine1: data.address.addressLine1 || "",
          addressLine2: data.address.addressLine2 || "",
          city: data.address.city || "",
          state: data.address.state || "",
          postalCode: data.address.postalCode || "",
          country: data.address.country || "NG",
          isPrimary: data.address.isPrimary || false,
          latitude: data.address.latitude || "",
          longitude: data.address.longitude || "",
        });
      } else {
        // Reset form for new address
        setAddressForm({
          id: "",
          type: "PHYSICAL",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          postalCode: "",
          country: "NG",
          isPrimary: false,
          latitude: "",
          longitude: "",
        });
      }
    } else {
      setActiveTab("profile");
    }
  }, [data]);

  // Handle profile form changes
  const handleProfileChange = (field: keyof ProfileFormData, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle contact form changes
  const handleContactChange = (field: keyof ContactFormData, value: any) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle address form changes
  const handleAddressChange = (field: keyof AddressFormData, value: any) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const response = await fetch(`/api/${slug}/settings/profile/photo`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      toast.success("Photo uploaded successfully");
      onSuccess();
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Validate profile form
  const validateProfileForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const partyType = initialData.party.type;

    if (partyType === "INDIVIDUAL") {
      if (!profileForm.firstName) newErrors.firstName = "First name is required";
      if (!profileForm.lastName) newErrors.lastName = "Last name is required";
    } else if (partyType === "ORGANIZATION") {
      if (!profileForm.orgName) newErrors.orgName = "Organization name is required";
    } else if (partyType === "COMMUNITY") {
      if (!profileForm.communityName) newErrors.communityName = "Community name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate contact form
  const validateContactForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!contactForm.value) {
      newErrors.value = `${contactForm.type === "EMAIL" ? "Email address" : "Phone number"} is required`;
    } else if (contactForm.type === "EMAIL" && !/^\S+@\S+\.\S+$/.test(contactForm.value)) {
      newErrors.value = "Please enter a valid email address";
    } else if (contactForm.type === "PHONE" && !/^[0-9+\s-]{8,15}$/.test(contactForm.value)) {
      newErrors.value = "Please enter a valid phone number";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate address form
  const validateAddressForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!addressForm.addressLine1) newErrors.addressLine1 = "Address line 1 is required";
    if (!addressForm.city) newErrors.city = "City is required";
    if (!addressForm.state) newErrors.state = "State is required";
    if (!addressForm.country) newErrors.country = "Country is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle profile submit
  const onProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/${slug}/settings/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      toast.success("Profile updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle contact submit
  const onContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateContactForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const url = contactForm.id 
        ? `/api/${slug}/settings/contacts/${contactForm.id}`
        : `/api/${slug}/settings/contacts`;
      
      const method = contactForm.id ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });

      if (!response.ok) throw new Error("Failed to save contact");

      toast.success(contactForm.id ? "Contact updated" : "Contact added");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to save contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle address submit
  const onAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAddressForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const url = addressForm.id 
        ? `/api/${slug}/settings/addresses/${addressForm.id}`
        : `/api/${slug}/settings/addresses`;
      
      const method = addressForm.id ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });

      if (!response.ok) throw new Error("Failed to save address");

      toast.success(addressForm.id ? "Address updated" : "Address added");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to save address");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const partyType = initialData.party.type;
  const isIndividual = partyType === "INDIVIDUAL";
  const isOrganization = partyType === "ORGANIZATION";
  const isCommunity = partyType === "COMMUNITY";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#2e7d32]/10 p-2">
              {activeTab === "profile" && <User className="h-5 w-5 text-[#2e7d32]" />}
              {activeTab === "contact" && <Mail className="h-5 w-5 text-[#2e7d32]" />}
              {activeTab === "address" && <MapPin className="h-5 w-5 text-[#2e7d32]" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {activeTab === "profile" && "Edit Profile"}
                {activeTab === "contact" && (data?.contact ? "Edit Contact" : "Add Contact")}
                {activeTab === "address" && (data?.address ? "Edit Address" : "Add Address")}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeTab === "profile" && "Update your personal information"}
                {activeTab === "contact" && "Add or update contact details"}
                {activeTab === "address" && "Add or update address information"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs (only show for new entries, not when editing specific items) */}
        {!data?.contact && !data?.address && (
          <div className="flex border-b border-gray-200 px-4 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "profile"
                  ? "border-[#2e7d32] text-[#2e7d32]"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <User className="h-4 w-4" />
              Profile Info
            </button>
            <button
              onClick={() => setActiveTab("contact")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "contact"
                  ? "border-[#2e7d32] text-[#2e7d32]"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <Mail className="h-4 w-4" />
              Contact
            </button>
            <button
              onClick={() => setActiveTab("address")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === "address"
                  ? "border-[#2e7d32] text-[#2e7d32]"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <MapPin className="h-4 w-4" />
              Address
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-4">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <form onSubmit={onProfileSubmit} className="space-y-6">
              {/* Profile Photo */}
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2e7d32] to-[#1b5e20] flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                    {initialData.profile?.photoUrl || initialData.profile?.logoUrl ? (
                      <Image
                        src={initialData.profile?.photoUrl || initialData.profile?.logoUrl}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
                    <Camera className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Individual Profile Form */}
              {isIndividual && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title
                    </label>
                    <select
                      value={profileForm.title}
                      onChange={(e) => handleProfileChange("title", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="">Select title</option>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                      <option value="Prof">Prof</option>
                      <option value="Chief">Chief</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => handleProfileChange("firstName", e.target.value)}
                      className={`w-full rounded-lg border ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      } px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.middleName}
                      onChange={(e) => handleProfileChange("middleName", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => handleProfileChange("lastName", e.target.value)}
                      className={`w-full rounded-lg border ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      } px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.preferredName}
                      onChange={(e) => handleProfileChange("preferredName", e.target.value)}
                      placeholder="What you'd like to be called"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gender
                    </label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => handleProfileChange("gender", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => handleProfileChange("dateOfBirth", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nationality
                    </label>
                    <select
                      value={profileForm.nationality}
                      onChange={(e) => handleProfileChange("nationality", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="NIGERIAN">Nigerian</option>
                      <option value="GHANAIAN">Ghanaian</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Occupation
                    </label>
                    <input
                      type="text"
                      value={profileForm.occupation}
                      onChange={(e) => handleProfileChange("occupation", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employer
                    </label>
                    <input
                      type="text"
                      value={profileForm.employer}
                      onChange={(e) => handleProfileChange("employer", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                </div>
              )}

              {/* Organization Profile Form */}
              {isOrganization && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={profileForm.orgName}
                      onChange={(e) => handleProfileChange("orgName", e.target.value)}
                      className={`w-full rounded-lg border ${
                        errors.orgName ? 'border-red-500' : 'border-gray-300'
                      } px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800`}
                    />
                    {errors.orgName && (
                      <p className="mt-1 text-xs text-red-600">{errors.orgName}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Legal Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.legalName}
                      onChange={(e) => handleProfileChange("legalName", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Organization Type
                    </label>
                    <select
                      value={profileForm.orgType}
                      onChange={(e) => handleProfileChange("orgType", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="">Select type</option>
                      <option value="COMPANY">Company</option>
                      <option value="COOPERATIVE">Cooperative</option>
                      <option value="NGO">NGO</option>
                      <option value="GOVERNMENT">Government</option>
                      <option value="COMMUNITY_BASED">Community Based</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={profileForm.registrationNumber}
                      onChange={(e) => handleProfileChange("registrationNumber", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      value={profileForm.taxId}
                      onChange={(e) => handleProfileChange("taxId", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={profileForm.website}
                      onChange={(e) => handleProfileChange("website", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee Count
                    </label>
                    <input
                      type="number"
                      value={profileForm.employeeCount}
                      onChange={(e) => handleProfileChange("employeeCount", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year Founded
                    </label>
                    <input
                      type="number"
                      value={profileForm.yearFounded}
                      onChange={(e) => handleProfileChange("yearFounded", e.target.value)}
                      placeholder="e.g., 2010"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                </div>
              )}

              {/* Community Profile Form */}
              {isCommunity && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Community Name *
                    </label>
                    <input
                      type="text"
                      value={profileForm.communityName}
                      onChange={(e) => handleProfileChange("communityName", e.target.value)}
                      className={`w-full rounded-lg border ${
                        errors.communityName ? 'border-red-500' : 'border-gray-300'
                      } px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800`}
                    />
                    {errors.communityName && (
                      <p className="mt-1 text-xs text-red-600">{errors.communityName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Community Type
                    </label>
                    <select
                      value={profileForm.communityType}
                      onChange={(e) => handleProfileChange("communityType", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="">Select type</option>
                      <option value="PASTORALIST">Pastoralist</option>
                      <option value="FARMING">Farming</option>
                      <option value="MIXED">Mixed</option>
                      <option value="URBAN">Urban</option>
                      <option value="RURAL">Rural</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Population
                    </label>
                    <input
                      type="number"
                      value={profileForm.population}
                      onChange={(e) => handleProfileChange("population", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Region
                    </label>
                    <input
                      type="text"
                      value={profileForm.region}
                      onChange={(e) => handleProfileChange("region", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Local Government
                    </label>
                    <input
                      type="text"
                      value={profileForm.localGovernment}
                      onChange={(e) => handleProfileChange("localGovernment", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ward
                    </label>
                    <input
                      type="text"
                      value={profileForm.ward}
                      onChange={(e) => handleProfileChange("ward", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Village
                    </label>
                    <input
                      type="text"
                      value={profileForm.village}
                      onChange={(e) => handleProfileChange("village", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                </div>
              )}

              {/* Common Fields for All Types */}
              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Language
                    </label>
                    <select
                      value={profileForm.preferredLanguage}
                      onChange={(e) => handleProfileChange("preferredLanguage", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="ENGLISH">English</option>
                      <option value="HAUSA">Hausa</option>
                      <option value="YORUBA">Yoruba</option>
                      <option value="IGBO">Igbo</option>
                      <option value="ARABIC">Arabic</option>
                      <option value="FRENCH">French</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Digital Literacy Level
                    </label>
                    <select
                      value={profileForm.digitalLiteracyLevel}
                      onChange={(e) => handleProfileChange("digitalLiteracyLevel", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="">Select level</option>
                      <option value="BASIC">Basic</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2e7d32] rounded-lg hover:bg-[#1b5e20] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <form onSubmit={onContactSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contact Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        contactForm.type === "EMAIL"
                          ? "border-[#2e7d32] bg-[#2e7d32]/5 text-[#2e7d32]"
                          : "border-gray-300 hover:bg-gray-50 dark:border-gray-600"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={contactForm.type === "EMAIL"}
                        onChange={() => handleContactChange("type", "EMAIL")}
                        className="sr-only"
                      />
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">Email</span>
                    </label>
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        contactForm.type === "PHONE"
                          ? "border-[#2e7d32] bg-[#2e7d32]/5 text-[#2e7d32]"
                          : "border-gray-300 hover:bg-gray-50 dark:border-gray-600"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={contactForm.type === "PHONE"}
                        onChange={() => handleContactChange("type", "PHONE")}
                        className="sr-only"
                      />
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">Phone</span>
                    </label>
                  </div>
                </div>

                {contactForm.type === "PHONE" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country Code
                    </label>
                    <select
                      value={contactForm.countryCode}
                      onChange={(e) => handleContactChange("countryCode", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="+234">Nigeria (+234)</option>
                      <option value="+233">Ghana (+233)</option>
                      <option value="+1">USA (+1)</option>
                      <option value="+44">UK (+44)</option>
                      <option value="+971">UAE (+971)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {contactForm.type === "EMAIL" ? "Email Address *" : "Phone Number *"}
                  </label>
                  <input
                    type={contactForm.type === "EMAIL" ? "email" : "tel"}
                    value={contactForm.value}
                    onChange={(e) => handleContactChange("value", e.target.value)}
                    placeholder={contactForm.type === "EMAIL" ? "example@domain.com" : "e.g., 08012345678"}
                    className={`w-full rounded-lg border ${
                      errors.value ? 'border-red-500' : 'border-gray-300'
                    } px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800`}
                  />
                  {errors.value && (
                    <p className="mt-1 text-xs text-red-600">{errors.value}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contactForm.isPrimary}
                      onChange={(e) => handleContactChange("isPrimary", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#2e7d32] focus:ring-[#2e7d32]"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Set as primary contact</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contactForm.isEmergency}
                      onChange={(e) => handleContactChange("isEmergency", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#2e7d32] focus:ring-[#2e7d32]"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Emergency contact</span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2e7d32] rounded-lg hover:bg-[#1b5e20] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {data?.contact ? "Update Contact" : "Add Contact"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <form onSubmit={onAddressSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        addressForm.type === "PHYSICAL"
                          ? "border-[#2e7d32] bg-[#2e7d32]/5 text-[#2e7d32]"
                          : "border-gray-300 hover:bg-gray-50 dark:border-gray-600"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={addressForm.type === "PHYSICAL"}
                        onChange={() => handleAddressChange("type", "PHYSICAL")}
                        className="sr-only"
                      />
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Physical Address</span>
                    </label>
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        addressForm.type === "POSTAL"
                          ? "border-[#2e7d32] bg-[#2e7d32]/5 text-[#2e7d32]"
                          : "border-gray-300 hover:bg-gray-50 dark:border-gray-600"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={addressForm.type === "POSTAL"}
                        onChange={() => handleAddressChange("type", "POSTAL")}
                        className="sr-only"
                      />
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">Postal Address</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={addressForm.addressLine1}
                    onChange={(e) => handleAddressChange("addressLine1", e.target.value)}
                    placeholder="Street address, P.O. Box"
                    className={`w-full rounded-lg border ${
                      errors.addressLine1 ? 'border-red-500' : 'border-gray-300'
                    } px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800`}
                  />
                  {errors.addressLine1 && (
                    <p className="mt-1 text-xs text-red-600">{errors.addressLine1}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={addressForm.addressLine2}
                    onChange={(e) => handleAddressChange("addressLine2", e.target.value)}
                    placeholder="Apartment, suite, unit, building, floor"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={addressForm.city}
                      onChange={(e) => handleAddressChange("city", e.target.value)}
                      className={`w-full rounded-lg border ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      } px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800`}
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-red-600">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      State/Province *
                    </label>
                    <input
                      type="text"
                      value={addressForm.state}
                      onChange={(e) => handleAddressChange("state", e.target.value)}
                      className={`w-full rounded-lg border ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      } px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800`}
                    />
                    {errors.state && (
                      <p className="mt-1 text-xs text-red-600">{errors.state}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={addressForm.postalCode}
                      onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country *
                    </label>
                    <select
                      value={addressForm.country}
                      onChange={(e) => handleAddressChange("country", e.target.value)}
                      className={`w-full rounded-lg border ${
                        errors.country ? 'border-red-500' : 'border-gray-300'
                      } px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800`}
                    >
                      <option value="NG">Nigeria</option>
                      <option value="GH">Ghana</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AE">United Arab Emirates</option>
                    </select>
                    {errors.country && (
                      <p className="mt-1 text-xs text-red-600">{errors.country}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Latitude (GPS)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={addressForm.latitude}
                      onChange={(e) => handleAddressChange("latitude", e.target.value)}
                      placeholder="e.g., 9.0765"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Longitude (GPS)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={addressForm.longitude}
                      onChange={(e) => handleAddressChange("longitude", e.target.value)}
                      placeholder="e.g., 7.3986"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#2e7d32] focus:ring-2 focus:ring-[#2e7d32]/20 dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={addressForm.isPrimary}
                      onChange={(e) => handleAddressChange("isPrimary", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#2e7d32] focus:ring-[#2e7d32]"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Set as primary address</span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2e7d32] rounded-lg hover:bg-[#1b5e20] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {data?.address ? "Update Address" : "Add Address"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}