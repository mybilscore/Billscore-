// src/services/analytics/base.service.ts
import { prisma } from "~/lib/db";
import { DateRange, TimeRange } from "./types";

export abstract class BaseAnalyticsService {
  protected prisma = prisma;
  protected dateRange: DateRange;

  constructor(timeRange: TimeRange = "30d") {
    this.dateRange = this.calculateDateRange(timeRange);
  }

  protected calculateDateRange(timeRange: TimeRange): DateRange {
    const now = new Date();
    const startDate = new Date();

    switch(timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { startDate, endDate: now };
  }

  protected calculateTrend(current: number, previous: number): {
    change: number;
    trend: "up" | "down" | "stable";
  } {
    if (previous === 0) return { change: 0, trend: "stable" };
    
    const change = ((current - previous) / previous) * 100;
    
    if (Math.abs(change) < 1) return { change, trend: "stable" };
    return { 
      change, 
      trend: change > 0 ? "up" : "down" 
    };
  }

  protected async getPreviousPeriodCount<T>(
    model: any,
    where: any = {},
    dateField: string = "created_at"
  ): Promise<number> {
    const { startDate, endDate } = this.dateRange;
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousEnd = new Date(endDate.getTime() - periodLength);

    return await model.count({
      where: {
        ...where,
        [dateField]: {
          gte: previousStart,
          lt: previousEnd
        }
      }
    });
  }

  protected groupByMonth<T extends { date: Date }>(
    data: T[],
    valueExtractor: (item: T) => number
  ): Array<{ month: string; value: number }> {
    const months: Record<string, number> = {};
    
    data.forEach(item => {
      const monthKey = item.date.toISOString().slice(0, 7); // YYYY-MM
      months[monthKey] = (months[monthKey] || 0) + valueExtractor(item);
    });

    return Object.entries(months).map(([month, value]) => ({
      month,
      value
    })).sort((a, b) => a.month.localeCompare(b.month));
  }
}