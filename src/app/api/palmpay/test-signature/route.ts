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
    const { requestBody, useTestKey = false } = body;

    if (!requestBody) {
      return NextResponse.json({
        success: false,
        error: 'requestBody is required',
      }, { status: 400 });
    }

    // Get the appropriate private key
    let privateKey = useTestKey ? process.env.TEST_PRIVATE_KEY : process.env.PALMPAY_PRIVATE_KEY;
    
    if (!privateKey) {
      return NextResponse.json({
        success: false,
        error: useTestKey ? 'TEST_PRIVATE_KEY not found' : 'PALMPAY_PRIVATE_KEY not found',
      }, { status: 400 });
    }

    const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

    // Generate signature
    const signature = generateSignature(requestBody, privateKeyPEM);

    return NextResponse.json({
      success: true,
      data: {
        requestBody,
        sortedParams: sortParams(requestBody),
        md5Digest: buildDigest(requestBody),
        signature,
        privateKeyUsed: useTestKey ? 'TEST_PRIVATE_KEY' : 'PALMPAY_PRIVATE_KEY',
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}