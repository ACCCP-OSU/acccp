import { describe, expect, it } from "vitest";

import { toConversionStatus } from "./conversion-status";

describe("toConversionStatus", () => {
  it("maps every job_status to a ConversionStatus", () => {
    expect(toConversionStatus("queued")).toBe("queued");
    expect(toConversionStatus("processing")).toBe("processing");
    expect(toConversionStatus("completed")).toBe("success");
    expect(toConversionStatus("needs_review")).toBe("success");
    expect(toConversionStatus("failed")).toBe("error");
    expect(toConversionStatus("expired")).toBe("error");
    expect(toConversionStatus("cancelled")).toBe("error");
  });

  it("treats a missing job row as idle", () => {
    expect(toConversionStatus(null)).toBe("idle");
  });

  it("treats an unrecognized status as idle rather than throwing", () => {
    expect(toConversionStatus("some_future_status")).toBe("idle");
  });
});
