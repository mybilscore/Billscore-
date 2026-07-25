// src/lib/services/dashboard.service.ts
import { prisma } from "~/lib/db";
import { redisCache } from "~/lib/cache-service";

export interface DashboardData {
  party: {
    id: number;
    type: string;
    status: string;
    slug: string;
    name: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      country: string;
    } | null;
    storeLink: string;
  };
  stats: {
    totalFarms: number;
    totalHarvests: number;
    totalBales: number;
    totalWeight: number;
    totalMembers: number;
    totalDocuments: number;
  };
  farms: any[];
  recentHarvests: any[];
  recentActivities: Array<{
    id: string;
    action: string;
    farm: string;
    time: string;
    type: "harvest" | "inspection" | "irrigation" | "quality" | "team";
  }>;
  roles: Array<{ name: string; platform: string }>;
  clusterCheck: {
    isAdmin: boolean;
    hasNoClusters: boolean;
  };
  clusters: Array<{
    id: number;
    name: string;
    type: string;
    tier: string;
    status: string;
    farmCount: number;
    memberCount: number;
    centroid: { lat: number | null; lng: number | null };
    gps_boundary?: any;
    createdAt: Date;
  }>;
  currentClusterId: number | null;
  chartData: {
    monthlyHarvests: Array<{ month: string; amount: number; bales: number }>;
    qualityDistribution: Array<{ grade: string; count: number; color: string }>;
  };
  farmStats: {
    totalArea: number;
    activeFarms: number;
    totalFields: number;
    avgFieldSize: number;
    harvestReady: number;
  };
  gisFarms: any[];
  canViewActivities: boolean;
  weatherLocation: {
    lat: number;
    lng: number;
    name: string;
  };
}

export interface DashboardFilters {
  slug: string;
  partyId: number;
  userId: number;
  clusterId?: number | null;
  isSuperAdmin?: boolean;
  partyStatus?: string;
  skipCache?: boolean; // Add option to skip cache when needed
}

function getPartyName(party: any): string {
  if (party.individual) {
    return `${party.individual.first_name || ''} ${party.individual.last_name || ''}`.trim() || "Unknown";
  }
  if (party.organization) {
    return party.organization.name || "Unknown";
  }
  if (party.community) {
    return party.community.name || "Unknown";
  }
  return party.slug || "Unknown";
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

function getLast6Months() {
  const months = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push({
      month: date.getMonth(),
      year: date.getFullYear(),
      shortName: monthNames[date.getMonth()],
      fullName: date.toLocaleString('default', { month: 'long' }),
    });
  }
  return months;
}

function getQualityColor(quality: string | null): string {
  switch(quality) {
    case "Supreme": return "#2e7d32";
    case "Premium": return "#1b5e20";
    case "Standard": return "#374151";
    default: return "#6B7280";
  }
}

// Generate cache key based on filters
function generateCacheKey(filters: DashboardFilters): string {
  const { slug, partyId, userId, clusterId, isSuperAdmin, partyStatus } = filters;
  return `dashboard:${slug}:${partyId}:${userId}:${clusterId || 'none'}:${isSuperAdmin || false}:${partyStatus || 'none'}`;
}

