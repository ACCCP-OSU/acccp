/**
 * API Testing — LiteLLM
 *
 * Matches test suite slide categories:
 *   1. AI & LiteLLM connection  — config is readable; the right endpoint/headers are used
 *   2. Response validation       — successful responses are parsed into the expected shape
 *   3. Error handling            — API failures and invalid inputs are handled gracefully
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callLiteLLM,
  clearModelPricingCache,
  computeCallCostUsd,
  fetchModelPricing,
  getLiteLLMConfig,
} from "./litellm";

const CONFIG = {
  baseUrl: "https://litellm.test",
  apiKey: "test-key",
  model: "test-model",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── 1. AI & LiteLLM connection ────────────────────────────────────────────────
// These tests verify that the client is configured correctly and talks to the
// right endpoint — without making a real call to the LLM.

describe("AI & LiteLLM connection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("getLiteLLMConfig reads credentials from environment variables", () => {
    vi.stubEnv("LITELLM_BASE_URL", "https://litellm.cloud.osu.edu");
    vi.stubEnv("LITELLM_API_KEY", "real-key");
    vi.stubEnv("LITELLM_MODEL", "gpt-5.4-nano-2026-03-17");

    const config = getLiteLLMConfig();

    expect(config.baseUrl).toBe("https://litellm.cloud.osu.edu");
    expect(config.apiKey).toBe("real-key");
    expect(config.model).toBe("gpt-5.4-nano-2026-03-17");
  });

  it("getLiteLLMConfig falls back to the default model when LITELLM_MODEL is unset", () => {
    vi.stubEnv("LITELLM_BASE_URL", "https://litellm.cloud.osu.edu");
    vi.stubEnv("LITELLM_API_KEY", "real-key");
    // LITELLM_MODEL is intentionally not set here so the ?? fallback triggers.
    // (Setting it to "" would not trigger the fallback because "" is not null/undefined.)

    const config = getLiteLLMConfig();

    expect(config.model).toBe("gpt-5.4-nano-2026-03-17");
  });

  it("getLiteLLMConfig throws when LITELLM_BASE_URL is missing", () => {
    vi.stubEnv("LITELLM_BASE_URL", "");
    vi.stubEnv("LITELLM_API_KEY", "real-key");

    expect(() => getLiteLLMConfig()).toThrow("LITELLM_BASE_URL");
  });

  it("getLiteLLMConfig throws when LITELLM_API_KEY is missing", () => {
    vi.stubEnv("LITELLM_BASE_URL", "https://litellm.cloud.osu.edu");
    vi.stubEnv("LITELLM_API_KEY", "");

    expect(() => getLiteLLMConfig()).toThrow("LITELLM_API_KEY");
  });

  it("callLiteLLM sends a POST to /chat/completions on the configured base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "ok" } }],
        model: "test-model",
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await callLiteLLM("system", "user", CONFIG);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://litellm.test/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("callLiteLLM sends the API key as a Bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "ok" } }],
        model: "test-model",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await callLiteLLM("system", "user", CONFIG);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-key"
    );
  });

  it("fetchModelPricing queries /model/info on the configured base URL", async () => {
    clearModelPricingCache();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchModelPricing("some-model", CONFIG);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://litellm.test/model/info",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      })
    );
  });
});

// ── 2. Response validation ────────────────────────────────────────────────────
// These tests verify that successful API responses are parsed into the shape
// the rest of the application expects.

describe("Response validation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("callLiteLLM returns trimmed content, model name, and token counts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          choices: [{ message: { content: "  <p>hi</p>  " } }],
          model: "gpt-5.4-nano-2026-03-17",
          usage: { prompt_tokens: 120, completion_tokens: 40 },
        })
      )
    );

    const result = await callLiteLLM("system", "user", CONFIG);

    expect(result).toEqual({
      content: "<p>hi</p>",
      model: "gpt-5.4-nano-2026-03-17",
      promptTokens: 120,
      completionTokens: 40,
    });
  });

  it("callLiteLLM defaults token counts to 0 when usage is absent from the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          choices: [{ message: { content: "ok" } }],
          model: "some-model",
        })
      )
    );

    const result = await callLiteLLM("system", "user", CONFIG);

    expect(result.promptTokens).toBe(0);
    expect(result.completionTokens).toBe(0);
  });

  it("fetchModelPricing finds pricing by model_name and returns per-token costs", async () => {
    clearModelPricingCache();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [
            {
              model_name: "gpt-5.4-nano-2026-03-17",
              model_info: {
                input_cost_per_token: 0.000002,
                output_cost_per_token: 0.000004,
              },
            },
          ],
        })
      )
    );

    const pricing = await fetchModelPricing("gpt-5.4-nano-2026-03-17", CONFIG);

    expect(pricing).toEqual({
      inputCostPerToken: 0.000002,
      outputCostPerToken: 0.000004,
    });
  });

  it("fetchModelPricing falls back to litellm_params.model when model_name does not match", async () => {
    clearModelPricingCache();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [
            {
              model_name: "alias",
              litellm_params: { model: "gpt-5.4-nano-2026-03-17" },
              model_info: {
                input_cost_per_token: 0.000001,
                output_cost_per_token: 0.000002,
              },
            },
          ],
        })
      )
    );

    const pricing = await fetchModelPricing("gpt-5.4-nano-2026-03-17", CONFIG);

    expect(pricing).toEqual({
      inputCostPerToken: 0.000001,
      outputCostPerToken: 0.000002,
    });
  });

  it("computeCallCostUsd computes prompt and completion cost separately", () => {
    const cost = computeCallCostUsd(1000, 500, {
      inputCostPerToken: 0.000002,
      outputCostPerToken: 0.000004,
    });

    expect(cost).toBeCloseTo(1000 * 0.000002 + 500 * 0.000004, 10);
  });

  it("fetchModelPricing caches the result so the endpoint is not called twice", async () => {
    clearModelPricingCache();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            model_name: "m",
            model_info: { input_cost_per_token: 1, output_cost_per_token: 2 },
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchModelPricing("m", CONFIG);
    await fetchModelPricing("m", CONFIG);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ── 3. Error handling ─────────────────────────────────────────────────────────
// These tests verify that API failures and invalid inputs are handled without
// crashing — errors are surfaced clearly and degraded gracefully.

describe("Error handling", () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => clearModelPricingCache());

  it("callLiteLLM throws with the HTTP status and body on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("Internal Server Error", { status: 500 })
        )
    );

    await expect(callLiteLLM("system", "user", CONFIG)).rejects.toThrow(
      /LiteLLM error 500/
    );
  });

  it("callLiteLLM throws on a 401 Unauthorized response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }))
    );

    await expect(callLiteLLM("system", "user", CONFIG)).rejects.toThrow(
      /LiteLLM error 401/
    );
  });

  it("computeCallCostUsd returns null when pricing is unavailable", () => {
    expect(computeCallCostUsd(100, 50, null)).toBeNull();
  });

  it("fetchModelPricing returns null (not throw) when the model has no cost fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ data: [{ model_name: "m", model_info: {} }] })
        )
    );

    expect(await fetchModelPricing("m", CONFIG)).toBeNull();
  });

  it("fetchModelPricing returns null when no entry matches the requested model", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: [] }))
    );

    expect(await fetchModelPricing("unknown-model", CONFIG)).toBeNull();
  });

  it("fetchModelPricing returns null (not throw) on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("Service Unavailable", { status: 503 }))
    );

    expect(await fetchModelPricing("m", CONFIG)).toBeNull();
  });

  it("fetchModelPricing returns null (not throw) when the network request fails entirely", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    expect(await fetchModelPricing("m", CONFIG)).toBeNull();
  });
});
