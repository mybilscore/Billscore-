// src/components/profile/completion-modal.tsx
"use client";

import { useState } from "react";
import { X, Info } from "lucide-react";

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyType: string;
  partyId: number;
  slug: string;
  onComplete: (data: any) => Promise<void>;
}

// Helper component for optional field label
const OptionalLabel = () => (
  <span className="ml-1 text-xs text-gray-400 font-normal">(optional)</span>
);

// Required field indicator
const RequiredLabel = () => (
  <span className="ml-1 text-xs text-red-400">*</span>
);

// Field description tooltip
const FieldTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1">
    <Info className="h-3 w-3 text-gray-400 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
      {text}
    </div>
  </div>
);

export function ProfileCompletionModal({
  isOpen,
  onClose,
  partyType,
  partyId,
  slug,
  onComplete,
}: ProfileCompletionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Individual form state - Matches individualProfileSchema
  const [individualData, setIndividualData] = useState({
    // Required fields
    first_name: "",
    last_name: "",
    date_of_birth: "",
    
    // Optional fields
    middle_name: "",
    gender: "",
    nationality: "NIGERIAN", // Has default
    id_type: "",
    id_number: "",
    occupation: "",
    farmer_type: "",
    years_farming: "",
    preferred_contact_method: "",
    primary_language: "ENGLISH", // Has default
    address: {
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      country: "NG", // Has default
    },
  });

  // Organization form state - Matches organizationProfileSchema
  const [orgData, setOrgData] = useState({
    // Required fields
    legal_name: "",
    organization_type: "",
    
    // Optional fields
    trading_name: "",
    registration_number: "",
    tax_id: "",
    industry: "",
    year_founded: "",
    employee_count: "",
    website: "",
    market: "",
    preferred_currency: "USD", // Has default
    address: {
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      country: "NG", // Has default
    },
  });

  // Community form state - Matches communityProfileSchema
  const [communityData, setCommunityData] = useState({
    // Required fields
    name: "",
    community_type: "",
    region: "",
    local_government: "",
    
    // Optional fields
    population: "",
    household_count: "",
    ward: "",
    village: "",
    has_electricity: false,
    has_water_supply: false,
    has_health_clinic: false,
    has_school: false,
    address: {
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      country: "NG", // Has default
    },
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let dataToSend: any = {};

      if (partyType === "INDIVIDUAL") {
        dataToSend = {
          // Required fields
          first_name: individualData.first_name,
          last_name: individualData.last_name,
          date_of_birth: individualData.date_of_birth,
          
          // Optional fields - only include if they have values
          ...(individualData.middle_name && { middle_name: individualData.middle_name }),
          ...(individualData.gender && { gender: individualData.gender }),
          nationality: individualData.nationality, // Has default
          ...(individualData.id_type && { id_type: individualData.id_type }),
          ...(individualData.id_number && { id_number: individualData.id_number }),
          ...(individualData.occupation && { occupation: individualData.occupation }),
          ...(individualData.farmer_type && { farmer_type: individualData.farmer_type }),
          ...(individualData.years_farming && { years_farming: parseInt(individualData.years_farming) }),
          ...(individualData.preferred_contact_method && { preferred_contact_method: individualData.preferred_contact_method }),
          primary_language: individualData.primary_language, // Has default
          
          // Address - only include if at least address_line1 is provided
          ...(individualData.address.address_line1 && {
            address: {
              address_line1: individualData.address.address_line1,
              ...(individualData.address.address_line2 && { address_line2: individualData.address.address_line2 }),
              city: individualData.address.city || individualData.address.city,
              state: individualData.address.state || individualData.address.state,
              country: individualData.address.country,
            }
          }),
        };
      } else if (partyType === "ORGANIZATION") {
        dataToSend = {
          // Required fields
          legal_name: orgData.legal_name,
          organization_type: orgData.organization_type,
          
          // Optional fields
          ...(orgData.trading_name && { trading_name: orgData.trading_name }),
          ...(orgData.registration_number && { registration_number: orgData.registration_number }),
          ...(orgData.tax_id && { tax_id: orgData.tax_id }),
          ...(orgData.industry && { industry: orgData.industry }),
          ...(orgData.year_founded && { year_founded: parseInt(orgData.year_founded) }),
          ...(orgData.employee_count && { employee_count: parseInt(orgData.employee_count) }),
          ...(orgData.website && { website: orgData.website }),
          ...(orgData.market && { market: orgData.market }),
          preferred_currency: orgData.preferred_currency, // Has default
          
          // Address - optional
          ...(orgData.address.address_line1 && {
            address: {
              address_line1: orgData.address.address_line1,
              ...(orgData.address.address_line2 && { address_line2: orgData.address.address_line2 }),
              city: orgData.address.city || orgData.address.city,
              state: orgData.address.state || orgData.address.state,
              country: orgData.address.country,
            }
          }),
        };
      } else if (partyType === "COMMUNITY") {
        dataToSend = {
          // Required fields
          name: communityData.name,
          community_type: communityData.community_type,
          region: communityData.region,
          local_government: communityData.local_government,
          
          // Optional fields
          ...(communityData.population && { population: parseInt(communityData.population) }),
          ...(communityData.household_count && { household_count: parseInt(communityData.household_count) }),
          ...(communityData.ward && { ward: communityData.ward }),
          ...(communityData.village && { village: communityData.village }),
          has_electricity: communityData.has_electricity,
          has_water_supply: communityData.has_water_supply,
          has_health_clinic: communityData.has_health_clinic,
          has_school: communityData.has_school,
          
          // Address - optional
          ...(communityData.address.address_line1 && {
            address: {
              address_line1: communityData.address.address_line1,
              ...(communityData.address.address_line2 && { address_line2: communityData.address.address_line2 }),
              city: communityData.address.city || communityData.address.city,
              state: communityData.address.state || communityData.address.state,
              country: communityData.address.country,
            }
          }),
        };
      }

      await onComplete(dataToSend);
    } catch (err: any) {
      setError(err.message || "Failed to complete profile");
    } finally {
      setLoading(false);
    }
  };

  const handleIndividualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setIndividualData({
        ...individualData,
        address: {
          ...individualData.address,
          [addressField]: value,
        },
      });
    } else {
      setIndividualData({
        ...individualData,
        [name]: type === 'number' ? parseInt(value) || '' : value,
      });
    }
  };

  const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setOrgData({
        ...orgData,
        address: {
          ...orgData.address,
          [addressField]: value,
        },
      });
    } else {
      setOrgData({
        ...orgData,
        [name]: type === 'number' ? parseInt(value) || '' : value,
      });
    }
  };

  const handleCommunityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setCommunityData({
        ...communityData,
        address: {
          ...communityData.address,
          [addressField]: value,
        },
      });
    } else if (type === 'checkbox') {
      setCommunityData({
        ...communityData,
        [name]: checked,
      });
    } else {
      setCommunityData({
        ...communityData,
        [name]: type === 'number' ? parseInt(value) || '' : value,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-[102]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Complete Your Profile
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tell us more about your {partyType.toLowerCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Required Fields Note */}
          <div className="text-xs text-gray-500 flex items-center gap-2 p-2 bg-gray-50 rounded dark:bg-gray-800">
            <span className="text-red-400">*</span> <span>Required fields</span>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-gray-400">(optional)</span> <span>Optional fields</span>
          </div>

          {partyType === "INDIVIDUAL" && (
            <>
              <div className="space-y-4">
                <h3 className="text-md font-medium border-b pb-2">Personal Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name <RequiredLabel />
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={individualData.first_name}
                      onChange={handleIndividualChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name <RequiredLabel />
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={individualData.last_name}
                      onChange={handleIndividualChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Middle Name <OptionalLabel />
                  </label>
                  <input
                    type="text"
                    name="middle_name"
                    value={individualData.middle_name}
                    onChange={handleIndividualChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth <RequiredLabel />
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={individualData.date_of_birth}
                      onChange={handleIndividualChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gender <OptionalLabel />
                    </label>
                    <select
                      name="gender"
                      value={individualData.gender}
                      onChange={handleIndividualChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select (optional)</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nationality <OptionalLabel />
                    <FieldTooltip text="Defaults to NIGERIAN if not specified" />
                  </label>
                  <input
                    type="text"
                    name="nationality"
                    value={individualData.nationality}
                    onChange={handleIndividualChange}
                    placeholder="NIGERIAN"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <h3 className="text-md font-medium border-b pb-2 pt-2">Identification <OptionalLabel /></h3>
                <p className="text-xs text-gray-500 -mt-2">All ID fields are optional</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ID Type <OptionalLabel />
                    </label>
                    <select
                      name="id_type"
                      value={individualData.id_type}
                      onChange={handleIndividualChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select (optional)</option>
                      <option value="NATIONAL_ID">National ID</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVERS_LICENSE">Driver's License</option>
                      <option value="VOTER_ID">Voter's ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ID Number <OptionalLabel />
                    </label>
                    <input
                      type="text"
                      name="id_number"
                      value={individualData.id_number}
                      onChange={handleIndividualChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <h3 className="text-md font-medium border-b pb-2 pt-2">Occupation & Farming <OptionalLabel /></h3>
                <p className="text-xs text-gray-500 -mt-2">All farming fields are optional</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Occupation <OptionalLabel />
                  </label>
                  <input
                    type="text"
                    name="occupation"
                    value={individualData.occupation}
                    onChange={handleIndividualChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Farmer Type <OptionalLabel />
                    </label>
                    <select
                      name="farmer_type"
                      value={individualData.farmer_type}
                      onChange={handleIndividualChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select (optional)</option>
                      <option value="SMALLHOLDER">Smallholder</option>
                      <option value="COMMERCIAL">Commercial</option>
                      <option value="COOPERATIVE">Cooperative Member</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Years Farming <OptionalLabel />
                    </label>
                    <input
                      type="number"
                      name="years_farming"
                      value={individualData.years_farming}
                      onChange={handleIndividualChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Contact Method <OptionalLabel />
                  </label>
                  <select
                    name="preferred_contact_method"
                    value={individualData.preferred_contact_method}
                    onChange={handleIndividualChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select (optional)</option>
                    <option value="EMAIL">Email</option>
                    <option value="PHONE">Phone</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Primary Language <OptionalLabel />
                    <FieldTooltip text="Defaults to ENGLISH if not specified" />
                  </label>
                  <input
                    type="text"
                    name="primary_language"
                    value={individualData.primary_language}
                    onChange={handleIndividualChange}
                    placeholder="ENGLISH"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </>
          )}

          {partyType === "ORGANIZATION" && (
            <>
              <div className="space-y-4">
                <h3 className="text-md font-medium border-b pb-2">Organization Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Legal Business Name <RequiredLabel />
                  </label>
                  <input
                    type="text"
                    name="legal_name"
                    value={orgData.legal_name}
                    onChange={handleOrgChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Trading Name <OptionalLabel />
                  </label>
                  <input
                    type="text"
                    name="trading_name"
                    value={orgData.trading_name}
                    onChange={handleOrgChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Organization Type <RequiredLabel />
                  </label>
                  <select
                    name="organization_type"
                    value={orgData.organization_type}
                    onChange={handleOrgChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select</option>
                    <option value="CORPORATION">Corporation</option>
                    <option value="LLC">LLC</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                    <option value="NON_PROFIT">Non-Profit</option>
                    <option value="COOPERATIVE">Cooperative</option>
                    <option value="GOVERNMENT">Government</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Registration Number <OptionalLabel />
                    </label>
                    <input
                      type="text"
                      name="registration_number"
                      value={orgData.registration_number}
                      onChange={handleOrgChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tax ID <OptionalLabel />
                    </label>
                    <input
                      type="text"
                      name="tax_id"
                      value={orgData.tax_id}
                      onChange={handleOrgChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Industry <OptionalLabel />
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={orgData.industry}
                    onChange={handleOrgChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year Founded <OptionalLabel />
                    </label>
                    <input
                      type="number"
                      name="year_founded"
                      value={orgData.year_founded}
                      onChange={handleOrgChange}
                      min="1800"
                      max={new Date().getFullYear()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Employee Count <OptionalLabel />
                    </label>
                    <input
                      type="number"
                      name="employee_count"
                      value={orgData.employee_count}
                      onChange={handleOrgChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website <OptionalLabel />
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={orgData.website}
                    onChange={handleOrgChange}
                    placeholder="https://"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <h3 className="text-md font-medium border-b pb-2 pt-2">Market Preferences <OptionalLabel /></h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Market <OptionalLabel />
                    </label>
                    <select
                      name="market"
                      value={orgData.market}
                      onChange={handleOrgChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select (optional)</option>
                      <option value="DOMESTIC">Domestic</option>
                      <option value="EXPORT">Export</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Currency <OptionalLabel />
                      <FieldTooltip text="Defaults to USD if not specified" />
                    </label>
                    <select
                      name="preferred_currency"
                      value={orgData.preferred_currency}
                      onChange={handleOrgChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="NGN">NGN</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {partyType === "COMMUNITY" && (
            <>
              <div className="space-y-4">
                <h3 className="text-md font-medium border-b pb-2">Community Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Community Name <RequiredLabel />
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={communityData.name}
                    onChange={handleCommunityChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Community Type <RequiredLabel />
                  </label>
                  <select
                    name="community_type"
                    value={communityData.community_type}
                    onChange={handleCommunityChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select</option>
                    <option value="VILLAGE">Village</option>
                    <option value="TOWN">Town</option>
                    <option value="COOPERATIVE">Cooperative</option>
                    <option value="FARMING_COMMUNITY">Farming Community</option>
                    <option value="PASTORAL">Pastoral Community</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Population <OptionalLabel />
                    </label>
                    <input
                      type="number"
                      name="population"
                      value={communityData.population}
                      onChange={handleCommunityChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Household Count <OptionalLabel />
                    </label>
                    <input
                      type="number"
                      name="household_count"
                      value={communityData.household_count}
                      onChange={handleCommunityChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Region <RequiredLabel />
                    </label>
                    <input
                      type="text"
                      name="region"
                      value={communityData.region}
                      onChange={handleCommunityChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Local Government <RequiredLabel />
                    </label>
                    <input
                      type="text"
                      name="local_government"
                      value={communityData.local_government}
                      onChange={handleCommunityChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ward <OptionalLabel />
                    </label>
                    <input
                      type="text"
                      name="ward"
                      value={communityData.ward}
                      onChange={handleCommunityChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Village <OptionalLabel />
                    </label>
                    <input
                      type="text"
                      name="village"
                      value={communityData.village}
                      onChange={handleCommunityChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <h3 className="text-md font-medium border-b pb-2 pt-2">Facilities <OptionalLabel /></h3>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="has_electricity"
                      checked={communityData.has_electricity}
                      onChange={handleCommunityChange}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Has Electricity</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="has_water_supply"
                      checked={communityData.has_water_supply}
                      onChange={handleCommunityChange}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Has Water Supply</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="has_health_clinic"
                      checked={communityData.has_health_clinic}
                      onChange={handleCommunityChange}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Has Health Clinic</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="has_school"
                      checked={communityData.has_school}
                      onChange={handleCommunityChange}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Has School</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Address fields for all types - ALL OPTIONAL */}
          <div className="pt-4 border-t dark:border-gray-700">
            <h3 className="text-md font-medium mb-4">
              Address Information <OptionalLabel />
            </h3>
            <p className="text-xs text-gray-500 mb-4">All address fields are optional</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Street Address <OptionalLabel />
                </label>
                <input
                  type="text"
                  name="address.address_line1"
                  placeholder="Address line 1 (optional)"
                  value={
                    partyType === "INDIVIDUAL" ? individualData.address.address_line1 :
                    partyType === "ORGANIZATION" ? orgData.address.address_line1 :
                    communityData.address.address_line1
                  }
                  onChange={
                    partyType === "INDIVIDUAL" ? handleIndividualChange :
                    partyType === "ORGANIZATION" ? handleOrgChange :
                    handleCommunityChange
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white mb-2"
                />
                <input
                  type="text"
                  name="address.address_line2"
                  placeholder="Address line 2 (optional)"
                  value={
                    partyType === "INDIVIDUAL" ? individualData.address.address_line2 :
                    partyType === "ORGANIZATION" ? orgData.address.address_line2 :
                    communityData.address.address_line2
                  }
                  onChange={
                    partyType === "INDIVIDUAL" ? handleIndividualChange :
                    partyType === "ORGANIZATION" ? handleOrgChange :
                    handleCommunityChange
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City <OptionalLabel />
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    placeholder="Optional"
                    value={
                      partyType === "INDIVIDUAL" ? individualData.address.city :
                      partyType === "ORGANIZATION" ? orgData.address.city :
                      communityData.address.city
                    }
                    onChange={
                      partyType === "INDIVIDUAL" ? handleIndividualChange :
                      partyType === "ORGANIZATION" ? handleOrgChange :
                      handleCommunityChange
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State <OptionalLabel />
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    placeholder="Optional"
                    value={
                      partyType === "INDIVIDUAL" ? individualData.address.state :
                      partyType === "ORGANIZATION" ? orgData.address.state :
                      communityData.address.state
                    }
                    onChange={
                      partyType === "INDIVIDUAL" ? handleIndividualChange :
                      partyType === "ORGANIZATION" ? handleOrgChange :
                      handleCommunityChange
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Country <OptionalLabel />
                  <FieldTooltip text="Defaults to NG if not specified" />
                </label>
                <select
                  name="address.country"
                  value={
                    partyType === "INDIVIDUAL" ? individualData.address.country :
                    partyType === "ORGANIZATION" ? orgData.address.country :
                    communityData.address.country
                  }
                  onChange={
                    partyType === "INDIVIDUAL" ? handleIndividualChange :
                    partyType === "ORGANIZATION" ? handleOrgChange :
                    handleCommunityChange
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="NG">Nigeria</option>
                  <option value="GH">Ghana</option>
                  <option value="KE">Kenya</option>
                  <option value="ZA">South Africa</option>
                  <option value="TZ">Tanzania</option>
                  <option value="UG">Uganda</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#2e7d32] text-white rounded-md hover:bg-[#1b5e20] disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : "Complete Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}