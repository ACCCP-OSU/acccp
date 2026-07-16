/**
 * GET /api/admin/model-info
 *
 * Live pricing for the currently configured LiteLLM model, straight from
 * LiteLLM's own /model/info — separate from the historical spend stored in
 * model_calls (which is priced at call time so past spend doesn't shift if
 * pricing changes later).
 *
 * Response: application/json
 *   { model: string, inputCostPerToken: number, outputCostPerToken: number }
 *   404 if LiteLLM has no pricing on file for the configured model.
 */

import { NextResponse } from "next/server";

import { verifyRoleOrUnauthorized } from "@/lib/auth";
import { fetchModelPricing, getLiteLLMConfig } from "@/lib/litellm";

export async function GET() {
  const authCheck = await verifyRoleOrUnauthorized(["admin"]);
  if ("response" in authCheck) return authCheck.response;

  let config;
  try {
    config = getLiteLLMConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const pricing = await fetchModelPricing(config.model, config);
  if (!pricing) {
    return NextResponse.json(
      { error: `No pricing available for model "${config.model}".` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    model: config.model,
    inputCostPerToken: pricing.inputCostPerToken,
    outputCostPerToken: pricing.outputCostPerToken,
  });
}
