import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LiteLLMConfig } from "@/lib/litellm";

const convertToHtmlMock = vi
  .fn()
  .mockResolvedValue({ value: "<p>Hello world</p>", messages: [] });

vi.mock("mammoth", () => ({
  default: {
    convertToHtml: convertToHtmlMock,
    images: { imgElement: vi.fn(() => vi.fn()) },
  },
}));

// Defaults to the real formatter so most tests exercise actual pretty-printing;
// individual tests can override with mockRejectedValueOnce/mockImplementationOnce.
const prettierFormatMock = vi.fn();
vi.mock("prettier", async () => {
  const actual = await vi.importActual<typeof import("prettier")>("prettier");
  prettierFormatMock.mockImplementation(actual.format);
  return {
    ...actual,
    format: prettierFormatMock,
  };
});

const callLiteLLMMock = vi.fn();
const fetchModelPricingMock = vi.fn();

vi.mock("../lib/litellm", async () => {
  const actual = await vi.importActual<typeof import("../lib/litellm")>(
    "../lib/litellm",
  );
  return {
    ...actual,
    callLiteLLM: callLiteLLMMock,
    fetchModelPricing: fetchModelPricingMock,
    getLiteLLMConfig: () => TEST_CONFIG,
  };
});

const TEST_CONFIG: LiteLLMConfig = {
  baseUrl: "https://litellm.test",
  apiKey: "test-key",
  model: "test-model",
};

// Imported after the mocks above so convert.ts picks up the mocked module.
const { convertDocx, validateWithAI } = await import("../lib/convert");

describe("validateWithAI", () => {
  beforeEach(() => {
    callLiteLLMMock.mockReset();
  });

  it("returns the parsed errors array on valid JSON", async () => {
    callLiteLLMMock.mockResolvedValueOnce({
      content: '[{"type":"missing-alt","severity":"error","message":"m","suggestion":"s"}]',
      model: "test-model",
      promptTokens: 10,
      completionTokens: 5,
    });

    const { errors, call } = await validateWithAI("<p>html</p>", TEST_CONFIG);

    expect(errors).toEqual([
      { type: "missing-alt", severity: "error", message: "m", suggestion: "s" },
    ]);
    expect(call).toEqual({
      content: expect.any(String),
      model: "test-model",
      promptTokens: 10,
      completionTokens: 5,
    });
  });

  it("falls back to a single warning when the AI returns malformed JSON", async () => {
    callLiteLLMMock.mockResolvedValueOnce({
      content: "not valid json",
      model: "test-model",
      promptTokens: 8,
      completionTokens: 2,
    });

    const { errors, call } = await validateWithAI("<p>html</p>", TEST_CONFIG);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ type: "other", severity: "warning" });
    // Usage is still counted even though the response was unusable.
    expect(call.promptTokens).toBe(8);
    expect(call.completionTokens).toBe(2);
  });

  it("treats a non-array JSON value as no errors", async () => {
    callLiteLLMMock.mockResolvedValueOnce({
      content: '{"not": "an array"}',
      model: "test-model",
      promptTokens: 1,
      completionTokens: 1,
    });

    const { errors } = await validateWithAI("<p>html</p>", TEST_CONFIG);
    expect(errors).toEqual([]);
  });
});

