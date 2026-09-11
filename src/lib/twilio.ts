// lib/twilio.ts - Twilio helper functions

/**
 * Normalize a Nigerian phone number to E.164 format (with +234).
 *
 * Handles all these formats:
 *   08064875435         → +2348064875435
 *   8064875435          → +2348064875435
 *   2348064875435       → +2348064875435
 *   +2348064875435      → +2348064875435
 *   +08064875435        → +2348064875435  (this is the one Twilio was rejecting)
 *   whatsapp:+2348064875435 → +2348064875435
 */
function normalizeToE164(input: string): string {
  if (!input) return '';

  // Strip any "whatsapp:" prefix
  let cleaned = input.replace(/^whatsapp:/i, '').trim();

  // Remove all non-digit characters except a leading "+"
  const hadPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');

  if (!cleaned) return '';

  // Now normalize the digits to have "234" country code and no leading zero
  let digits = cleaned;

  // Strip the leading "0" if present (e.g., 08064875435 → 8064875435)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Add the Nigerian country code if not already present
  if (!digits.startsWith('234')) {
    digits = '234' + digits;
  }

  return '+' + digits;
}

export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+2347084422183';

    if (!accountSid || !authToken) {
      console.error('Twilio credentials missing');
      return;
    }

    // ✅ Normalize to E.164 with +234 country code
    const normalizedTo = normalizeToE164(phoneNumber);

    if (!normalizedTo || normalizedTo.length < 13) {
      console.error(`[WhatsApp] Invalid phone number: "${phoneNumber}" → "${normalizedTo}"`);
      return;
    }

    const to = `whatsapp:${normalizedTo}`;

    // Normalize "From" too — but Twilio's own number is already E.164
    const from = fromNumber.startsWith('whatsapp:')
      ? fromNumber
      : `whatsapp:${normalizeToE164(fromNumber)}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const params = new URLSearchParams({
      To: to,
      From: from,
      Body: message,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send WhatsApp message: ${response.status} - ${errorText}`);
    } else {
      console.log(`[WhatsApp] Message sent to ${normalizedTo}`);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}