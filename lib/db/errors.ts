const PG_UNIQUE_VIOLATION = "23505";

/**
 * Drizzle wraps driver failures in a DrizzleQueryError and hangs the original
 * postgres error — the one carrying `code` — off `cause`, so the code is never
 * on the error itself. Walk the chain rather than reading `error.code`.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current = error;

  // Bounded in case a driver ever hands back a self-referencing cause.
  for (let depth = 0; current != null && depth < 5; depth++) {
    if (
      typeof current === "object" &&
      "code" in current &&
      (current as { code?: unknown }).code === PG_UNIQUE_VIOLATION
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }

  return false;
}
