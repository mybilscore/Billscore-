// scripts/seed-vtpass-sandbox.ts

import { prisma } from '../src/lib/db';
import { createVTPassSandboxConfig, vtpassConfigToDatabase } from '../src/lib/vendors/vtpass.config';
import { VtuVendor } from '../src/lib/vendors/types';

async function seedVTPassSandbox() {
  console.log('🌱 Seeding VTpass Sandbox vendor configuration...');
  
  try {
    const config = createVTPassSandboxConfig();
    const data = vtpassConfigToDatabase(config);
    
    // Check if environment variables are set
    if (!config.authConfig.apiKey) {
      console.warn('⚠️ VTPASS_SANDBOX_API_KEY is not set. Please add it to your .env file.');
      console.log('   Get your sandbox API key from: https://sandbox.vtpass.com/dashboard/developer');
      process.exit(1);
    }
    
    // Upsert vendor
    const vendor = await prisma.vendor.upsert({
      where: { code: VtuVendor.VTPASS },
      update: {
        name: data.name,
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
      create: {
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
    
    console.log(`✅ VTpass vendor ${vendor.name} configured successfully`);
    
    // Create vendor services
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
    
    console.log('\n📋 VTpass Sandbox Configuration:');
    console.log(`   API URL: ${config.apiBaseUrl}`);
    console.log(`   API Key: ${config.authConfig.apiKey.substring(0, 10)}...`);
    console.log(`   Services: ${config.supportedServices.join(', ')}`);
    console.log('\n🎉 Sandbox seeding completed!');
    console.log('   Your VTpass sandbox is ready for testing.');
    
  } catch (error) {
    console.error('❌ Error seeding VTpass sandbox:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedVTPassSandbox();