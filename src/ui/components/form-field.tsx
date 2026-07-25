import { Label } from "~/ui/primitives/label";

interface FormFieldProps {
  label: string;
  id: string;
  name: string;
  type?: string;
  value: string | number | boolean;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  required?: boolean;
  step?: string;
  placeholder?: string;
}

export function FormField({
  label,
  id,
  name,
  type = "text",
  value,
  onChange,
  required,
  step,
  placeholder,
}: FormFieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </Label>
      <input
        type={type}
        id={id}
        name={name}
        value={typeof value === "boolean" ? undefined : value}
        checked={typeof value === "boolean" ? value : undefined}
        onChange={onChange}
        required={required}
        step={step}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
      />
    </div>
  );
}
