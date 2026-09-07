"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Radio } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface LiveSession {
  sessionId: string;
  locationId: string;
  employeeName: string;
  locationName: string;
  startedAt: string;
  targetMinutes: number;
}

const POLL_INTERVAL_MS = 8000;

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function LiveOperationsTable({ organizationId, initialSessions }: { organizationId: string; initialSessions: LiveSession[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const now = useNow(1000);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/live?organizationId=${organizationId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSessions(data.active);
      } catch {
        // Transient network hiccup — next poll will retry. Never surface a toast for this.
      }
    }
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [organizationId]);

  if (sessions.length === 0) {
    return <EmptyState icon={Radio} title="Nothing being cleaned right now" description="Active cleanings will appear here in real time." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Worker</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => {
          const elapsedSeconds = Math.floor((now - new Date(s.startedAt).getTime()) / 1000);
          const targetSeconds = s.targetMinutes * 60;
          const ratio = elapsedSeconds / targetSeconds;
          const status = ratio >= 1.5 ? "overdue" : ratio >= 1 ? "warning" : "normal";
          return (
            <TableRow key={s.sessionId}>
              <TableCell className="font-medium">{s.employeeName}</TableCell>
              <TableCell>
                <Link href={`/locations/${s.locationId}`} className="hover:underline">
                  {s.locationName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
              <TableCell
                className={cn(
                  "font-mono tabular-nums font-medium",
                  status === "overdue" && "text-status-overdue",
                  status === "warning" && "text-status-due-soon",
                )}
              >
                {formatDuration(elapsedSeconds)}
              </TableCell>
              <TableCell className="text-muted-foreground">{s.targetMinutes}m</TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
                    status === "normal" && "bg-status-cleaning-bg text-status-cleaning",
                    status === "warning" && "bg-status-due-soon-bg text-status-due-soon",
                    status === "overdue" && "bg-status-overdue-bg text-status-overdue",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {status === "normal" ? "Cleaning" : status === "warning" ? "Running long" : "Overdue"}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
