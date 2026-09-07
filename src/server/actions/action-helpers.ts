import "server-only";
import { toActionError } from "@/lib/errors";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Uniform try/catch wrapper for Server Actions: never throws, always returns a client-safe result. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    const { message } = toActionError(error);
    return { ok: false, error: message };
  }
}
