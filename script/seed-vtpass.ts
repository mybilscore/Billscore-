// scripts/seed-vtpass.ts

import { prisma } from '../src/lib/db';
import { createVTPassConfig, vtpassConfigToDatabase } from '../src/lib/vendors/vtpass.config';
import { VtuVendor } from '../src/lib/vendors/types';

async function seedVTPass() {
  console.log('🌱 Seeding VTpass vendor configuration...');
  
  try {
    // Check if VTpass already exists
    const existing = await prisma.vendor.findUnique({
      where: { code: VtuVendor.VTPASS },
    });
    
    if (existing) {
      console.log('✅ VTpass vendor already exists, updating...');
      
      // Update with latest config
      const config = createVTPassConfig();
      const data = vtpassConfigToDatabase(config);
      
      await prisma.vendor.update({
        where: { code: VtuVendor.VTPASS },
        data: {
          apiBaseUrl: data.apiBaseUrl,
          authType: data.authType,
          authConfig: data.authConfig,
          priority: data.priority,
          supportedServices: data.supportedServices,
          status: data.status,
        },
      });
      
      console.log('✅ VTpass vendor updated successfully');
    } else {
      console.log('📝 Creating new VTpass vendor...');
      
      const config = createVTPassConfig();
      const data = vtpassConfigToDatabase(config);
      
      await prisma.vendor.create({
        data: {
          id: data.id,
          name: data.name,
          code: data.code,
          apiBaseUrl: data.apiBaseUrl,
          authType: data.authType,
          authConfig: data.authConfig,
          priority: data.priority,
          supportedServices: data.supportedServices,
          status: data.status,
          successRate: data.successRate,
          avgResponseTime: data.avgResponseTime,
          failureCount: data.failureCount,
          consecutiveFailures: data.consecutiveFailures,
        },
      });
      
      console.log('✅ VTpass vendor created successfully');
    }
    
    // Create vendor services
    const vendor = await prisma.vendor.findUnique({
      where: { code: VtuVendor.VTPASS },
    });
    
    if (vendor) {
      const services = [
        { serviceType: VtuType.AIRTIME, priority: 1, isActive: true },
        { serviceType: VtuType.DATA, priority: 2, isActive: true },
        { serviceType: VtuType.ELECTRICITY_INSTANT, priority: 3, isActive: true },
        { serviceType: VtuType.CABLE_TV, priority: 4, isActive: true },
      ];
      
      for (const service of services) {
        await prisma.vendorService.upsert({
          where: {
            vendorId_serviceType: {
              vendorId: vendor.id,
              serviceType: service.serviceType,
            },
          },
          update: {
            isActive: service.isActive,
            priority: service.priority,
          },
          create: {
            vendorId: vendor.id,
            serviceType: service.serviceType,
            isActive: service.isActive,
            priority: service.priority,
          },
        });
      }
      
      console.log('✅ VTpass services configured successfully');
    }
    
    console.log('🎉 VTpass seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding VTpass:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedVTPass();