import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createHash } from 'crypto';

// ============================================
// EXACT PALMPAY SIGNATURE IMPLEMENTATION
// ============================================

function sortParams(body: Record<string, any>): string {
  return Object.keys(body)
    .sort()
    .filter(
      (key) =>
        key !== 'sign' &&
        key !== 'signature' &&
        body[key] !== undefined &&
        body[key] !== null &&
        body[key] !== ''
    )
    .map((key) => `${key}=${body[key]}`)
    .join('&');
}

function buildDigest(body: Record<string, any>): string {
  const sortedParameters = sortParams(body);
  const md5Hash = createHash('md5').update(sortedParameters).digest('hex').toUpperCase();
  return md5Hash;
}

function generateSignature(requestBody: Record<string, any>, privateKeyPEM: string): string {
  if (!privateKeyPEM) throw new Error('Private key is required');
  const digest = buildDigest(requestBody);
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(digest);
  signer.end();
  return signer.sign(privateKeyPEM, 'base64');
}

function verifySignature(requestBody: Record<string, any>, signature: string, publicKeyPEM: string): boolean {
  if (!publicKeyPEM) throw new Error('Public key is required');
  if (!signature) throw new Error('Signature is required');
  
  const payloadWithoutSign = { ...requestBody };
  delete payloadWithoutSign.sign;
  
  const digest = buildDigest(payloadWithoutSign);
  const decodedSignature = decodeURIComponent(signature);
  
  const verifier = crypto.createVerify('RSA-SHA1');
  verifier.update(digest);
  verifier.end();
  
  return verifier.verify(publicKeyPEM, decodedSignature, 'base64');
}

