// src/app/[slug]/settings/modals/farm-settings-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  X,
  Sprout,
  MapPin,
  Save,
  Building,
  ChevronDown,
  Loader2,
  Info,
  ChevronLeft,
  ChevronRight,
  FileText,
  Droplets,
  Leaf,
  Ruler,
  Calendar,
  Globe,
  Map,
  Compass,
  Layers,
  Tractor,
  Users,
  User,
  Phone,
  Mail,
  Home,
  Shield,
  Target,
  Award,
  Clock,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Grid,
  List,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Landmark,
  Truck,
  Gauge,
  Wheat,
  Flower2,
} from "lucide-react";

interface FarmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  slug: string;
  farm: any | null;
  partyId: number;
}

interface FormData {
  // Basic Info
  id: string;
  name: string;
  farm_type: string;
  status: string;
  
  // Location & GPS
  latitude: string;
  longitude: string;
  gps_boundary: string;
  
  // Area
  total_area_ha: string;
  cultivable_ha: string;
  
  // Soil Information
  soil_type: string;
  soil_ph: string;
  soil_fertility: string;
  soil_report_url: string;
  
  // Land Title
  land_title_type: string;
  land_registration_number: string;
  land_doc_url: string;
  
  // Irrigation
  irrigation_type: string;
  irrigation_source: string;
  water_rights: boolean;
  
  // Current Crop
  current_crop: string;
  crop_variety: string;
  planting_date: string;
  expected_harvest: string;
  
  // Additional Fields
  description: string;
  notes: string;
}

interface Cluster {
  id: number;
  name: string;
  uid: string;
  region?: string | null;
  local_government?: string | null;
}

const farmTypes = [
  { value: "ALFALFA", label: "Alfalfa", icon: Sprout, description: "Alfalfa production" },
  { value: "CORN", label: "Corn", icon: Wheat, description: "Corn production" },
  { value: "WHEAT", label: "Wheat", icon: Wheat, description: "Wheat production" },
  { value: "SOYBEAN", label: "Soybean", icon: Leaf, description: "Soybean production" },
  { value: "MIXED", label: "Mixed", icon: Layers, description: "Mixed crops" },
  { value: "OTHER", label: "Other", icon: Flower2, description: "Other crop types" },
];

const soilTypes = [
  { value: "LOAMY", label: "Loamy", description: "Ideal for agriculture - balanced texture" },
  { value: "SANDY", label: "Sandy", description: "Light, well-draining, low nutrients" },
  { value: "CLAY", label: "Clay", description: "Heavy, nutrient-rich, poor drainage" },
  { value: "SILTY", label: "Silty", description: "Fertile, retains moisture" },
  { value: "PEATY", label: "Peaty", description: "High organic matter, acidic" },
  { value: "CHALKY", label: "Chalky", description: "Alkaline, stony" },
];

const soilFertility = [
  { value: "HIGH", label: "High", color: "text-green-600", icon: Award },
  { value: "MEDIUM", label: "Medium", color: "text-yellow-600", icon: Target },
  { value: "LOW", label: "Low", color: "text-red-600", icon: AlertCircle },
];

const irrigationTypes = [
  { value: "DRIP", label: "Drip Irrigation", icon: Droplets, description: "Efficient water delivery to roots" },
  { value: "SPRINKLER", label: "Sprinkler", icon: Sprout, description: "Overhead watering system" },
  { value: "FLOOD", label: "Flood", icon: Sprout, description: "Surface flooding" },
  { value: "CENTER_PIVOT", label: "Center Pivot", icon: Tractor, description: "Rotating sprinkler system" },
  { value: "RAINFED", label: "Rainfed", icon: Sprout, description: "Relies on natural rainfall" },
];

const irrigationSources = [
  { value: "WELL", label: "Well/Borehole", icon: Droplets },
  { value: "RIVER", label: "River/Stream", icon: Sprout },
  { value: "RESERVOIR", label: "Reservoir/Dam", icon: Landmark },
  { value: "MUNICIPAL", label: "Municipal Supply", icon: Building },
  { value: "RAIN", label: "Rainwater Harvesting", icon: Sprout },
];

const landTitleTypes = [
  { value: "OWNED", label: "Owned", icon: Home, description: "Freehold ownership" },
  { value: "LEASED", label: "Leased", icon: FileText, description: "Leasehold agreement" },
  { value: "COMMUNAL", label: "Communal", icon: Users, description: "Community-owned land" },
  { value: "CUSTOMARY", label: "Customary", icon: Shield, description: "Traditional tenure" },
];

