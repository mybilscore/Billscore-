// src/app/api/palmpay/test/route.ts

import { NextResponse } from 'next/server';
import { getPalmPayService } from '~/lib/palmpay/palmpay.service';

// ✅ Generate realistic test data
function generateTestData() {
  const names = [
    'Oladele Adebayo',
    'Chiamaka Nwosu',
    'Emeka Okafor',
    'Funmilayo Adeyemi',
    'Chidi Okonkwo',
    'Ngozi Obi',
    'Tunde Bakare',
    'Zainab Balogun',
    'Segun Adeola',
    'Ifeanyi Eze'
  ];
  
  const banks = [
    'GTBank', 'Access Bank', 'First Bank', 'Zenith Bank', 
    'UBA', 'FCMB', 'Stanbic IBTC', 'Sterling Bank',
    'Wema Bank', 'Union Bank'
  ];
  
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomBank = banks[Math.floor(Math.random() * banks.length)];
  const randomAmount = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000][Math.floor(Math.random() * 8)];
  
  // Generate realistic Nigerian phone number
  const phonePrefixes = ['080', '081', '070', '090', '091'];
  const phone = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)] + 
                String(Math.floor(10000000 + Math.random() * 90000000));
  
  // Generate realistic account number (10 digits)
  const accountNumber = String(Math.floor(1000000000 + Math.random() * 9000000000));
  
  // Generate realistic BVN (11 digits)
  const bvn = String(Math.floor(10000000000 + Math.random() * 90000000000));
  
  return {
    customerName: randomName,
    customerPhone: phone,
    customerEmail: `${randomName.toLowerCase().replace(' ', '.')}@example.com`,
    bankName: randomBank,
    accountNumber: accountNumber,
    bvn: bvn,
    amount: randomAmount,
    virtualAccountName: `${randomName.split(' ')[0]} ${randomBank} Account`,
    licenseNumber: bvn,
    identityType: Math.random() > 0.3 ? 'personal' : 'business',
  };
}

// ✅ Generate realistic order data
function generateOrderData(virtualAccountNo?: string) {
  const statuses = [1, 2, 3, 4, 5]; // 1=success, 2=pending, 3=failed, 4=refunded, 5=partial
  const statusLabels = ['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'PARTIAL'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  const amount = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000][Math.floor(Math.random() * 8)];
  const fee = amount * 0.015; // 1.5% fee
  const totalAmount = amount + fee;
  
  return {
    orderNo: `PAY${Date.now()}${String(Math.floor(10000 + Math.random() * 90000))}`,
    orderId: `ORD${Date.now()}${String(Math.floor(1000 + Math.random() * 9000))}`,
    orderStatus: randomStatus,
    orderStatusLabel: statusLabels[randomStatus - 1],
    orderAmount: amount,
    fee: fee,
    totalAmount: totalAmount,
    currency: 'NGN',
    virtualAccountNo: virtualAccountNo || `666${String(Math.floor(1000000 + Math.random() * 9000000))}`,
    payerAccountName: generateTestData().customerName,
    payerAccountNo: generateTestData().accountNumber,
    payerBankName: generateTestData().bankName,
    createdTime: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
    completedTime: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000), // Random date within last 24 hours
  };
}