// ============================================
// API ROUTE
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testType = searchParams.get('type') || 'all';

    // Get keys from environment
    let privateKey = process.env.PALMPAY_PRIVATE_KEY || '';
    let publicKey = process.env.PALMPAY_PUBLIC_KEY || '';
    
    // Try different private keys if available
    const testPrivateKey = process.env.TEST_PRIVATE_KEY || '';
    const testAppId = process.env.TEST_APP_ID || '';
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // ============================================
    // TEST 1: Sample Request from Their Docs
    // ============================================
    if (testType === 'all' || testType === 'sample') {
      const sampleBody = {
        requestTime: 1767696934087,
        amount: 300,
        orderId: '81b7a26d78374c328f77ba640c23afe8',
        payeeName: 'Ajibade Oluwasegun',
        payeeBankCode: 'MTN',
        payeeBankAccNo: '0591990607',
        notifyUrl: 'https://barabara-stairlike-overcredulously.ngrok-free.dev/platform-api/public/palm/momo/withdraw/callback',
        currency: 'GHS',
        remark: 'ID: 17b7a26d78374c328f77ba640c23afe8',
        version: '1.1',
        nonceStr: 'rYV8rEKRxSaO5gtP7GBfbYUXi7eraZCV',
      };

      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      const testPrivateKeyPEM = testPrivateKey ? `-----BEGIN PRIVATE KEY-----\n${testPrivateKey}\n-----END PRIVATE KEY-----` : null;

      results.tests.sample = {
        requestBody: sampleBody,
        sortedParams: sortParams(sampleBody),
        md5Digest: buildDigest(sampleBody),
        signature: generateSignature(sampleBody, privateKeyPEM),
        testSignature: testPrivateKeyPEM ? generateSignature(sampleBody, testPrivateKeyPEM) : null,
        keys: {
          usingPrimary: !!privateKey,
          usingTest: !!testPrivateKey,
          testAppId: testAppId,
        }
      };
    }

    // ============================================
    // TEST 2: Virtual Account Request
    // ============================================
    if (testType === 'all' || testType === 'va') {
      const vaBody = {
        requestTime: Date.now(),
        virtualAccountName: 'TestAccount',
        identityType: 'personal',
        licenseNumber: '12345678901',
        customerName: 'TestUser',
        email: 'test@example.com',
        nonceStr: crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32),
        version: 'V2.0',
      };

      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

      results.tests.virtualAccount = {
        requestBody: vaBody,
        sortedParams: sortParams(vaBody),
        md5Digest: buildDigest(vaBody),
        signature: generateSignature(vaBody, privateKeyPEM),
        expectedHeaders: {
          Authorization: `Bearer ${process.env.PALMPAY_AUTHORIZATION || ''}`,
          CountryCode: process.env.PALMPAY_COUNTRY_CODE || 'NG',
          Signature: generateSignature(vaBody, privateKeyPEM),
        }
      };
    }

    // ============================================
    // TEST 3: Webhook Verification
    // ============================================
    if (testType === 'all' || testType === 'webhook') {
      const webhookPayload = {
        orderNo: "MI1999900368376688640",
        payerAccountNo: "0006082709",
        orderStatus: 1,
        payerBankName: "ABBEY MORTGAGE BANK",
        updateTime: 1765648378830,
        sessionId: "070010251213185255129762258534",
        virtualAccountName: "Ngwu Ndidiamaka(SWIFTLUXE)",
        reference: "",
        orderAmount: 1000000,
        createdTime: 1765648378830,
        currency: "NGN",
        payerAccountName: "ADENIYI ADETOUN OMOYEMI",
        virtualAccountNo: "6639078500",
        appId: "L241011111697927724651",
        sign: "RmTm0sdhorteTFmDWGJp%2BqE2tnEM5r%2FeOoIHpYtwG9tiS%2BPH%2BK%2FiJhQG5%2BJglSsZyEUUvcoDZXwSGiaMP6Ejca22W9hUoZDzzft8UYUYSyYIQ115MKTIZ6A3VEs3AAottKmBZY1bnBpJ1BoRzA4a8Y47cor9S%2FrpgIpiLiAGFyk%3D"
      };

      const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
      const testPublicKeyPEM = process.env.PALMPAY_TEST_PUBLIC_KEY ? 
        `-----BEGIN PUBLIC KEY-----\n${process.env.PALMPAY_TEST_PUBLIC_KEY}\n-----END PUBLIC KEY-----` : null;

      const isValid = verifySignature(
        webhookPayload, 
        webhookPayload.sign, 
        publicKeyPEM
      );

      results.tests.webhook = {
        payload: webhookPayload,
        verification: {
          isValid: isValid,
          usingPrimaryKey: isValid,
        },
        testVerification: testPublicKeyPEM ? verifySignature(
          webhookPayload, 
          webhookPayload.sign, 
          testPublicKeyPEM
        ) : null,
      };
    }

    // ============================================
    // TEST 4: Key Validation
    // ============================================
    if (testType === 'all' || testType === 'keys') {
      const testData = 'test_signature_validation';
      
      const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
      const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;

      try {
        const signer = crypto.createSign('RSA-SHA1');
        signer.update(testData);
        signer.end();
        const sig = signer.sign(privateKeyPEM, 'base64');

        const verifier = crypto.createVerify('RSA-SHA1');
        verifier.update(testData);
        verifier.end();
        const valid = verifier.verify(publicKeyPEM, sig, 'base64');

        results.tests.keys = {
          valid: valid,
          privateKeyLength: privateKey.length,
          publicKeyLength: publicKey.length,
          privateKeyFormat: privateKey.includes(' ') ? 'has_spaces' : 'clean',
          publicKeyFormat: publicKey.includes(' ') ? 'has_spaces' : 'clean',
          match: valid,
        };
      } catch (error: any) {
        results.tests.keys = {
          valid: false,
          error: error.message,
          privateKeyLength: privateKey.length,
          publicKeyLength: publicKey.length,
        };
      }
    }

    // ============================================
    // TEST 5: Environment Variables Check
    // ============================================
    if (testType === 'all' || testType === 'env') {
      results.tests.env = {
        PALMPAY_BASE_URL: process.env.PALMPAY_BASE_URL || '❌ Missing',
        PALMPAY_AUTHORIZATION: process.env.PALMPAY_AUTHORIZATION ? '✅ Set' : '❌ Missing',
        PALMPAY_MERCHANT_ID: process.env.PALMPAY_MERCHANT_ID ? '✅ Set' : '❌ Missing',
        PALMPAY_COUNTRY_CODE: process.env.PALMPAY_COUNTRY_CODE || '❌ Missing',
        PALMPAY_PUBLIC_KEY: process.env.PALMPAY_PUBLIC_KEY ? `✅ Set (${process.env.PALMPAY_PUBLIC_KEY.length} chars)` : '❌ Missing',
        PALMPAY_PRIVATE_KEY: process.env.PALMPAY_PRIVATE_KEY ? `✅ Set (${process.env.PALMPAY_PRIVATE_KEY.length} chars)` : '❌ Missing',
        TEST_PRIVATE_KEY: process.env.TEST_PRIVATE_KEY ? `✅ Set (${process.env.TEST_PRIVATE_KEY.length} chars)` : '❌ Missing',
        TEST_APP_ID: process.env.TEST_APP_ID || '❌ Missing',
        PALMPAY_TEST_PUBLIC_KEY: process.env.PALMPAY_TEST_PUBLIC_KEY ? '✅ Set' : '❌ Missing',
      };
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}