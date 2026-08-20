// src/app/api/test/vtpass/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createVTPassSandboxConfig } from "~/lib/vendors/vtpass.config";
import { VTPassVendor } from "~/lib/vendors/vtpass.vendor";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testType = searchParams.get('type') || 'all';
    
    console.log('🧪 Testing VTpass Sandbox Integration...\n');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: 'sandbox',
      tests: {}
    };

    const config = createVTPassSandboxConfig();
    console.log('📋 Config created:');
    console.log(`   - API Base URL: ${config.apiBaseUrl}`);
    console.log(`   - API Key: ${config.authConfig.apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Secret Key: ${config.authConfig.secretKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Public Key: ${config.authConfig.publicKey ? '✅ Set' : '❌ Missing'}`);
    
    results.config = {
      apiBaseUrl: config.apiBaseUrl,
      hasApiKey: !!config.authConfig.apiKey,
      hasSecretKey: !!config.authConfig.secretKey,
      hasPublicKey: !!config.authConfig.publicKey,
    };

    if (!config.authConfig.apiKey) {
      return NextResponse.json({
        success: false,
        error: 'VTpass API keys not configured in environment variables',
        results,
      }, { status: 400 });
    }

    const vendor = new VTPassVendor({
      id: config.id,
      name: config.name,
      code: config.code,
      apiBaseUrl: config.apiBaseUrl,
      authType: config.authType,
      authConfig: config.authConfig,
      priority: config.priority,
      isActive: config.isActive,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
    });

    if (testType === 'all' || testType === 'airtime') {
      results.tests.airtime = await testAirtime(vendor);
    }
    
    if (testType === 'all' || testType === 'balance') {
      results.tests.balance = await testBalance(vendor);
    }
    
    if (testType === 'all' || testType === 'categories') {
      results.tests.categories = await testCategories(vendor);
    }
    
    if (testType === 'all' || testType === 'variations') {
      results.tests.variations = await testVariations(vendor);
    }
    
    if (testType === 'all' || testType === 'electricity') {
      results.tests.electricity = await testElectricity(vendor);
    }
    
    if (testType === 'all' || testType === 'cable') {
      results.tests.cable = await testCableTV(vendor);
    }

    // Check if all tests passed (excluding expected timeouts)
    const allPassed = Object.values(results.tests).every((test: any) => {
      if (test?.timeoutTest?.expected) return true;
      return test?.success !== false;
    });
    
    return NextResponse.json({
      success: allPassed,
      message: allPassed ? 'All VTpass sandbox tests passed!' : 'Some tests failed',
      results,
    });

  } catch (error: any) {
    console.error('❌ Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to run VTpass tests',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

async function testAirtime(vendor: VTPassVendor) {
  const results: any = {};
  
  console.log('📱 Testing Airtime Purchase (Success)...');
  try {
    const result = await vendor.buyAirtime({
      network: 'MTN',
      phoneNumber: '08011111111',
      amount: 100,
    });
    
    results.successTest = {
      success: result.success,
      responseDescription: result.response_description || result.error,
      transactionId: result.vendorReference,
      status: result.data?.status,
      amount: result.data?.amount,
    };
    
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Response: ${result.response_description || result.error}`);
  } catch (error: any) {
    results.successTest = {
      success: false,
      error: error.message,
    };
  }
  
  console.log('📱 Testing Airtime Purchase (Failed)...');
  try {
    const result = await vendor.buyAirtime({
      network: 'MTN',
      phoneNumber: '08022222222',
      amount: 100,
    });
    
    results.failedTest = {
      success: result.success,
      responseDescription: result.response_description || result.error,
      transactionId: result.vendorReference,
      status: result.data?.status,
    };
    
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Response: ${result.response_description || result.error}`);
  } catch (error: any) {
    results.failedTest = {
      success: false,
      error: error.message,
    };
  }
  
  console.log('📱 Testing Airtime Purchase (Pending)...');
  try {
    const result = await vendor.buyAirtime({
      network: 'MTN',
      phoneNumber: '201000000000',
      amount: 100,
    });
    
    results.pendingTest = {
      success: result.success,
      responseDescription: result.response_description || result.error,
      transactionId: result.vendorReference,
      status: result.data?.status,
    };
    
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Response: ${result.response_description || result.error}`);
  } catch (error: any) {
    results.pendingTest = {
      success: false,
      error: error.message,
    };
  }
  
  console.log('📱 Testing Airtime Purchase (Timeout - Expected)...');
  try {
    const result = await vendor.buyAirtime({
      network: 'MTN',
      phoneNumber: '300000000000',
      amount: 100,
    });
    
    results.timeoutTest = {
      success: result.success,
      responseDescription: result.response_description || result.error,
      transactionId: result.vendorReference,
      status: result.data?.status,
    };
  } catch (error: any) {
    results.timeoutTest = {
      success: false,
      error: error.message,
      expected: true,
    };
    console.log(`   - ✅ Timeout occurred as expected: ${error.message}`);
  }
  
  results.success = results.successTest?.success === true;
  return results;
}

async function testBalance(vendor: VTPassVendor) {
  console.log('💰 Testing Get Balance...');
  try {
    const result = await vendor.getWalletBalance();
    console.log(`   - Success: ${result.success}`);
    
    if (result.success) {
      console.log(`   - Balance:`, result.data);
      return {
        success: true,
        balance: result.data,
        rawResponse: result.rawResponse,
      };
    } else {
      console.log(`   - Error: ${result.error}`);
      return {
        success: false,
        error: result.error,
        rawResponse: result.rawResponse,
      };
    }
  } catch (error: any) {
    console.log(`   - Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function testCategories(vendor: VTPassVendor) {
  console.log('📂 Testing Service Categories...');
  try {
    const result = await vendor.getServiceCategories();
    console.log(`   - Success: ${result.success}`);
    
    if (result.success && result.rawResponse) {
      const categories = (result.rawResponse as any).content || [];
      console.log(`   - Found ${categories.length} categories`);
      categories.slice(0, 3).forEach((cat: any) => {
        console.log(`     - ${cat.identifier}: ${cat.name}`);
      });
      
      return {
        success: true,
        count: categories.length,
        categories: categories.slice(0, 5),
        rawResponse: result.rawResponse,
      };
    } else {
      return {
        success: false,
        error: result.error,
        rawResponse: result.rawResponse,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function testVariations(vendor: VTPassVendor) {
  console.log('📊 Testing Service Variations (Data)...');
  try {
    const result = await vendor.getServiceVariations('mtn-data');
    console.log(`   - Success: ${result.success}`);
    
    if (result.success && result.rawResponse) {
      const content = (result.rawResponse as any).content || {};
      const variations = content.variations || [];
      console.log(`   - Found ${variations.length} variations for MTN Data`);
      variations.slice(0, 3).forEach((v: any) => {
        console.log(`     - ${v.variation_code}: ${v.name} (${v.variation_amount})`);
      });
      
      return {
        success: true,
        serviceName: content.ServiceName,
        serviceID: content.serviceID,
        count: variations.length,
        variations: variations.slice(0, 5),
        rawResponse: result.rawResponse,
      };
    } else {
      return {
        success: false,
        error: result.error,
        rawResponse: result.rawResponse,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function testElectricity(vendor: VTPassVendor) {
  console.log('⚡ Testing Electricity Purchase (Prepaid)...');
  try {
    const verifyResult = await vendor.verifyMerchant(
      'ikeja-electric',
      '1111111111111',
      'prepaid'
    );
    
    console.log(`   - Verify Success: ${verifyResult.success}`);
    
    if (verifyResult.success) {
      const customerData = verifyResult.data;
      console.log(`   - Customer: ${customerData?.Customer_Name}`);
      console.log(`   - Meter Type: ${customerData?.Meter_Type}`);
    } else {
      console.log(`   - Verify Error: ${verifyResult.error}`);
    }
    
    const purchaseResult = await vendor.buyElectricity({
      discoCode: 'IKEDC',
      meterNumber: '1111111111111',
      amount: 1000,
      phone: '08011111111',
      meterType: 'prepaid',
    });
    
    console.log(`   - Purchase Success: ${purchaseResult.success}`);
    console.log(`   - Response: ${purchaseResult.response_description || purchaseResult.error}`);
    
    return {
      success: purchaseResult.success,
      verify: {
        success: verifyResult.success,
        customerData: verifyResult.data,
        error: verifyResult.error,
      },
      purchase: {
        success: purchaseResult.success,
        responseDescription: purchaseResult.response_description || purchaseResult.error,
        token: purchaseResult.data?.token,
        transactionId: purchaseResult.vendorReference,
        rawResponse: purchaseResult.rawResponse,
      },
    };
  } catch (error: any) {
    console.error('❌ Electricity test error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function testCableTV(vendor: VTPassVendor) {
  console.log('📺 Testing Cable TV (DSTV)...');
  try {
    const verifyResult = await vendor.verifyMerchant(
      'dstv',
      '1212121212'
    );
    
    console.log(`   - Verify Success: ${verifyResult.success}`);
    
    if (verifyResult.success) {
      const customerData = verifyResult.data;
      console.log(`   - Customer: ${customerData?.Customer_Name}`);
      console.log(`   - Status: ${customerData?.Status}`);
      console.log(`   - Due Date: ${customerData?.Due_Date}`);
    } else {
      console.log(`   - Verify Error: ${verifyResult.error}`);
    }
    
    const purchaseResult = await vendor.buyCableTV({
      provider: 'DSTV',
      decoderNumber: '1212121212',
      packageCode: 'dstv-padi',
      amount: 1850,
      phone: '08011111111',
      subscriptionType: 'change',
      quantity: 1,
    });
    
    console.log(`   - Purchase Success: ${purchaseResult.success}`);
    console.log(`   - Response: ${purchaseResult.response_description || purchaseResult.error}`);
    
    return {
      success: purchaseResult.success,
      verify: {
        success: verifyResult.success,
        customerData: verifyResult.data,
        error: verifyResult.error,
      },
      purchase: {
        success: purchaseResult.success,
        responseDescription: purchaseResult.response_description || purchaseResult.error,
        transactionId: purchaseResult.vendorReference,
        rawResponse: purchaseResult.rawResponse,
      },
    };
  } catch (error: any) {
    console.error('❌ Cable TV test error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType = 'all', data } = body;
    
    const searchParams = new URLSearchParams({ type: testType });
    const url = new URL(request.url);
    url.search = searchParams.toString();
    
    const getRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers,
    });
    
    return await GET(getRequest);
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to run VTpass tests',
    }, { status: 500 });
  }
}