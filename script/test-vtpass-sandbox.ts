// scripts/test-vtpass-sandbox.ts

import { prisma } from '../src/lib/db';
import { VTPassVendor } from '../src/lib/vendors/vtpass.vendor';
import { createVTPassSandboxConfig } from '../src/lib/vendors/vtpass.config';

async function testVTPassSandbox() {
  console.log('🧪 Testing VTpass Sandbox connection...');
  
  try {
    const config = createVTPassSandboxConfig();
    
    if (!config.authConfig.apiKey) {
      console.error('❌ VTPASS_SANDBOX_API_KEY is not set in environment variables');
      console.log('   Please add it to your .env file');
      process.exit(1);
    }
    
    console.log('📝 Creating VTpass vendor instance...');
    const vendor = new VTPassVendor(config);
    
    console.log('🔑 Testing authentication headers...');
    const headers = await vendor.authenticate();
    console.log('✅ Headers generated:', Object.keys(headers));
    
    // Test airtime purchase (sandbox mode uses fake numbers)
    console.log('\n📱 Testing airtime purchase (sandbox)...');
    const result = await vendor.buyAirtime({
      phoneNumber: '08012345678', // Sandbox test number
      amount: 100,
      network: 'MTN',
    });
    
    if (result.success) {
      console.log('✅ Sandbox airtime purchase successful!');
      console.log('   Transaction ID:', result.data?.transactionId);
      console.log('   Reference:', result.vendorReference);
    } else {
      console.log('❌ Sandbox airtime purchase failed:', result.error);
      console.log('   Response code:', result.metadata?.responseCode);
    }
    
    console.log('\n📋 Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testVTPassSandbox();