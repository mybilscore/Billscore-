// src/services/analytics/types.ts

// Time range options
export type TimeRange = "7d" | "30d" | "90d" | "1y";

// Date range
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Base metrics interface
export interface BaseMetrics {
  total: number;
  active: number;
  change: number;
  trend: "up" | "down" | "stable";
}

// Production metrics
export interface ProductionMetrics {
  farms: BaseMetrics & { byType: Record<string, number> };
  fields: BaseMetrics & { totalArea: number; cultivableArea: number };
  harvests: {
    total: number;
    volume: number;
    byPeriod: Array<{ date: string; count: number; volume: number }>;
    byCluster: Array<{ clusterId: number; clusterName: string; volume: number }>;
    averageYield: number;
  };
  cropCycles: {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    averageDuration: number;
  };
  irrigation: {
    totalWaterUsage: number;
    averageEfficiency: number;
    byField: Array<{ fieldId: number; waterUsage: number; efficiency: number }>;
  };
  equipment: {
    utilization: Record<string, { inUse: number; available: number; maintenance: number }>;
    totalHours: number;
    maintenanceRate: number;
  };
  soilHealth: {
    averagePH: number;
    averageMoisture: number;
    organicMatter: number;
    byField: Array<{ fieldId: number; ph: number; moisture: number; organic: number }>;
  };
}

// Processing metrics
export interface ProcessingMetrics {
  lots: {
    total: number;
    byGrade: Record<string, number>;
    byMonth: Array<{ month: string; count: number; weight: number }>;
    averageGrade: number;
  };
  quality: {
    passRate: number;
    byTest: Record<string, { pass: number; fail: number }>;
    averageScores: {
      moisture: number;
      protein: number;
      adf: number;
      ndf: number;
      density: number;
    };
  };
  inventory: {
    totalValue: number;
    byWarehouse: Array<{
      warehouseId: number;
      name: string;
      utilization: number;
      value: number;
    }>;
    turnover: number;
    daysOfSupply: number;
  };
  batches: {
    total: number;
    expiring: number;
    expired: number;
    byMonth: Array<{ month: string; expiring: number; expired: number }>;
  };
  efficiency: {
    processingTime: number;
    throughput: number;
    byMonth: Array<{ month: string; time: number; throughput: number }>;
  };
}

// Marketplace metrics
export interface MarketplaceMetrics {
  orders: {
    total: number;
    byStatus: Record<string, number>;
    byMarket: Record<string, { count: number; revenue: number }>;
    byMonth: Array<{ month: string; count: number; revenue: number }>;
  };
  revenue: {
    total: number;
    byMarket: Record<string, number>;
    byProduct: Record<string, number>;
    monthly: Array<{ month: string; revenue: number }>;
  };
  buyers: {
    total: number;
    active: number;
    topBuyers: Array<{
      id: number;
      name: string;
      orders: number;
      revenue: number;
      market: string;
    }>;
    retention: number;
  };
  contracts: {
    total: number;
    value: number;
    fulfillment: number;
    byStatus: Record<string, number>;
  };
  satisfaction: {
    average: number;
    distribution: Record<string, number>;
    byBuyer: Array<{ buyerId: number; rating: number }>;
  };
}

// Financial metrics
export interface FinancialMetrics {
  wallets: {
    total: number;
    balance: number;
    byType: Record<string, { count: number; balance: number }>;
  };
  transactions: {
    volume: number;
    value: number;
    averageValue: number;
    byMethod: Record<string, number>;
    byDay: Array<{ date: string; count: number; volume: number }>;
  };
  payments: {
    pending: number;
    overdue: number;
    completed: number;
    averageProcessingDays: number;
  };
  invoices: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    byMonth: Array<{ month: string; issued: number; paid: number }>;
  };
}

// ESG metrics
export interface ESGmetrics {
  communities: {
    total: number;
    spvBeneficiaries: number;
    members: number;
    byRegion: Record<string, number>;
  };
  workforce: {
    total: number;
    women: number;
    youth: number;
    byRole: Record<string, number>;
    training: {
      totalHours: number;
      byProgram: Record<string, number>;
    };
  };
  environment: {
    waterUsage: number;
    carbonFootprint: number;
    renewableEnergy: number;
    wasteManagement: number;
  };
  impact: {
    jobsCreated: number;
    incomeGenerated: number;
    communitiesServed: number;
    sdgContributions: Record<string, number>;
  };
}

// Export metrics
export interface ExportMetrics {
  shipments: {
    total: number;
    byDestination: Record<string, number>;
    byMonth: Array<{ month: string; count: number; volume: number }>;
    pending: number;
    inTransit: number;
    delivered: number;
  };
  volume: {
    total: number;
    byDestination: Record<string, number>;
    byProduct: Record<string, number>;
  };
  logistics: {
    averageShippingTime: number;
    byDestination: Record<string, number>;
    containerUtilization: Record<string, number>;
    onTimeDelivery: number;
  };
  destinations: Array<{
    country: string;
    shipments: number;
    volume: number;
    value: number;
    averageTime: number;
  }>;
}

// Trends metrics
export interface TrendsMetrics {
  growth: {
    monthly: Array<{ month: string; parties: number; farms: number; harvests: number }>;
    yoy: Record<string, { lastYear: number; thisYear: number; growth: number }>;
    projections: Array<{ month: string; value: number; confidence: number }>;
  };
  seasonality: {
    patterns: Array<{ month: string; index: number }>;
    peakPeriods: Array<{ period: string; factor: number }>;
  };
  forecasts: {
    nextMonth: { value: number; confidence: number };
    nextQuarter: { value: number; confidence: number };
    nextYear: { value: number; confidence: number };
    byMetric: Record<string, Array<{ period: string; forecast: number }>>;
  };
  insights: Array<{
    id: string;
    title: string;
    description: string;
    impact: "positive" | "negative" | "neutral";
    metric: string;
    confidence: number;
  }>;
}

// Complete analytics response
export interface AnalyticsResponse {
  timeRange: TimeRange;
  dateRange: DateRange;
  production: ProductionMetrics;
  processing: ProcessingMetrics;
  marketplace: MarketplaceMetrics;
  financial: FinancialMetrics;
  esg: ESGmetrics;
  export: ExportMetrics;
  trends: TrendsMetrics;
  generatedAt: Date;
}