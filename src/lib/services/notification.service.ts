// src/lib/services/notification.service.ts
import { prisma } from "~/lib/db";

export interface ActivityNotification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  type: "harvest" | "alert" | "info" | "success";
  activityId?: number;
  activityType?: string;
}

export async function getActivityNotifications(
  partyId: number,
  limit: number = 5  // Changed from 10 to 5
): Promise<ActivityNotification[]> {
  try {
    // Get recent activities from accessible crop cycles
    const accessibleFarms = await prisma.cluster_farms.findMany({
      where: {
        OR: [
          { owner_party_id: partyId },
          { operator_party_id: partyId },
          {
            cluster: {
              OR: [
                { coordinator_id: partyId },
                { supervisor_id: partyId },
                { anchor_id: partyId },
              ],
            },
          },
        ],
      },
      select: { id: true },
    });

    const farmIds = accessibleFarms.map(f => f.id);

    const recentActivities = await prisma.cycle_activities.findMany({
      where: {
        cycle: {
          field: {
            farm_id: { in: farmIds }
          }
        }
      },
      include: {
        cycle: {
          include: {
            field: {
              include: {
                farm: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit  // This will now take only 5
    });

    const notifications: ActivityNotification[] = [];

    for (const activity of recentActivities) {
      const notification = createNotificationFromActivity(activity);
      if (notification) {
        notifications.push(notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error("Error fetching activity notifications:", error);
    return [];
  }
}

function createNotificationFromActivity(activity: any): ActivityNotification | null {
  const now = new Date();
  const activityDate = new Date(activity.activity_date);
  const timeDiff = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60)); // minutes ago
  let timeAgo = "";
  
  if (timeDiff < 60) {
    timeAgo = `${timeDiff} minutes ago`;
  } else if (timeDiff < 1440) {
    timeAgo = `${Math.floor(timeDiff / 60)} hours ago`;
  } else {
    timeAgo = `${Math.floor(timeDiff / 1440)} days ago`;
  }

  const farmName = activity.cycle?.field?.farm?.name || "Unknown Farm";
  const fieldName = activity.cycle?.field?.name || activity.cycle?.field?.field_number || "Unknown Field";
  const cropType = activity.cycle?.crop_type || "Crop";

  let text = "";
  let type: "harvest" | "alert" | "info" | "success" = "info";

  switch (activity.activity_type) {
    case "HARVEST":
      text = `🌾 Harvest recorded at ${farmName} - ${fieldName} (${cropType})`;
      type = "harvest";
      break;
    case "FERTILIZER_APPLICATION":
      text = `🌱 Fertilizer applied at ${farmName} - ${fieldName}`;
      if (activity.product_name) {
        text += ` (${activity.product_name})`;
      }
      type = "success";
      break;
    case "PESTICIDE_APPLICATION":
      text = `🐛 Pesticide applied at ${farmName} - ${fieldName}`;
      if (activity.product_name) {
        text += ` (${activity.product_name})`;
      }
      type = "alert";
      break;
    case "HERBICIDE_APPLICATION":
      text = `🌿 Herbicide applied at ${farmName} - ${fieldName}`;
      if (activity.product_name) {
        text += ` (${activity.product_name})`;
      }
      type = "alert";
      break;
    case "IRRIGATION":
      text = `💧 Irrigation completed at ${farmName} - ${fieldName}`;
      if (activity.water_volume) {
        text += ` (${activity.water_volume} m³)`;
      }
      type = "success";
      break;
    case "PLANTING":
      text = `🌽 Planting completed at ${farmName} - ${fieldName} (${cropType})`;
      type = "success";
      break;
    case "SCOUTING":
      text = `🔍 Field scouting report at ${farmName} - ${fieldName}`;
      type = "info";
      break;
    case "FIELD_REPORT":
      text = `📋 Field report submitted for ${farmName} - ${fieldName}`;
      type = "info";
      break;
    case "LABOR":
      text = `👥 Labor activity recorded at ${farmName} - ${fieldName}`;
      if (activity.duration_hours) {
        text += ` (${activity.duration_hours} hours)`;
      }
      type = "info";
      break;
    case "EQUIPMENT":
      text = `🚜 Equipment operation at ${farmName} - ${fieldName}`;
      if (activity.duration_hours) {
        text += ` (${activity.duration_hours} hours)`;
      }
      type = "info";
      break;
    default:
      text = `📝 ${activity.activity_type.replace(/_/g, ' ')} recorded at ${farmName} - ${fieldName}`;
      type = "info";
  }

  // Add issues if detected
  if (activity.issues_detected) {
    text = `⚠️ ${text} - Issues detected!`;
    type = "alert";
  }

  return {
    id: `activity_${activity.id}`,
    text,
    time: timeAgo,
    read: false,
    type,
    activityId: activity.id,
    activityType: activity.activity_type,
  };
}

// Sort notifications by priority and date
export function sortNotifications(notifications: ActivityNotification[]): ActivityNotification[] {
  const priorityOrder = { harvest: 1, success: 2, alert: 3, info: 4 };
  return [...notifications].sort((a, b) => {
    const priorityA = priorityOrder[a.type] || 5;
    const priorityB = priorityOrder[b.type] || 5;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.time.localeCompare(b.time);
  });
}