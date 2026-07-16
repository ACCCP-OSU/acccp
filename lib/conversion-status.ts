import type { ConversionStatus } from "@/lib/types/document";

/**
 * job_status carries states the dashboard has no concept of. `needs_review`
 * still has usable HTML, so it reads as success; the terminal states that
 * leave nothing to show read as errors.
 */
export function toConversionStatus(status: string | null): ConversionStatus {
  switch (status) {
    case "queued":
      return "queued";
    case "processing":
      return "processing";
    case "completed":
    case "needs_review":
      return "success";
    case "failed":
    case "expired":
    case "cancelled":
      return "error";
    default:
      // No job row yet: uploaded but never converted.
      return "idle";
  }
}
