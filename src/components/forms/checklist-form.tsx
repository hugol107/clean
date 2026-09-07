"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createChecklistTemplateAction } from "@/server/actions/checklists";

interface DraftItem {
  key: number;
  label: string;
  isRequired: boolean;
}

let nextKey = 1;

export function ChecklistForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { key: nextKey++, label: "Empty bins", isRequired: true },
    { key: nextKey++, label: "Clean surfaces", isRequired: true },
    { key: nextKey++, label: "Mop floor", isRequired: true },
  ]);

  function updateItem(key: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function handleSubmit() {
    const validItems = items.filter((i) => i.label.trim());
    if (!name.trim() || validItems.length === 0) {
      toast.error("Add a name and at least one checklist item.");
      return;
    }
    startTransition(async () => {
      const result = await createChecklistTemplateAction({
        organizationId,
        name,
        description: description || undefined,
        items: validItems.map((i) => ({ label: i.label, isRequired: i.isRequired })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Checklist created");
      router.push("/checklists");
    });
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Checklist name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Public Bathroom Standard" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Standard checklist for public restrooms" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Items</Label>
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <Checkbox checked={item.isRequired} onCheckedChange={(v) => updateItem(item.key, { isRequired: v === true })} />
            <Input
              value={item.label}
              onChange={(e) => updateItem(item.key, { label: e.target.value })}
              placeholder="e.g. Refill soap"
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setItems((prev) => [...prev, { key: nextKey++, label: "", isRequired: true }])}
        >
          <Plus /> Add item
        </Button>
        <p className="text-xs text-muted-foreground">Checked = required to finish a cleaning. Unchecked items are optional.</p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Creating…" : "Create checklist"}
        </Button>
      </div>
    </div>
  );
}
