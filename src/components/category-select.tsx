import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/labels";
import type { StoreCategory } from "@/lib/types";

const fieldClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-accent";

export function CategorySelect({
  value,
  onChange,
  allowAll = false,
  className = fieldClass,
}: {
  value: StoreCategory | "";
  onChange: (value: StoreCategory | "") => void;
  allowAll?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as StoreCategory | "")}
      className={className}
    >
      {allowAll && <option value="">전체</option>}
      {CATEGORY_OPTIONS.map((key) => (
        <option key={key} value={key}>
          {CATEGORY_LABELS[key]}
        </option>
      ))}
    </select>
  );
}