// Helper components
const Waves = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c0-2 2-4 4-4s4 2 4 4 2 4 4 4 4-2 4-4 2-4 4-4 4 2 4 4"/></svg>;
const CloudRain = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.9A7 7 0 1 1 15.9 8h1.6a4 4 0 0 1 2.5 7"/><path d="M12 13v4"/><path d="M8 16v2"/><path d="M16 15v3"/></svg>;

export function FarmSettingsModal({ isOpen, onClose, onSuccess, slug, farm, partyId }: FarmSettingsModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSoilSection, setShowSoilSection] = useState(false);
  const [showLandSection, setShowLandSection] = useState(false);
  const [showIrrigationSection, setShowIrrigationSection] = useState(false);
  const [showCropSection, setShowCropSection] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

  const [formData, setFormData] = useState<FormData>({
    // Basic Info
    id: farm?.id || "",
    name: farm?.name || "",
    farm_type: farm?.farm_type || "ALFALFA",
    status: farm?.status || "ACTIVE",
    
    // Location & GPS
    latitude: farm?.latitude?.toString() || "",
    longitude: farm?.longitude?.toString() || "",
    gps_boundary: farm?.gps_boundary ? JSON.stringify(farm.gps_boundary) : "",
    
    // Area
    total_area_ha: farm?.total_area_ha?.toString() || "",
    cultivable_ha: farm?.cultivable_ha?.toString() || "",
    
    // Soil Information
    soil_type: farm?.soil_type || "",
    soil_ph: farm?.soil_ph?.toString() || "",
    soil_fertility: farm?.soil_fertility || "",
    soil_report_url: farm?.soil_report_url || "",
    
    // Land Title
    land_title_type: farm?.land_title_type || "",
    land_registration_number: farm?.land_registration_number || "",
    land_doc_url: farm?.land_doc_url || "",
    
    // Irrigation
    irrigation_type: farm?.irrigation_type || "",
    irrigation_source: farm?.irrigation_source || "",
    water_rights: farm?.water_rights || false,
    
    // Current Crop
    current_crop: farm?.current_crop || "",
    crop_variety: farm?.crop_variety || "",
    planting_date: farm?.planting_date?.split('T')[0] || "",
    expected_harvest: farm?.expected_harvest?.split('T')[0] || "",
    
    // Additional Fields
    description: farm?.description || "",
    notes: farm?.notes || "",
  });

  // Fetch clusters when modal opens for new farm
  useEffect(() => {
    if (isOpen && !farm) {
      fetchClusters();
    }
  }, [isOpen, farm]);

  const fetchClusters = async () => {
    setLoadingClusters(true);
    try {
      const response = await fetch(`/api/${slug}/clusters?limit=100`);
      if (!response.ok) {
        throw new Error("Failed to fetch clusters");
      }
      const data = await response.json();
      
      if (data.clusters && Array.isArray(data.clusters)) {
        setClusters(data.clusters);
      } else {
        setClusters([]);
      }
    } catch (error) {
      console.error("Error fetching clusters:", error);
      toast.error("Failed to load clusters");
    } finally {
      setLoadingClusters(false);
    }
  };

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

  const handleClusterSelect = (clusterId: string) => {
    const cluster = clusters.find(c => c.id.toString() === clusterId);
    if (cluster) {
      setSelectedCluster(cluster);
    }
  };

  const validateStep1 = () => {
    if (!selectedCluster && !farm) {
      toast.error("Please select a cluster");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.name) {
      toast.error("Farm name is required");
      return false;
    }
    if (!formData.total_area_ha) {
      toast.error("Total area is required");
      return false;
    }
    if (parseFloat(formData.total_area_ha) <= 0) {
      toast.error("Total area must be greater than 0");
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
      const isEditing = !!farm;
      const url = isEditing 
        ? `/api/${slug}/farms/${farm.id}`
        : `/api/${slug}/farms`;
      
      const method = isEditing ? "PUT" : "POST";
      
      const payload = {
        // Basic Info
        name: formData.name,
        farm_type: formData.farm_type,
        status: formData.status || "ACTIVE",
        
        // Location & GPS
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        gps_boundary: formData.gps_boundary ? 
          (typeof formData.gps_boundary === 'string' ? JSON.parse(formData.gps_boundary) : formData.gps_boundary) 
          : null,
        
        // Area
        total_area_ha: parseFloat(formData.total_area_ha),
        cultivable_ha: formData.cultivable_ha ? parseFloat(formData.cultivable_ha) : null,
        
        // Soil Information
        soil_type: formData.soil_type || null,
        soil_ph: formData.soil_ph ? parseFloat(formData.soil_ph) : null,
        soil_fertility: formData.soil_fertility || null,
        soil_report_url: formData.soil_report_url || null,
        
        // Land Title
        land_title_type: formData.land_title_type || null,
        land_registration_number: formData.land_registration_number || null,
        land_doc_url: formData.land_doc_url || null,
        
        // Irrigation
        irrigation_type: formData.irrigation_type || null,
        irrigation_source: formData.irrigation_source || null,
        water_rights: formData.water_rights,
        
        // Current Crop
        current_crop: formData.current_crop || null,
        crop_variety: formData.crop_variety || null,
        planting_date: formData.planting_date || null,
        expected_harvest: formData.expected_harvest || null,
        
        // Additional Fields
        description: formData.description || null,
        notes: formData.notes || null,
        
        // Relationships (only for new farms)
        ...(!isEditing && {
          cluster_id: selectedCluster?.id,
          owner_party_id: partyId,
          operator_party_id: partyId,
          created_by: partyId,
        }),
      };

      console.log(`${isEditing ? "Updating" : "Creating"} farm with data:`, payload);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Failed to ${isEditing ? "update" : "create"} farm`);
      }

      const result = await response.json();
      
      toast.success(isEditing ? "Farm updated successfully!" : "Farm added successfully!");
      
      onSuccess?.();
      onClose();
      
      // Reset form if not editing
      if (!isEditing) {
        setFormData({
          id: "",
          name: "",
          farm_type: "ALFALFA",
          status: "ACTIVE",
          latitude: "",
          longitude: "",
          gps_boundary: "",
          total_area_ha: "",
          cultivable_ha: "",
          soil_type: "",
          soil_ph: "",
          soil_fertility: "",
          soil_report_url: "",
          land_title_type: "",
          land_registration_number: "",
          land_doc_url: "",
          irrigation_type: "",
          irrigation_source: "",
          water_rights: false,
          current_crop: "",
          crop_variety: "",
          planting_date: "",
          expected_harvest: "",
          description: "",
          notes: "",
        });
        setCurrentStep(1);
        setSelectedCluster(null);
      }
      
      setShowAdvanced(false);
      setShowSoilSection(false);
      setShowLandSection(false);
      setShowIrrigationSection(false);
      setShowCropSection(false);
      
      router.refresh();
      
    } catch (error: any) {
      console.error("Error saving farm:", error);
      
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        toast.error("Invalid JSON format in GPS boundary");
      } else {
        toast.error(error.message || "Failed to save farm. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!farm) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${farm.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/${slug}/farms/${farm.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete farm");
      }

      toast.success("Farm deleted successfully");
      onSuccess?.();
      onClose();
      router.refresh();
    } catch (error: any) {
      console.error("Error deleting farm:", error);
      toast.error(error.message || "Failed to delete farm");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    if (farm) return null;
    
    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Select Cluster</span>
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
            <span className="ml-2 text-sm font-medium">Farm Details</span>
          </div>
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Building className="h-5 w-5" />
        Select Cluster
      </h3>
      
      {loadingClusters ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : clusters.length === 0 ? (
        <div className="text-center py-8">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No clusters available</p>
          <p className="text-xs text-gray-400 mt-1">Create a cluster first</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto p-1">
          {clusters.map((cluster) => (
            <button
              key={cluster.id}
              type="button"
              onClick={() => handleClusterSelect(cluster.id.toString())}
              className={`p-4 rounded-lg border text-left transition-all ${
                selectedCluster?.id === cluster.id
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-200 hover:border-primary/30 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{cluster.name}</h4>
                  <p className="text-xs text-gray-500">ID: {cluster.uid}</p>
                  {cluster.region && (
                    <p className="text-xs text-gray-400 mt-1">{cluster.region}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      <h3 className="text-lg font-medium flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10">
        <Sprout className="h-5 w-5" />
        Farm Details
      </h3>
      
      {/* Selected cluster summary (for new farm) */}
      {!farm && selectedCluster && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg sticky top-12 z-10">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Adding farm to cluster: <span className="font-bold">{selectedCluster.name}</span>
          </p>
        </div>
      )}

      {/* Basic Information - Required */}
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          Basic Information (Required)
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Farm Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., North Field"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Farm Type *
            </label>
            <select
              name="farm_type"
              value={formData.farm_type}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {farmTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Area (ha) *
            </label>
            <input
              type="number"
              name="total_area_ha"
              value={formData.total_area_ha}
              onChange={handleChange}
              required
              step="0.01"
              min="0.01"
              placeholder="e.g., 45.5"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cultivable Area (ha)
            </label>
            <input
              type="number"
              name="cultivable_ha"
              value={formData.cultivable_ha}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="e.g., 40.2"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Location & GPS Section */}
      <div className="border rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Location & GPS (Optional)</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Latitude
                </label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  step="any"
                  min="-90"
                  max="90"
                  placeholder="e.g., 9.081999"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Longitude
                </label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  step="any"
                  min="-180"
                  max="180"
                  placeholder="e.g., 7.683333"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                GPS Boundary (GeoJSON)
              </label>
              <textarea
                name="gps_boundary"
                value={formData.gps_boundary}
                onChange={handleChange}
                rows={3}
                placeholder='{"type": "Polygon", "coordinates": [...]}'
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Soil Information Section */}
      <div className="border rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowSoilSection(!showSoilSection)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            <span>Soil Information (Optional)</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showSoilSection ? 'rotate-180' : ''}`} />
        </button>
        
        {showSoilSection && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Soil Type
                </label>
                <select
                  name="soil_type"
                  value={formData.soil_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select soil type</option>
                  {soilTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Soil pH
                </label>
                <input
                  type="number"
                  name="soil_ph"
                  value={formData.soil_ph}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  max="14"
                  placeholder="e.g., 6.5"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Soil Fertility
                </label>
                <select
                  name="soil_fertility"
                  value={formData.soil_fertility}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select fertility</option>
                  {soilFertility.map(fertility => (
                    <option key={fertility.value} value={fertility.value}>{fertility.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Soil Report URL
                </label>
                <input
                  type="url"
                  name="soil_report_url"
                  value={formData.soil_report_url}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Land Title Section */}
      <div className="border rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowLandSection(!showLandSection)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Land Title (Optional)</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showLandSection ? 'rotate-180' : ''}`} />
        </button>
        
        {showLandSection && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Title Type
                </label>
                <select
                  name="land_title_type"
                  value={formData.land_title_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select type</option>
                  {landTitleTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Registration Number
                </label>
                <input
                  type="text"
                  name="land_registration_number"
                  value={formData.land_registration_number}
                  onChange={handleChange}
                  placeholder="e.g., LAND-2024-001"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Land Document URL
                </label>
                <input
                  type="url"
                  name="land_doc_url"
                  value={formData.land_doc_url}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Irrigation Section */}
      <div className="border rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowIrrigationSection(!showIrrigationSection)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            <span>Irrigation (Optional)</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showIrrigationSection ? 'rotate-180' : ''}`} />
        </button>
        
        {showIrrigationSection && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Irrigation Type
                </label>
                <select
                  name="irrigation_type"
                  value={formData.irrigation_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select type</option>
                  {irrigationTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Irrigation Source
                </label>
                <select
                  name="irrigation_source"
                  value={formData.irrigation_source}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select source</option>
                  {irrigationSources.map(source => (
                    <option key={source.value} value={source.value}>{source.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="water_rights"
                    checked={formData.water_rights}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Has water rights
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Crop Section */}
      <div className="border rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowCropSection(!showCropSection)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Current Crop (Optional)</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${showCropSection ? 'rotate-180' : ''}`} />
        </button>
        
        {showCropSection && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Crop Type
                </label>
                <input
                  type="text"
                  name="current_crop"
                  value={formData.current_crop}
                  onChange={handleChange}
                  placeholder="e.g., Alfalfa"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Variety
                </label>
                <input
                  type="text"
                  name="crop_variety"
                  value={formData.crop_variety}
                  onChange={handleChange}
                  placeholder="e.g., Supreme"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Planting Date
                </label>
                <input
                  type="date"
                  name="planting_date"
                  value={formData.planting_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Expected Harvest
                </label>
                <input
                  type="date"
                  name="expected_harvest"
                  value={formData.expected_harvest}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          placeholder="Add any notes about this farm..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            You'll be set as the farm owner and operator. All fields except Farm Name, Farm Type, and Total Area are optional and can be updated later.
          </p>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  const isEditing = !!farm;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-xl dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <Sprout className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isEditing ? "Edit Farm" : "Add New Farm"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isEditing 
                    ? "Update farm details and settings"
                    : "Select a cluster and add farm details"}
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
                    disabled={!selectedCluster}
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
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Create Farm
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <div className="flex w-full justify-end gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Farm
                </button>
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
                      Update Farm
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