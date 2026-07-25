// src/ui/components/admin/add-user-modal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Account details
    email: "",
    password: "",
    full_name: "",
    phone: "",
    party_type: "INDIVIDUAL",
    platform: "EMAP", // EMAP, EMAPS, EMMP
    registration_source: "EMAP_ADMIN",
    
    // Individual details
    individual: {
      first_name: "",
      last_name: "",
      middle_name: "",
      date_of_birth: "",
      gender: "",
      nationality: "NIGERIAN",
      farmer_type: "",
      job_title: "",
      employee_id: "",
      department: "",
    },
    
    // Organization details
    organization: {
      name: "",
      legal_name: "",
      registration_number: "",
      tax_id: "",
      industry: "",
      organization_type: "COMPANY",
    },
    
    // Community details
    community: {
      name: "",
      community_type: "PASTORALIST",
      region: "",
      local_government: "",
    },
    
    // Role
    role: "ADMIN",
  });

  // Platform options
  const platformOptions = [
    { value: "EMAP", label: "EMAP - Farm Management", description: "Farm management platform for farmers and field operations" },
    { value: "EMAPS", label: "EMAPS - Quality Assurance", description: "Quality assurance and inventory management platform" },
    { value: "EMMP", label: "EMMP - Marketplace", description: "Marketplace platform for buyers and sellers" },
  ];

  // Role options by platform
  const roleOptionsByPlatform: Record<string, Array<{ value: string; label: string; description: string }>> = {
    EMAP: [
      { value: "SUPER_ADMIN", label: "Super Admin", description: "Full system access across all platforms" },
      { value: "ADMIN", label: "Admin", description: "Administrative access to manage users and content" },
      { value: "MANAGER", label: "Manager", description: "Can manage farms, harvests, and team" },
      { value: "CLUSTER_COORDINATOR", label: "Cluster Coordinator", description: "Registers farmers, captures field data, validates activities" },
      { value: "FIELD_OFFICER", label: "Field Officer", description: "Conducts field inspections and data collection" },
      { value: "FIELD_AGRONOMIST", label: "Field Agronomist", description: "Crop health monitoring, fertilizer/pest management" },
      { value: "IRRIGATION_TECHNICIAN", label: "Irrigation Technician", description: "Manages irrigation systems" },
      { value: "MECHANISATION_OPERATOR", label: "Mechanisation Operator", description: "Operates farm equipment" },
      { value: "FARM_OWNER", label: "Farm Owner", description: "Owns farms/clusters" },
      { value: "FARM_OPERATOR", label: "Farm Operator", description: "Operates farms on behalf of owner" },
      { value: "CLUSTER_SUPERVISOR", label: "Cluster Supervisor", description: "Oversees multiple clusters" },
      { value: "VIEWER", label: "Viewer", description: "Read-only access to dashboards" },
    ],
    EMAPS: [
      { value: "SUPER_ADMIN", label: "Super Admin", description: "Full system access across all platforms" },
      { value: "ADMIN", label: "Admin", description: "Administrative access to manage QA and inventory" },
      { value: "MANAGER", label: "Manager", description: "Can manage inventory, lots, and quality tests" },
      { value: "QA_SPECIALIST", label: "QA Specialist", description: "Performs quality testing on harvested bales" },
      { value: "WAREHOUSE_MANAGER", label: "Warehouse Manager", description: "Manages inventory and warehouse operations" },
      { value: "INVENTORY_CLERK", label: "Inventory Clerk", description: "Handles inventory movements and tracking" },
      { value: "LOT_MANAGER", label: "Lot Manager", description: "Manages lot creation and allocation" },
      { value: "VIEWER", label: "Viewer", description: "Read-only access to inventory dashboards" },
    ],
    EMMP: [
      { value: "SUPER_ADMIN", label: "Super Admin", description: "Full system access across all platforms" },
      { value: "ADMIN", label: "Admin", description: "Administrative access to manage marketplace" },
      { value: "MANAGER", label: "Manager", description: "Can manage orders, contracts, and buyers" },
      { value: "BUYER", label: "Buyer", description: "Can purchase products from the marketplace" },
      { value: "SALES_AGENT", label: "Sales Agent", description: "Manages buyer relationships and orders" },
      { value: "CONTRACT_MANAGER", label: "Contract Manager", description: "Manages contracts with buyers" },
      { value: "VIEWER", label: "Viewer", description: "Read-only access to marketplace dashboards" },
    ],
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        party_type: "INDIVIDUAL",
        platform: "EMAP",
        registration_source: "EMAP_ADMIN",
        individual: {
          first_name: "",
          last_name: "",
          middle_name: "",
          date_of_birth: "",
          gender: "",
          nationality: "NIGERIAN",
          farmer_type: "",
          job_title: "",
          employee_id: "",
          department: "",
        },
        organization: {
          name: "",
          legal_name: "",
          registration_number: "",
          tax_id: "",
          industry: "",
          organization_type: "COMPANY",
        },
        community: {
          name: "",
          community_type: "PASTORALIST",
          region: "",
          local_government: "",
        },
        role: "ADMIN",
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('individual.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        individual: {
          ...formData.individual,
          [field]: value,
        },
      });
    } else if (name.startsWith('organization.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        organization: {
          ...formData.organization,
          [field]: value,
        },
      });
    } else if (name.startsWith('community.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        community: {
          ...formData.community,
          [field]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      });
    }
  };

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlatform = e.target.value;
    // Reset role to default for new platform
    const defaultRole = newPlatform === "EMAP" ? "ADMIN" : newPlatform === "EMAPS" ? "MANAGER" : "BUYER";
    setFormData({
      ...formData,
      platform: newPlatform,
      role: defaultRole,
      registration_source: `${newPlatform}_ADMIN`,
    });
  };

  const handlePartyTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      party_type: e.target.value,
    });
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      role: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate required fields
      if (!formData.email) throw new Error("Email is required");
      if (!formData.password) throw new Error("Password is required");
      if (formData.password.length < 8) throw new Error("Password must be at least 8 characters");
      if (!formData.full_name) throw new Error("Full name is required");
      if (!formData.platform) throw new Error("Platform is required");
      
      // Validate based on party type
      if (formData.party_type === "INDIVIDUAL") {
        if (!formData.individual.first_name) throw new Error("First name is required");
        if (!formData.individual.last_name) throw new Error("Last name is required");
      } else if (formData.party_type === "ORGANIZATION") {
        if (!formData.organization.name) throw new Error("Organization name is required");
      } else if (formData.party_type === "COMMUNITY") {
        if (!formData.community.name) throw new Error("Community name is required");
      }
      
      // Prepare data for API
      const submitData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || undefined,
        party_type: formData.party_type,
        platform: formData.platform,
        registration_source: formData.registration_source,
        
        // Individual data
        ...(formData.party_type === "INDIVIDUAL" && {
          individual: {
            first_name: formData.individual.first_name,
            last_name: formData.individual.last_name,
            middle_name: formData.individual.middle_name || undefined,
            date_of_birth: formData.individual.date_of_birth || undefined,
            gender: formData.individual.gender || undefined,
            nationality: formData.individual.nationality,
            farmer_type: formData.individual.farmer_type || undefined,
            job_title: formData.individual.job_title || undefined,
            employee_id: formData.individual.employee_id || undefined,
            department: formData.individual.department || undefined,
          }
        }),
        
        // Organization data
        ...(formData.party_type === "ORGANIZATION" && {
          organization: {
            name: formData.organization.name,
            legal_name: formData.organization.legal_name || undefined,
            registration_number: formData.organization.registration_number || undefined,
            tax_id: formData.organization.tax_id || undefined,
            industry: formData.organization.industry || undefined,
            organization_type: formData.organization.organization_type,
          }
        }),
        
        // Community data
        ...(formData.party_type === "COMMUNITY" && {
          community: {
            name: formData.community.name,
            community_type: formData.community.community_type,
            region: formData.community.region || undefined,
            local_government: formData.community.local_government || undefined,
          }
        }),
        
        // Role
        role: formData.role,
      };
      
      console.log("📤 Creating user:", JSON.stringify(submitData, null, 2));
      
      const response = await fetch(`/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });
      
      const result = await response.json();
      console.log("📥 Response from server:", result);
      
      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to create user");
      }
      
      toast.success(`User created successfully for ${formData.platform}!`);
      
      if (onSuccess) onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error("❌ Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const currentPlatformRoles = roleOptionsByPlatform[formData.platform] || roleOptionsByPlatform.EMAP;
  const selectedPlatform = platformOptions.find(p => p.value === formData.platform);
  const selectedRole = currentPlatformRoles.find(r => r.value === formData.role);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between border-b p-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Add New User</h2>
            <p className="text-sm text-gray-600">Create a user for any platform (EMAP, EMAPS, or EMMP)</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto p-4 flex-1">
          <form id="admin-user-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Platform Selection */}
            <div>
              <h3 className="text-md font-medium mb-3 text-gray-900">Platform</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Platform <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.platform}
                  onChange={handlePlatformChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                >
                  {platformOptions.map((platform) => (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  ))}
                </select>
                
                {selectedPlatform && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Platform description:</span> {selectedPlatform.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h3 className="text-md font-medium mb-3 text-gray-900">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-400">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Minimum 8 characters)</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    placeholder="********"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-xs text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    placeholder="+234 812 345 6789"
                  />
                </div>
              </div>
            </div>

            {/* Party Type Selection */}
            <div>
              <h3 className="text-md font-medium mb-3 text-gray-900">Party Type</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.party_type}
                  onChange={handlePartyTypeChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="ORGANIZATION">Organization</option>
                  <option value="COMMUNITY">Community</option>
                </select>
              </div>
            </div>

            {/* Individual Details */}
            {formData.party_type === "INDIVIDUAL" && (
              <div>
                <h3 className="text-md font-medium mb-3 text-gray-900">Personal Details</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="individual.first_name"
                        value={formData.individual.first_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="individual.last_name"
                        value={formData.individual.last_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Middle Name <span className="text-xs text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="individual.middle_name"
                      value={formData.individual.middle_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth <span className="text-xs text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="date"
                        name="individual.date_of_birth"
                        value={formData.individual.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender <span className="text-xs text-gray-400">(optional)</span>
                      </label>
                      <select
                        name="individual.gender"
                        value={formData.individual.gender}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      >
                        <option value="">Select gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nationality <span className="text-xs text-gray-400">(default: NIGERIAN)</span>
                    </label>
                    <input
                      type="text"
                      name="individual.nationality"
                      value={formData.individual.nationality}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title <span className="text-xs text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="individual.job_title"
                        value={formData.individual.job_title}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                        placeholder="e.g., Senior Agronomist"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department <span className="text-xs text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="individual.department"
                        value={formData.individual.department}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                        placeholder="e.g., Field Operations"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee ID <span className="text-xs text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="individual.employee_id"
                      value={formData.individual.employee_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      placeholder="EMP-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Farmer Type <span className="text-xs text-gray-400">(optional)</span>
                    </label>
                    <select
                      name="individual.farmer_type"
                      value={formData.individual.farmer_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    >
                      <option value="">Select farmer type</option>
                      <option value="SMALLHOLDER">Smallholder</option>
                      <option value="COMMERCIAL">Commercial</option>
                      <option value="COOPERATIVE">Cooperative Member</option>
                      <option value="OUTGROWER">Outgrower</option>
                      <option value="INGROWER">Ingrower (SPV Beneficiary)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Organization Details */}
            {formData.party_type === "ORGANIZATION" && (
              <div>
                <h3 className="text-md font-medium mb-3 text-gray-900">Organization Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="organization.name"
                      value={formData.organization.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Legal Name <span className="text-xs text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="organization.legal_name"
                      value={formData.organization.legal_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Registration Number <span className="text-xs text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="organization.registration_number"
                        value={formData.organization.registration_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax ID <span className="text-xs text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="organization.tax_id"
                        value={formData.organization.tax_id}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry <span className="text-xs text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="organization.industry"
                      value={formData.organization.industry}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      placeholder="e.g., Agriculture"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Type
                    </label>
                    <select
                      name="organization.organization_type"
                      value={formData.organization.organization_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    >
                      <option value="COMPANY">Company</option>
                      <option value="COOPERATIVE">Cooperative</option>
                      <option value="NGO">NGO</option>
                      <option value="GOVERNMENT">Government Agency</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Community Details */}
            {formData.party_type === "COMMUNITY" && (
              <div>
                <h3 className="text-md font-medium mb-3 text-gray-900">Community Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Community Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="community.name"
                      value={formData.community.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Community Type
                    </label>
                    <select
                      name="community.community_type"
                      value={formData.community.community_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    >
                      <option value="PASTORALIST">Pastoralist</option>
                      <option value="AGRICULTURAL">Agricultural</option>
                      <option value="URBAN">Urban</option>
                      <option value="RURAL">Rural</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Region <span className="text-xs text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="community.region"
                        value={formData.community.region}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Local Government <span className="text-xs text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="community.local_government"
                        value={formData.community.local_government}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role Selection - Platform Specific */}
            <div>
              <h3 className="text-md font-medium mb-3 text-gray-900">Role Assignment</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Role for {formData.platform} <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={handleRoleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                >
                  {currentPlatformRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                
                {selectedRole && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Role description:</span> {selectedRole.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Note:</span> The user will receive a verification email and will need to verify their account before accessing the {formData.platform} platform.
              </p>
            </div>
          </form>
        </div>

        {/* Footer with Submit Button */}
        <div className="border-t p-4 flex-shrink-0 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-user-form"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                `Create ${formData.platform} User`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}