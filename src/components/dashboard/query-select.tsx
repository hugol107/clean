"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const ALL_SENTINEL = "__all__";

/** A `<select>` that reads/writes a URL search param and navigates on change — keeps table filters shareable/bookmarkable (spec section 32). */
export function QuerySelect({
  paramKey,
  options,
  placeholder,
  className,
}: {
  paramKey: string;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramKey) ?? ALL_SENTINEL;

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_SENTINEL) params.delete(paramKey);
    else params.set(paramKey, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_SENTINEL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
