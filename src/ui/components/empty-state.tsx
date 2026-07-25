import { Plus } from "lucide-react";
import { Button } from "~/ui/primitives/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText: string;
  onAction: () => void;
}

export function EmptyState({
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="col-span-full rounded-lg border bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <p className="text-gray-500">{title}</p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      <Button onClick={onAction} className="mt-4 flex items-center gap-2">
        <Plus size={16} />
        {actionText}
      </Button>
    </div>
  );
}
