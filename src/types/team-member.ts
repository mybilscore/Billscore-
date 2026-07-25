// src/types/team-member.ts
export interface TeamMemberFormData {
  // User account details
  email: string;
  password?: string; // Optional - will generate if not provided
  name: string;
  
  // Party type and details
  partyType: "INDIVIDUAL" | "ORGANIZATION" | "COMMUNITY";
  
  // Individual fields
  individual?: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    date_of_birth?: string;
    gender?: string;
    nationality?: string;
    id_type?: string;
    id_number?: string;
    occupation?: string;
    farmer_type?: string;
    years_farming?: number;
    preferred_contact_method?: string;
    primary_language?: string;
  };
  
  // Organization fields
  organization?: {
    legal_name: string;
    trading_name?: string;
    organization_type: string;
    registration_number?: string;
    tax_id?: string;
    industry?: string;
    year_founded?: number;
    employee_count?: number;
    website?: string;
  };
  
  // Community fields
  community?: {
    name: string;
    community_type: string;
    population?: number;
    household_count?: number;
    region: string;
    local_government: string;
    ward?: string;
    village?: string;
    has_electricity?: boolean;
    has_water_supply?: boolean;
    has_health_clinic?: boolean;
    has_school?: boolean;
  };
  
  // Contact information
  contacts: Array<{
    type: string;
    value: string;
    is_primary: boolean;
    is_whatsapp?: boolean;
  }>;
  
  // Address
  address?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    country: string;
    type: string;
  };
  
  // Roles and permissions
  roles: Array<{
    role_name: string;
    platform: string;
    permissions: Record<string, any>;
  }>;
  
  // Additional settings
  send_invite_email: boolean;
  notify_on_create: boolean;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon?: any;
}

export interface ValidationErrors {
  [key: string]: string;
}