describe("convertDocx", () => {
  beforeEach(() => {
    callLiteLLMMock.mockReset();
    fetchModelPricingMock.mockReset();
    convertToHtmlMock.mockResolvedValue({
      value: "<p>Hello world</p>",
      messages: [],
    });
  });

  it("returns one calls[] entry per stage whose tokens sum to tokensUsed", async () => {
    callLiteLLMMock
      .mockResolvedValueOnce({
        content: "<p>converted</p>",
        model: "test-model",
        promptTokens: 100,
        completionTokens: 50,
      })
      .mockResolvedValueOnce({
        content: "[]",
        model: "test-model",
        promptTokens: 30,
        completionTokens: 10,
      });
    fetchModelPricingMock.mockResolvedValue({
      inputCostPerToken: 0.000002,
      outputCostPerToken: 0.000004,
    });

    const result = await convertDocx(Buffer.from("fake docx bytes"), "test.docx");

    if ("error" in result) throw new Error(`expected success, got: ${result.error}`);

    expect(result.calls).toHaveLength(2);
    expect(result.calls[0].stage).toBe("convert");
    expect(result.calls[1].stage).toBe("validate");

    const tokenSum = result.calls.reduce(
      (sum, call) => sum + call.promptTokens + call.completionTokens,
      0,
    );
    expect(result.tokensUsed).toBe(tokenSum);
    expect(result.calls[0].costUsd).toBeCloseTo(
      100 * 0.000002 + 50 * 0.000004,
      10,
    );
  });

  it("still reports calls[] made before a mid-pipeline failure", async () => {
    callLiteLLMMock
      .mockResolvedValueOnce({
        content: "<p>converted</p>",
        model: "test-model",
        promptTokens: 100,
        completionTokens: 50,
      })
      .mockRejectedValueOnce(new Error("LiteLLM error 500: boom"));
    fetchModelPricingMock.mockResolvedValue(null);

    const result = await convertDocx(Buffer.from("fake docx bytes"), "test.docx");

    if (!("error" in result)) throw new Error("expected failure");
    expect(result.calls ?? []).toHaveLength(1);
    expect(result.calls?.[0].stage).toBe("convert");
  });

  it("classifies missing-image and missing-link extraction warnings as warnings, merged into errors", async () => {
    convertToHtmlMock.mockResolvedValueOnce({
      value: "<p>Hello world</p>",
      messages: [
        { type: "warning", message: "Could not find image file for image1.png" },
        { type: "warning", message: "Could not find hyperlink target" },
        { type: "warning", message: "Unrecognised paragraph style" },
      ],
    });
    callLiteLLMMock
      .mockResolvedValueOnce({
        content: "<p>converted</p>",
        model: "test-model",
        promptTokens: 100,
        completionTokens: 50,
      })
      .mockResolvedValueOnce({
        content: '[{"type":"missing-alt","severity":"error","message":"m","suggestion":"s"}]',
        model: "test-model",
        promptTokens: 30,
        completionTokens: 10,
      });
    fetchModelPricingMock.mockResolvedValue(null);

    const result = await convertDocx(Buffer.from("fake docx bytes"), "test.docx");

    if ("error" in result) throw new Error(`expected success, got: ${result.error}`);

    expect(result.errors).toEqual([
      expect.objectContaining({ type: "missing-image", severity: "warning" }),
      expect.objectContaining({ type: "missing-link", severity: "warning" }),
      expect.objectContaining({ type: "other", severity: "warning" }),
      expect.objectContaining({ type: "missing-alt", severity: "error" }),
    ]);
  });

  it("pretty-prints the AI's single-line HTML for easier review", async () => {
    callLiteLLMMock
      .mockResolvedValueOnce({
        content: "<div><p>one</p><ul><li>a</li><li>b</li></ul></div>",
        model: "test-model",
        promptTokens: 100,
        completionTokens: 50,
      })
      .mockResolvedValueOnce({
        content: "[]",
        model: "test-model",
        promptTokens: 30,
        completionTokens: 10,
      });
    fetchModelPricingMock.mockResolvedValue(null);

    const result = await convertDocx(Buffer.from("fake docx bytes"), "test.docx");

    if ("error" in result) throw new Error(`expected success, got: ${result.error}`);
    expect(result.html.split("\n").length).toBeGreaterThan(1);
    expect(result.html).toContain("  <p>one</p>");
  });

  it("falls back to the unformatted HTML if formatting fails", async () => {
    prettierFormatMock.mockRejectedValueOnce(new Error("parse error"));
    callLiteLLMMock
      .mockResolvedValueOnce({
        content: "<p>converted</p>",
        model: "test-model",
        promptTokens: 100,
        completionTokens: 50,
      })
      .mockResolvedValueOnce({
        content: "[]",
        model: "test-model",
        promptTokens: 30,
        completionTokens: 10,
      });
    fetchModelPricingMock.mockResolvedValue(null);

    const result = await convertDocx(Buffer.from("fake docx bytes"), "test.docx");

    if ("error" in result) throw new Error(`expected success, got: ${result.error}`);
    expect(result.html).toBe("<p>converted</p>");
  });
});
