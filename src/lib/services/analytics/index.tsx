// src/services/analytics/index.ts
//import { TimeRange } from "./types";
import type { TimeRange } from "./types";
import { ProductionAnalyticsService } from "./production.service";
// import { ProcessingAnalyticsService } from "./processing.service";
// import { MarketplaceAnalyticsService } from "./marketplace.service";
// import { FinancialAnalyticsService } from "./financial.service";
// import { ESPAnalyticsService } from "./esg.service";
// import { ExportAnalyticsService } from "./export.service";
// import { TrendsAnalyticsService } from "./trends.service";


export class AnalyticsService {
  private production: ProductionAnalyticsService;
//   private processing: ProcessingAnalyticsService;
//   private marketplace: MarketplaceAnalyticsService;
//   private financial: FinancialAnalyticsService;
//   private esg: ESPAnalyticsService;
//   private export: ExportAnalyticsService;
//   private trends: TrendsAnalyticsService;

  constructor(timeRange: TimeRange = "30d") {
    this.production = new ProductionAnalyticsService(timeRange);
    // this.processing = new ProcessingAnalyticsService(timeRange);
    // this.marketplace = new MarketplaceAnalyticsService(timeRange);
    // this.financial = new FinancialAnalyticsService(timeRange);
    // this.esg = new ESPAnalyticsService(timeRange);
    // this.export = new ExportAnalyticsService(timeRange);
    // this.trends = new TrendsAnalyticsService(timeRange);
  }

  async getAllMetrics() {
    const [
      production,
    //   processing,
    //   marketplace,
    //   financial,
    //   esg,
    //   export: exportMetrics,
    //   trends,
    ] = await Promise.all([
      this.production.getMetrics(),
    //   this.processing.getMetrics(),
    //   this.marketplace.getMetrics(),
    //   this.financial.getMetrics(),
    //   this.esg.getMetrics(),
    //   this.export.getMetrics(),
    //   this.trends.getMetrics(),
    ]);

    return {
      production,
    //   processing,
    //   marketplace,
    //   financial,
    //   esg,
    //   export: exportMetrics,
    //   trends,
      generatedAt: new Date(),
    };
  }

  async getMetricsByDomain(domain: string) {
    switch(domain) {
      case "production":
        return this.production.getMetrics();
    //   case "processing":
    //     return this.processing.getMetrics();
    //   case "marketplace":
    //     return this.marketplace.getMetrics();
    //   case "financial":
    //     return this.financial.getMetrics();
    //   case "esg":
    //     return this.esg.getMetrics();
    //   case "export":
    //     return this.export.getMetrics();
    //   case "trends":
    //     return this.trends.getMetrics();
      default:
        throw new Error(`Unknown domain: ${domain}`);
    }
  }
}

// Export individual services for direct use
export { ProductionAnalyticsService } from "./production.service";
// export { ProcessingAnalyticsService } from "./processing.service";
// export { MarketplaceAnalyticsService } from "./marketplace.service";
// export { FinancialAnalyticsService } from "./financial.service";
// export { ESPAnalyticsService } from "./esg.service";
// export { ExportAnalyticsService } from "./export.service";
// export { TrendsAnalyticsService } from "./trends.service";

// Export types
export * from "./types";