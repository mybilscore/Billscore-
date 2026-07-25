interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusMap: Record<string, { color: string; text: string }> = {
    processing: {
      color:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      text: "Processing",
    },
    shipped: {
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      text: "Shipped",
    },
    delivered: {
      color:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      text: "Delivered",
    },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        statusMap[status]?.color ||
        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
      }`}
    >
      {statusMap[status]?.text || status}
    </span>
  );
}
