// src/contexts/TenantContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

interface TenantContextType {
  partyId: number | null;
  partyType: string | null;
  isOwnTenant: boolean;
  isSuperAdmin: boolean;
  tenantData: any | null;
}

const TenantContext = createContext<TenantContextType>({
  partyId: null,
  partyType: null,
  isOwnTenant: false,
  isSuperAdmin: false,
  tenantData: null,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const [tenantData, setTenantData] = useState<any>(null);

  const partyId = params?.partyId ? parseInt(params.partyId as string) : null;
  const partyType = params?.partyType as string | null;

  const isOwnTenant = session?.user?.partyId === partyId;
  const isSuperAdmin = session?.user?.isSuperAdmin || false;

  // Fetch tenant data if needed (for super admins viewing other tenants)
  useEffect(() => {
    if (partyId && (!isOwnTenant || isSuperAdmin)) {
      fetch(`/api/parties/${partyId}`)
        .then(res => res.json())
        .then(data => setTenantData(data))
        .catch(console.error);
    }
  }, [partyId, isOwnTenant, isSuperAdmin]);

  return (
    <TenantContext.Provider value={{
      partyId,
      partyType,
      isOwnTenant,
      isSuperAdmin,
      tenantData,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);