export async function GET() {
  try {
    const palmPay = getPalmPayService();
    const isSimulation = palmPay.isSimulationMode();
    
    // Test connection
    const testResult = await palmPay.testConnection();
    
    // ✅ Generate realistic test data
    const testData = generateTestData();
    
    let createResult = null;
    let queryResult = null;
    let orderResult = null;
    
    if (!isSimulation) {
      // ✅ Create virtual account with realistic data
      createResult = await palmPay.createVirtualAccount({
        virtualAccountName: testData.virtualAccountName,
        identityType: testData.identityType as 'personal' | 'business',
        licenseNumber: testData.bvn,
        email: testData.customerEmail,
        customerName: testData.customerName,
        accountReference: `REF_${Date.now()}`,
      });
      
      // ✅ If successful, query the account to verify
      if (createResult?.status && createResult?.data?.virtualAccountNo) {
        queryResult = await palmPay.queryVirtualAccount(
          createResult.data.virtualAccountNo
        );
      }
      
      // ✅ Generate some realistic orders
      const orders = [];
      for (let i = 0; i < 3; i++) {
        const order = generateOrderData(createResult?.data?.virtualAccountNo);
        orders.push(order);
      }
      
      orderResult = {
        totalOrders: orders.length,
        orders: orders,
        summary: {
          totalAmount: orders.reduce((sum, o) => sum + o.amount, 0),
          averageAmount: orders.reduce((sum, o) => sum + o.amount, 0) / orders.length,
          currency: 'NGN',
        },
      };
    }
    
    // ✅ If in simulation mode, generate mock data
    let mockData = null;
    if (isSimulation) {
      const mockOrders = [];
      for (let i = 0; i < 5; i++) {
        mockOrders.push(generateOrderData());
      }
      
      mockData = {
        virtualAccounts: [
          {
            virtualAccountName: 'Bilscore User Account',
            virtualAccountNo: `666${String(Math.floor(1000000 + Math.random() * 9000000))}`,
            status: 'Enabled',
            identityType: 'personal',
            licenseNumber: '12345678901',
            email: 'user@bilscore.com',
            customerName: 'Bilscore Customer',
            accountReference: 'BILSCORE_001',
          },
          {
            virtualAccountName: 'Bilscore Business Account',
            virtualAccountNo: `666${String(Math.floor(1000000 + Math.random() * 9000000))}`,
            status: 'Enabled',
            identityType: 'business',
            licenseNumber: '12345678902',
            email: 'business@bilscore.com',
            customerName: 'Bilscore Enterprise',
            accountReference: 'BILSCORE_BIZ_001',
          },
        ],
        orders: mockOrders,
        summary: {
          totalOrders: mockOrders.length,
          totalAmount: mockOrders.reduce((sum, o) => sum + o.amount, 0),
          averageAmount: mockOrders.reduce((sum, o) => sum + o.amount, 0) / mockOrders.length,
          currency: 'NGN',
          statusBreakdown: mockOrders.reduce((acc, o) => {
            const label = o.orderStatusLabel || 'UNKNOWN';
            acc[label] = (acc[label] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      };
    }
    
    return NextResponse.json({
      success: true,
      mode: isSimulation ? 'simulation' : 'sandbox',
      timestamp: new Date().toISOString(),
      config: {
        baseUrl: process.env.PALMPAY_BASE_URL || 'https://open-gw-sandbox.palmpay-inc.com',
        appId: process.env.PALMPAY_AUTHORIZATION ? '✅ Set' : '❌ Missing',
        merchantId: process.env.PALMPAY_MERCHANT_ID ? '✅ Set' : '❌ Missing',
        publicKey: process.env.PALMPAY_PUBLIC_KEY ? '✅ Set' : '❌ Missing',
        privateKey: process.env.PALMPAY_PRIVATE_KEY ? '✅ Set' : '❌ Missing',
        countryCode: process.env.PALMPAY_COUNTRY_CODE || 'NG',
      },
      testData: {
        customer: {
          name: testData.customerName,
          phone: testData.customerPhone,
          email: testData.customerEmail,
          bank: testData.bankName,
          accountNumber: testData.accountNumber,
          bvn: testData.bvn,
        },
        amount: testData.amount,
      },
      testResult,
      virtualAccount: createResult ? {
        status: createResult.status,
        respCode: createResult.respCode,
        respMsg: createResult.respMsg,
        data: createResult.data,
        verified: queryResult ? {
          status: queryResult.status,
          respCode: queryResult.respCode,
          respMsg: queryResult.respMsg,
          data: queryResult.data,
        } : null,
      } : null,
      orders: orderResult,
      mockData: mockData,
    });
    
  } catch (error: any) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}