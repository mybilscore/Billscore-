import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createHash } from 'crypto';

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
  return createHash('md5').update(sortedParameters).digest('hex').toUpperCase();
}

function generateSignature(requestBody: Record<string, any>, privateKeyPEM: string): string {
  if (!privateKeyPEM) throw new Error('Private key is required');
  const digest = buildDigest(requestBody);
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(digest);
  signer.end();
  return signer.sign(privateKeyPEM, 'base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, requestBody, useTestKey = false, countryCode = 'NG' } = body;

    if (!endpoint || !requestBody) {
      return NextResponse.json({
        success: false,
        error: 'endpoint and requestBody are required',
      }, { status: 400 });
    }

    // Get the appropriate private key
    let privateKey = useTestKey ? process.env.TEST_PRIVATE_KEY : process.env.PALMPAY_PRIVATE_KEY;
    let appId = useTestKey ? process.env.TEST_APP_ID : process.env.PALMPAY_AUTHORIZATION;
    
    if (!privateKey || !appId) {
      return NextResponse.json({
        success: false,
        error: 'Missing credentials',
        details: {
          privateKey: !!privateKey,
          appId: !!appId,
        },
      }, { status: 400 });
    }

    const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

    // Generate signature
    const signature = generateSignature(requestBody, privateKeyPEM);

    // Build the request
    const baseUrl = useTestKey 
      ? process.env.TEST_BASE_URL || 'https://open-gw-daily.palmpay-inc.com'
      : process.env.PALMPAY_BASE_URL || 'https://open-gw-sandbox.palmpay-inc.com';

    const url = `${baseUrl}${endpoint}`;

    console.log('📤 Making request to:', url);
    console.log('📤 Headers:', {
      Authorization: `Bearer ${appId}`,
      CountryCode: countryCode,
      Signature: signature,
    });
    console.log('📤 Body:', requestBody);

    // Make the actual API call
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${appId}`,
        'CountryCode': countryCode,
        'Signature': signature,
        'Content-Type': 'application/json;charset=UTF-8',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      request: {
        url,
        headers: {
          Authorization: `Bearer ${appId.substring(0, 10)}...`,
          CountryCode: countryCode,
          Signature: signature.substring(0, 30) + '...',
        },
        body: requestBody,
      },
      signature: {
        sortedParams: sortParams(requestBody),
        md5Digest: buildDigest(requestBody),
        signature,
      },
      response: {
        status: response.status,
        data: result,
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}