// Invalidation function to clear dashboard cache when data changes
export async function invalidateDashboardCache(slug: string, partyId: number, userId: number) {
  try {
    // Delete all dashboard cache keys for this user/party
    const pattern = `dashboard:${slug}:${partyId}:${userId}:*`;
    const deletedCount = await redisCache.deletePattern(pattern);
    console.log(`🗑️ Invalidated ${deletedCount} dashboard cache entries for ${slug}`);
    return deletedCount;
  } catch (error) {
    console.error("Failed to invalidate dashboard cache:", error);
    return 0;
  }
}

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  const { slug, partyId, userId, clusterId, isSuperAdmin = false, partyStatus, skipCache = false } = filters;

  // Generate cache key
  const cacheKey = generateCacheKey(filters);
  
  // Try to get from cache first (unless skipCache is true)
  if (!skipCache) {
    try {
      const cachedData = await redisCache.get<DashboardData>(cacheKey);
      if (cachedData) {
        console.log(`✅ Dashboard cache hit for ${cacheKey}`);
        return cachedData;
      }
      console.log(`📦 Dashboard cache miss for ${cacheKey}, fetching from database...`);
    } catch (error) {
      console.error("Redis cache read error, falling back to database:", error);
      // Continue to database fetch if cache fails
    }
  }

  // If not in cache or cache disabled, fetch from database
  const startTime = Date.now();
  
  const party = await prisma.parties.findUnique({
    where: { id: partyId },
    include: {
      individual: true,
      organization: true,
      community: true,
      contacts: { where: { is_primary: true }, take: 1 },
      addresses: { where: { is_primary: true }, take: 1 },
    },
  });

  if (!party) {
    throw new Error(`Party with ID ${partyId} not found`);
  }

  // Get all accessible clusters - INCLUDE gps_boundary
  const accessibleClusters = await prisma.clusters.findMany({
    where: {
      OR: [
        { coordinator_id: partyId },
        { supervisor_id: partyId },
        { anchor_id: partyId },
        { community_id: partyId },
        { members: { some: { party_id: partyId, membership_status: "ACTIVE" } } }
      ],
    },
    select: {
      id: true,
      name: true,
      centroid_lat: true,
      centroid_lng: true,
      gps_boundary: true,
      cluster_type: true,
      tier: true,
      status: true,
      created_at: true,
      _count: { select: { farms: true, members: true } }
    },
    orderBy: { name: 'asc' },
  });

  const clusterIds = accessibleClusters.map(c => c.id);
  const currentClusterId = clusterId && accessibleClusters.some(c => c.id === clusterId)
    ? clusterId
    : (accessibleClusters[0]?.id || null);

  // Build farm where clause
  const farmWhereClause: any = {
    OR: [
      { owner_party_id: partyId },
      { operator_party_id: partyId },
    ],
  };

  if (currentClusterId) {
    farmWhereClause.cluster_id = currentClusterId;
  } else if (clusterIds.length > 0) {
    farmWhereClause.OR.push({ cluster_id: { in: clusterIds } });
  }

  // Fetch farms
  const farms = await prisma.cluster_farms.findMany({
    where: farmWhereClause,
    include: {
      cluster: { select: { name: true } },
      fields: {
        select: {
          id: true, field_number: true, name: true, area_ha: true, status: true,
          soil_type: true, soil_depth: true, slope: true, irrigation_method: true,
          latitude: true, longitude: true, gps_boundary: true, created_at: true,
        },
      },
      _count: { select: { fields: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const farmIds = farms.map(f => f.id);
  const fields = await prisma.farm_fields.findMany({
    where: { farm_id: { in: farmIds } },
    select: { id: true, area_ha: true },
  });
  const fieldIds = fields.map(f => f.id);

  // Get harvests
  const harvests = await prisma.harvests.findMany({
    where: { field_id: { in: fieldIds } },
    include: {
      cycle: { select: { crop_type: true } },
      field: { include: { farm: { select: { name: true } } } },
      _count: { select: { bales: true } },
    },
    orderBy: { harvest_date: 'desc' },
    take: 10,
  });

  const totalHarvests = await prisma.harvests.count({
    where: { field_id: { in: fieldIds } },
  });

  const harvestStats = await prisma.harvests.aggregate({
    where: { field_id: { in: fieldIds } },
    _sum: { actual_bales: true, actual_weight_kg: true },
  });

  const qualityDistribution = await prisma.harvests.groupBy({
    by: ['visual_quality'],
    where: { field_id: { in: fieldIds }, visual_quality: { not: null } },
    _count: true,
  });

  // Get team members
  const teamMembers = await prisma.parties.findMany({
    where: {
      OR: [
        { slug: slug },
        { slug: { startsWith: `${slug}-` } },
        { representatives: { some: { represented_party_id: partyId, is_active: true } } },
        { cluster_memberships: { some: { cluster: { id: { in: clusterIds } }, membership_status: "ACTIVE" } } },
      ],
      id: { not: partyId },
    },
    distinct: ['id'],
  });

  const documents = await prisma.party_documents.count({
    where: { party_id: partyId },
  });

  const userRoles = await prisma.party_roles.findMany({
    where: { party_id: userId, is_active: true },
    select: { role_name: true, platform: true },
  });

  const isAdmin = userRoles.some(role => 
    ["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "SUPERVISOR"].includes(role.role_name)
  );

  // Fetch recent activities (keep existing code)
  let recentActivities: Array<{
    id: string;
    action: string;
    farm: string;
    time: string;
    type: "harvest" | "inspection" | "irrigation" | "quality" | "team";
  }> = [];

  if (isAdmin || isSuperAdmin) {
    const recentFarms = await prisma.cluster_farms.findMany({
      where: farmWhereClause,
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { cluster: { select: { name: true } } }
    });

    const recentFields = await prisma.farm_fields.findMany({
      where: { farm_id: { in: farmIds } },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { farm: { select: { name: true } } }
    });

    const recentCropCycles = await prisma.crop_cycles.findMany({
      where: { field_id: { in: fieldIds } },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { field: { include: { farm: { select: { name: true } } } } }
    });

    const recentHarvestsActivity = await prisma.harvests.findMany({
      where: { field_id: { in: fieldIds } },
      orderBy: { harvest_date: 'desc' },
      take: 5,
      include: { field: { include: { farm: { select: { name: true } } } } }
    });

    const recentCycleActivities = await prisma.cycle_activities.findMany({
      where: { cycle: { field_id: { in: fieldIds } } },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { cycle: { include: { field: { include: { farm: { select: { name: true } } } } } } }
    });

    const recentIotAlerts = await prisma.iot_alerts.findMany({
      where: { device: { farm_id: { in: farmIds } } },
      orderBy: { detected_at: 'desc' },
      take: 5,
      include: { device: { include: { farm: { select: { name: true } } } } }
    });

    const recentTeamMembers = await prisma.parties.findMany({
      where: {
        OR: [
          { slug: { startsWith: `${slug}-` } },
          { representatives: { some: { represented_party_id: partyId, is_active: true } } },
        ],
        id: { not: partyId },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: { individual: true, organization: true }
    });

    const recentClusters = await prisma.clusters.findMany({
      where: {
        OR: [
          { coordinator_id: partyId },
          { supervisor_id: partyId },
          { anchor_id: partyId },
          { community_id: partyId },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    const allActivities: Array<{
      id: string;
      action: string;
      farm: string;
      time: string;
      type: "harvest" | "inspection" | "irrigation" | "quality" | "team";
      timestamp: Date;
    }> = [];

    recentFarms.forEach(f => {
      allActivities.push({
        id: `farm-${f.id}`,
        action: `New farm created: ${f.name}`,
        farm: f.cluster?.name || "N/A",
        time: formatTimeAgo(f.created_at),
        type: "inspection",
        timestamp: f.created_at,
      });
    });

    recentFields.forEach(f => {
      allActivities.push({
        id: `field-${f.id}`,
        action: `New field added: ${f.name || f.field_number}`,
        farm: f.farm?.name || "N/A",
        time: formatTimeAgo(f.created_at),
        type: "inspection",
        timestamp: f.created_at,
      });
    });

    recentCropCycles.forEach(c => {
      allActivities.push({
        id: `cycle-${c.id}`,
        action: `${c.crop_type} crop cycle ${c.cycle_number} started`,
        farm: c.field?.farm?.name || "N/A",
        time: formatTimeAgo(c.created_at),
        type: "irrigation",
        timestamp: c.created_at,
      });
    });

    recentHarvestsActivity.forEach(h => {
      allActivities.push({
        id: `harvest-${h.id}`,
        action: `Harvest recorded (Cut ${h.cut_number}) - ${h.actual_bales || 0} bales, ${h.actual_weight_kg || 0}kg`,
        farm: h.field?.farm?.name || "N/A",
        time: formatTimeAgo(h.harvest_date),
        type: "harvest",
        timestamp: h.harvest_date,
      });
    });

    recentCycleActivities.forEach(a => {
      let action = "";
      switch(a.activity_type) {
        case "IRRIGATION":
          action = `Irrigation performed - ${a.water_volume || 0}L`;
          break;
        case "FERTILIZATION":
          action = `Fertilizer applied - ${a.product_name || "Unknown"}`;
          break;
        case "PEST_CONTROL":
          action = `Pest control treatment - ${a.product_name || "Unknown"}`;
          break;
        default:
          action = a.activity_type?.replace(/_/g, ' ') || "Activity recorded";
      }
      allActivities.push({
        id: `activity-${a.id}`,
        action: action,
        farm: a.cycle?.field?.farm?.name || "N/A",
        time: formatTimeAgo(a.created_at),
        type: "irrigation",
        timestamp: a.created_at,
      });
    });

    recentIotAlerts.forEach(a => {
      allActivities.push({
        id: `alert-${a.id}`,
        action: `${a.alert_type} alert: ${a.severity} severity - Value: ${a.actual_value}`,
        farm: a.device?.farm?.name || "N/A",
        time: formatTimeAgo(a.detected_at),
        type: "quality",
        timestamp: a.detected_at,
      });
    });

    recentTeamMembers.forEach(m => {
      const memberName = m.individual 
        ? `${m.individual.first_name || ''} ${m.individual.last_name || ''}`.trim() 
        : m.organization?.name || "Unknown";
      allActivities.push({
        id: `team-${m.id}`,
        action: `Team member joined: ${memberName}`,
        farm: party.organization?.name || slug,
        time: formatTimeAgo(m.created_at),
        type: "team",
        timestamp: m.created_at,
      });
    });

    recentClusters.forEach(c => {
      allActivities.push({
        id: `cluster-${c.id}`,
        action: `New cluster created: ${c.name}`,
        farm: c.name,
        time: formatTimeAgo(c.created_at),
        type: "team",
        timestamp: c.created_at,
      });
    });

    recentActivities = allActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(({ id, action, farm, time, type }) => ({ id, action, farm, time, type }));
  }

  // Prepare monthly harvest data
  const last6Months = getLast6Months();
  const monthlyHarvestData = await Promise.all(
    last6Months.map(async (month) => {
      const startDate = new Date(month.year, month.month, 1);
      const endDate = new Date(month.year, month.month + 1, 0);
      const monthHarvests = await prisma.harvests.aggregate({
        where: { field_id: { in: fieldIds }, harvest_date: { gte: startDate, lte: endDate } },
        _sum: { actual_weight_kg: true, actual_bales: true },
      });
      return {
        month: month.shortName,
        amount: monthHarvests._sum.actual_weight_kg || 0,
        bales: monthHarvests._sum.actual_bales || 0,
      };
    })
  );

  const totalFarmArea = farms.reduce((sum, f) => sum + (f.total_area_ha || 0), 0);
  const activeFarms = farms.filter(f => f.status === "ACTIVE").length;
  const totalFields = farms.reduce((sum, f) => sum + f._count.fields, 0);
  const avgFieldSize = fields.length > 0 
    ? fields.reduce((sum, f) => sum + (f.area_ha || 0), 0) / fields.length 
    : 0;

  const currentCluster = accessibleClusters.find(c => c.id === currentClusterId);
  const gisFarms = farms.slice(0, 4).map((farm, index) => ({
    id: farm.id,
    name: farm.name,
    type: farm.farm_type || "Farm",
    area: farm.total_area_ha || 0,
    crop: farm.current_crop || "No crop",
    status: farm.status === "ACTIVE" ? "active" as const : "inactive" as const,
    coordinates: {
      x: 10 + (index * 15) % 70,
      y: 10 + (index * 10) % 60,
      width: 20,
      height: 15 + (index * 5) % 15,
    },
    color: ["#2e7d32", "#1b5e20", "#374151", "#6B7280"][index % 4],
  }));

  // Determine the final status to return
  // Use partyStatus if provided (from server page), otherwise use party.status
  const finalStatus = partyStatus || party.status;

  const dashboardData: DashboardData = {
    party: {
      id: party.id,
      type: party.type,
      status: finalStatus,
      slug: party.slug,
      name: getPartyName(party),
      displayName: getPartyName(party),
      email: party.contacts?.[0]?.value || null,
      phone: null,
      address: party.addresses?.[0] ? {
        line1: party.addresses[0].address_line1,
        line2: party.addresses[0].address_line2,
        city: party.addresses[0].city,
        state: party.addresses[0].state,
        country: party.addresses[0].country,
      } : null,
      storeLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${slug}`,
    },
    stats: {
      totalFarms: farms.length,
      totalHarvests,
      totalBales: harvestStats._sum.actual_bales || 0,
      totalWeight: harvestStats._sum.actual_weight_kg || 0,
      totalMembers: teamMembers.length,
      totalDocuments: documents,
    },
    farms: farms.map(f => ({
      id: f.id,
      name: f.name,
      type: f.farm_type || "Farm",
      status: f.status,
      area: f.total_area_ha,
      location: f.cluster?.name || null,
      fieldCount: f._count.fields,
      created_at: f.created_at,
      soil_type: f.soil_type,
      soil_ph: f.soil_ph,
      soil_fertility: f.soil_fertility,
      soil_report_url: f.soil_report_url,
      irrigation_type: f.irrigation_type,
      irrigation_source: f.irrigation_source,
      water_rights: f.water_rights,
      current_crop: f.current_crop,
      crop_variety: f.crop_variety,
      planting_date: f.planting_date ? f.planting_date.toISOString() : null,
      expected_harvest: f.expected_harvest ? f.expected_harvest.toISOString() : null,
      latitude: f.latitude,
      longitude: f.longitude,
      gps_boundary: f.gps_boundary,
      cluster_id: f.cluster_id,
      cluster_name: f.cluster?.name,
      fields: f.fields.map(field => ({
        id: field.id,
        field_number: field.field_number,
        name: field.name,
        area_ha: field.area_ha,
        status: field.status,
        soil_type: field.soil_type,
        soil_depth: field.soil_depth,
        slope: field.slope,
        irrigation_method: field.irrigation_method,
        latitude: field.latitude,
        longitude: field.longitude,
        gps_boundary: field.gps_boundary,
        created_at: field.created_at,
      })),
    })),
    recentHarvests: harvests.map(h => ({
      id: h.id,
      date: h.harvest_date,
      weight: h.actual_weight_kg,
      baleCount: h._count.bales,
      quality: h.visual_quality,
      status: h.status,
      cropType: h.cycle?.crop_type,
    })),
    recentActivities,
    roles: userRoles.map(role => ({ name: role.role_name, platform: role.platform })),
    clusterCheck: { isAdmin, hasNoClusters: accessibleClusters.length === 0 },
    clusters: accessibleClusters.map(cluster => ({
      id: cluster.id,
      name: cluster.name,
      type: cluster.cluster_type,
      tier: cluster.tier,
      status: cluster.status,
      farmCount: cluster._count.farms,
      memberCount: cluster._count.members,
      centroid: { lat: cluster.centroid_lat, lng: cluster.centroid_lng },
      gps_boundary: cluster.gps_boundary,
      createdAt: cluster.created_at,
    })),
    currentClusterId,
    chartData: {
      monthlyHarvests: monthlyHarvestData,
      qualityDistribution: qualityDistribution.map(q => ({
        grade: q.visual_quality || "Standard",
        count: q._count,
        color: getQualityColor(q.visual_quality),
      })),
    },
    farmStats: {
      totalArea: totalFarmArea,
      activeFarms,
      totalFields,
      avgFieldSize,
      harvestReady: farms.filter(f => f.current_crop && f.expected_harvest).length,
    },
    gisFarms,
    canViewActivities: isAdmin || isSuperAdmin,
    weatherLocation: {
      lat: currentCluster?.centroid_lat || party.addresses?.[0]?.latitude || 9.081999,
      lng: currentCluster?.centroid_lng || party.addresses?.[0]?.longitude || 8.675277,
      name: currentCluster?.name || party.addresses?.[0]?.city || slug || "Nigeria",
    },
  };

  // Cache the result (TTL: 5 minutes default)
  const endTime = Date.now();
  const duration = endTime - startTime;
  console.log(`📊 Dashboard data fetched in ${duration}ms, caching result...`);
  
  try {
    await redisCache.set(cacheKey, dashboardData, { ttl: 5 * 60 }); // Cache for 5 minutes
    console.log(`💾 Dashboard data cached for ${cacheKey}`);
  } catch (error) {
    console.error("Failed to cache dashboard data:", error);
    // Don't throw error if caching fails, just log it
  }

  return dashboardData;
}