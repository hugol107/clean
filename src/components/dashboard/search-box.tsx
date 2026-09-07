import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Plain GET form (no client JS needed) that preserves other search params via hidden inputs. */
export function SearchBox({
  defaultValue,
  placeholder = "Search…",
  preserveParams = {},
  className,
}: {
  defaultValue?: string;
  placeholder?: string;
  preserveParams?: Record<string, string | undefined>;
  className?: string;
}) {
  return (
    <form className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={defaultValue} placeholder={placeholder} className="pl-8" />
      </div>
      {Object.entries(preserveParams).map(
        ([key, value]) => value && <input key={key} type="hidden" name={key} value={value} />,
      )}
    </form>
  );
}
