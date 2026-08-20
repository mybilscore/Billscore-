// src/lib/services/plan-parser.service.ts

export interface ParsedPlan {
  id: number;
  network: string;
  planType: string;
  name: string;
  price: number;
  validity: {
    value: number;
    unit: string;
  };
  sizeMB: number;
  description?: string;
  metadata?: Record<string, any>;
}

export class PlanParser {
  
  /**
   * Parse a single plan string in the format:
   * "1 MTN SME 500MB ₦270.00 30days"
   */
  parsePlan(planString: string): ParsedPlan | null {
    try {
      // Split by whitespace
      const parts = planString.split(/\s+/);
      
      if (parts.length < 6) {
        console.warn(`⚠️ [PlanParser] Invalid plan format: ${planString}`);
        return null;
      }

      const id = parseInt(parts[0]);
      const network = parts[1];
      const planType = parts[2];
      const name = parts[3];
      const priceStr = parts[4];
      const validityStr = parts.slice(5).join(' ');

      // Parse price (remove ₦ and commas)
      const price = parseFloat(priceStr.replace(/[₦,]/g, ''));

      // Parse size to MB
      const sizeMB = this.parseSizeToMB(name);

      // Parse validity
      const validity = this.parseValidity(validityStr);

      // Parse any special metadata
      const metadata = this.parseMetadata(validityStr);

      return {
        id,
        network: this.normalizeNetwork(network),
        planType: this.normalizePlanType(planType),
        name,
        price,
        validity,
        sizeMB,
        description: `${network} ${planType} ${name} - ${validityStr}`,
        metadata,
      };
    } catch (error) {
      console.error(`❌ [PlanParser] Error parsing: ${planString}`, error);
      return null;
    }
  }

  /**
   * Parse multiple plans
   */
  parsePlans(planStrings: string[]): ParsedPlan[] {
    const results: ParsedPlan[] = [];
    for (const planString of planStrings) {
      const parsed = this.parsePlan(planString);
      if (parsed) {
        results.push(parsed);
      }
    }
    return results;
  }

  private parseSizeToMB(sizeStr: string): number {
    const upper = sizeStr.toUpperCase();
    
    if (upper.includes('TB')) {
      const value = parseFloat(upper);
      return Math.round(value * 1024 * 1024);
    }
    if (upper.includes('GB')) {
      const value = parseFloat(upper);
      return Math.round(value * 1024);
    }
    if (upper.includes('MB')) {
      return parseFloat(upper);
    }
    if (upper.includes('KB')) {
      const value = parseFloat(upper);
      return Math.round(value / 1024);
    }
    // If just a number, assume MB
    if (/^\d+$/.test(upper)) {
      return parseInt(upper);
    }
    return 0;
  }

  private parseValidity(validityStr: string): { value: number; unit: string } {
    const lower = validityStr.toLowerCase();
    
    // Try to extract number and unit
    const match = lower.match(/(\d+)\s*(hour|day|week|month|year)s?/i);
    
    if (match) {
      const value = parseInt(match[1]);
      let unit = match[2].toLowerCase();
      
      // Normalize unit
      if (unit === 'hour') unit = 'hours';
      else if (unit === 'day') unit = 'days';
      else if (unit === 'week') {
        return { value: value * 7, unit: 'days' };
      }
      else if (unit === 'month') unit = 'months';
      else if (unit === 'year') unit = 'years';
      
      return { value, unit };
    }
    
    // Try to extract just number
    const numMatch = lower.match(/(\d+)/);
    if (numMatch) {
      const value = parseInt(numMatch[1]);
      
      // Guess unit from context
      if (lower.includes('night') || lower.includes('hour')) {
        return { value, unit: 'hours' };
      }
      if (lower.includes('day')) {
        return { value, unit: 'days' };
      }
      if (lower.includes('month')) {
        return { value, unit: 'months' };
      }
      if (lower.includes('year')) {
        return { value, unit: 'years' };
      }
      
      return { value, unit: 'days' };
    }
    
    // Default
    return { value: 30, unit: 'days' };
  }

  private parseMetadata(validityStr: string): Record<string, any> {
    const metadata: Record<string, any> = {};
    const lower = validityStr.toLowerCase();

    // Check for special plans
    if (lower.includes('night')) {
      metadata.isNightPlan = true;
    }
    if (lower.includes('special')) {
      metadata.isSpecial = true;
    }
    if (lower.includes('voice')) {
      const voiceMatch = lower.match(/(\d+)\s*(min|mins|minutes)/i);
      if (voiceMatch) {
        metadata.voiceMinutes = parseInt(voiceMatch[1]);
      }
    }
    if (lower.includes('ebony')) {
      metadata.isEbonyLife = true;
    }

    return metadata;
  }

  private normalizeNetwork(network: string): string {
    const map: Record<string, string> = {
      'MTN': 'MTN',
      'AIRTEL': 'AIRTEL',
      'GLO': 'GLO',
      '9MOBILE': 'NINEMOBILE',     
      'NINEMOBILE': 'NINEMOBILE',
    };
    return map[network.toUpperCase()] || network;
  }

  private normalizePlanType(planType: string): string {
    const map: Record<string, string> = {
      'SME': 'SME',
      'GIFTING': 'GIFTING',
      'COOPERATE_GIFTING': 'COOPERATE_GIFTING',
      'CORPORATE': 'CORPORATE',
      'PREMIUM': 'PREMIUM',
      'STANDARD': 'STANDARD',
      'BASIC': 'BASIC',
    };
    return map[planType.toUpperCase()] || 'GIFTING';
  }
}