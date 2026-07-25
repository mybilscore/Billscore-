// lib/sms/templates.ts

export interface SMSTemplateData {
  name?: string;
  otp?: string;
  orderId?: string;
  amount?: string;
  date?: string;
  link?: string;
  farmId?: string;
  cropType?: string;
  harvestId?: string;
  lotId?: string;
  shipmentId?: string;
  warehouseId?: string;
  quantity?: string;
  weight?: string;
  quality?: string;
  // Add more fields as needed
}

// SMS templates (keeping within 160 characters per message for standard SMS)
export const smsTemplates = {
  welcome: (data: SMSTemplateData): string => {
    return `Welcome to EMAP, ${data.name}! Manage your farm operations efficiently. Login: https://emap.africa/dashboard`;
  },

  otp: (data: SMSTemplateData): string => {
    return `Your EMAP verification code is: ${data.otp}. Valid for 10 minutes. Never share this code with anyone.`;
  },

  passwordReset: (data: SMSTemplateData): string => {
    return `Reset your EMAP password using code: ${data.otp}. Valid for 10 minutes. If you didn't request this, ignore this message.`;
  },

  // Farm Management Templates
  farmCreated: (data: SMSTemplateData): string => {
    return `Farm "${data.name}" has been successfully registered on EMAP. Start managing your farm operations today!`;
  },

  farmUpdated: (data: SMSTemplateData): string => {
    return `Your farm "${data.name}" details have been updated on EMAP. Login to view changes.`;
  },

  fieldCreated: (data: SMSTemplateData): string => {
    return `New field "${data.name}" added to your farm. Area: ${data.quantity || 'N/A'} hectares. Track activities on EMAP.`;
  },

  // Crop Cycle Templates
  cycleStarted: (data: SMSTemplateData): string => {
    return `New crop cycle started for ${data.cropType || 'crop'} on farm "${data.name}". Track progress on EMAP.`;
  },

  cycleCompleted: (data: SMSTemplateData): string => {
    return `Crop cycle for ${data.cropType || 'crop'} completed. Total yield: ${data.weight || 0}kg. View details on EMAP.`;
  },

  // Harvest Templates
  harvestRecorded: (data: SMSTemplateData): string => {
    return `Harvest recorded for ${data.cropType || 'crop'}: ${data.quantity || 0} bales, ${data.weight || 0}kg. Quality: ${data.quality || 'Standard'}.`;
  },

  harvestCompleted: (data: SMSTemplateData): string => {
    return `Harvest #${data.harvestId} completed! Total: ${data.quantity || 0} bales (${data.weight || 0}kg). Ready for QA inspection.`;
  },

  // Quality Assurance Templates
  qaTestScheduled: (data: SMSTemplateData): string => {
    return `Quality test scheduled for harvest #${data.harvestId}. Prepare samples for testing.`;
  },

  qaTestCompleted: (data: SMSTemplateData): string => {
    return `QA test completed for harvest #${data.harvestId}. Grade: ${data.quality || 'Standard'}. View results on EMAP.`;
  },

  qaTestPassed: (data: SMSTemplateData): string => {
    return `✅ Quality check passed for harvest #${data.harvestId}. Grade: ${data.quality || 'Standard'}. Ready for processing.`;
  },

  qaTestFailed: (data: SMSTemplateData): string => {
    return `⚠️ Quality check failed for harvest #${data.harvestId}. Please review results and take necessary action.`;
  },

  // Intake Templates
  intakeCreated: (data: SMSTemplateData): string => {
    return `Intake recorded for harvest #${data.harvestId}: ${data.quantity || 0} bales (${data.weight || 0}kg). Status: Pending QA.`;
  },

  intakeCompleted: (data: SMSTemplateData): string => {
    return `Intake #${data.orderId} completed! ${data.quantity || 0} bales processed. Ready for lot creation.`;
  },

  // Lot Templates
  lotCreated: (data: SMSTemplateData): string => {
    return `New lot created: ${data.lotId || data.orderId} (Grade: ${data.quality || 'Standard'}). ${data.quantity || 0} bales available.`;
  },

  lotAvailable: (data: SMSTemplateData): string => {
    return `Lot ${data.lotId} is now available for sale. Grade: ${data.quality || 'Standard'}, ${data.quantity || 0} bales. View on EMAP.`;
  },

  lotAllocated: (data: SMSTemplateData): string => {
    return `${data.quantity || 0} bales allocated from lot ${data.lotId}. Remaining stock updated in inventory.`;
  },

  // Inventory Templates
  inventoryUpdated: (data: SMSTemplateData): string => {
    return `Inventory updated: ${data.quantity || 0} bales added to warehouse ${data.warehouseId || 'N/A'}. Total stock updated.`;
  },

  stockLow: (data: SMSTemplateData): string => {
    return `⚠️ Low stock alert: Only ${data.quantity || 0} bales remaining in warehouse ${data.warehouseId}. Please restock soon.`;
  },

  // Order Templates
  orderReceived: (data: SMSTemplateData): string => {
    return `New order received: #${data.orderId}. Amount: ${data.amount}. Quantity: ${data.quantity || 0} bales. Process on EMAP.`;
  },

  orderConfirmed: (data: SMSTemplateData): string => {
    return `Order #${data.orderId} confirmed! Amount: ${data.amount}. We'll notify you when ready for shipment.`;
  },

  orderShipped: (data: SMSTemplateData): string => {
    return `🚚 Order #${data.orderId} has been shipped! Tracking details available on EMAP dashboard.`;
  },

  orderDelivered: (data: SMSTemplateData): string => {
    return `✅ Order #${data.orderId} delivered! Thank you for your business. Rate your experience on EMAP.`;
  },

  orderCancelled: (data: SMSTemplateData): string => {
    return `❌ Order #${data.orderId} has been cancelled. Contact support for more information.`;
  },

  // Payment Templates
  paymentReceived: (data: SMSTemplateData): string => {
    return `Payment of ${data.amount} received for order #${data.orderId}. Thank you for your business!`;
  },

  paymentConfirmed: (data: SMSTemplateData): string => {
    return `✅ Payment confirmed: ${data.amount} for order #${data.orderId}. Processing will begin shortly.`;
  },

  paymentFailed: (data: SMSTemplateData): string => {
    return `❌ Payment failed for order #${data.orderId}. Please update your payment method on EMAP.`;
  },

  // Shipment Templates
  shipmentCreated: (data: SMSTemplateData): string => {
    return `New shipment #${data.shipmentId} created. Destination: ${data.name || 'N/A'}. ${data.quantity || 0} bales to be shipped.`;
  },

  shipmentInTransit: (data: SMSTemplateData): string => {
    return `🚢 Shipment #${data.shipmentId} is in transit. Expected delivery: ${data.date || 'soon'}. Track on EMAP.`;
  },

  shipmentDelivered: (data: SMSTemplateData): string => {
    return `✅ Shipment #${data.shipmentId} delivered! ${data.quantity || 0} bales received at destination.`;
  },

  // Warehouse Templates
  warehouseTransfer: (data: SMSTemplateData): string => {
    return `🔄 ${data.quantity || 0} bales transferred from warehouse ${data.fromWarehouse || 'N/A'} to ${data.toWarehouse || 'N/A'}. Inventory updated.`;
  },

  // Alert Templates
  weatherAlert: (data: SMSTemplateData): string => {
    return `⚠️ Weather alert: ${data.name || 'Severe weather'} expected. Take necessary precautions for your farm.`;
  },

  maintenanceReminder: (data: SMSTemplateData): string => {
    return `🔧 Maintenance reminder: ${data.name || 'Equipment'} due for service on ${data.date || 'soon'}. Schedule on EMAP.`;
  },

  // Promotional Templates
  promotional: (data: SMSTemplateData): string => {
    return `Special offer, ${data.name}! Upgrade to EMAP Pro for advanced analytics and priority support. Learn more: https://emap.africa/upgrade`;
  },

  // General Reminders
  reminder: (data: SMSTemplateData): string => {
    return `Reminder: ${data.name || 'Task'} due on ${data.date || 'soon'}. Log in to EMAP to complete: ${data.link || 'https://emap.africa/dashboard'}`;
  },
};

// Helper to truncate messages if needed (for longer messages)
export const truncateMessage = (message: string, maxLength: number = 160): string => {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength - 3) + '...';
};

// Helper to split long messages into multiple parts
export const splitLongMessage = (message: string, maxLength: number = 160): string[] => {
  if (message.length <= maxLength) return [message];
  
  const parts: string[] = [];
  let remaining = message;
  
  while (remaining.length > 0) {
    let part = remaining.substring(0, maxLength);
    // Try to break at a space if possible
    if (remaining.length > maxLength && part.lastIndexOf(' ') > 0) {
      part = part.substring(0, part.lastIndexOf(' '));
    }
    parts.push(part);
    remaining = remaining.substring(part.length).trim();
  }
  
  return parts;
};

// Helper to format currency for SMS
export const formatCurrency = (amount: string | number, currency: string = 'NGN'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${currency} 0`;
  
  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
  
  return formatted;
};

// Helper to get template by type
export const getSMSTemplate = (type: keyof typeof smsTemplates, data: SMSTemplateData): string => {
  const template = smsTemplates[type];
  if (!template) {
    console.error(`SMS template not found for type: ${type}`);
    return `EMAP notification: Please check your dashboard for updates.`;
  }
  return template(data);
};