// lib/twilio.ts - Twilio helper functions

export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    
    if (!accountSid || !authToken) {
      console.error('Twilio credentials missing');
      return;
    }
    
    const to = phoneNumber.startsWith('+') ? `whatsapp:${phoneNumber}` : `whatsapp:+${phoneNumber}`;
    const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
    
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
      console.log(`[WhatsApp] Status message sent to ${phoneNumber}`);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}