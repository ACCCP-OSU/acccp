/**
 * ACCCP DOCX → Accessible Canvas HTML Conversion Pipeline
 *
 * Two-stage AI pipeline:
 *   Stage 1 — mammoth extracts HTML from the .docx, then the AI converts it
 *              to semantic, accessible Canvas HTML using the BUX/WCAG prompt.
 *   Stage 2 — a second AI call reviews the output for accessibility issues
 *              and returns structured AccessibilityError[] for the frontend.
 *
 * Entry point: convertDocx() — called by POST /api/convert
 *
 * CLI usage (local testing):
 *   set -a && source .env && set +a
 *   npx tsx lib/convert.ts path/to/file.docx
 *
 * Required env vars:
 *   LITELLM_BASE_URL   e.g. https://litellm.cloud.osu.edu
 *   LITELLM_API_KEY    your nano key
 *   LITELLM_MODEL      e.g. gpt-5.4-nano-2026-03-17
 */

import mammoth from "mammoth"
import * as prettier from "prettier"
import {
  ACCESSIBILITY_SYSTEM_PROMPT,
  buildUserMessage,
} from "./prompts/accessibility"
import {
  callLiteLLM,
  computeCallCostUsd,
  fetchModelPricing,
  getLiteLLMConfig,
  type LiteLLMCallResult,
  type LiteLLMConfig,
} from "./litellm"

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single accessibility issue found in the converted HTML. */
export interface AccessibilityError {
  type:
    | "missing-alt"
    | "heading-skip"
    | "bad-link"
    | "no-table-caption"
    | "no-table-headers"
    | "missing-list-markup"
    | "empty-heading"
    | "color-only-meaning"
    | "h1-present"
    | "non-descriptive-link"
    | "missing-image"
    | "missing-link"
    | "other"
  severity: "error" | "warning"
  /** Human-readable description of the specific problem */
  message: string
  /** The offending HTML snippet (truncated for display) */
  element?: string
  suggestion: string
  /** WCAG criterion this violates, e.g. "WCAG 1.1.1" */
  wcag?: string
}

/** One LiteLLM call's usage, priced from LiteLLM's /model/info at call time. */
export interface ModelCallUsage {
  stage: "convert" | "validate"
  model: string
  promptTokens: number
  completionTokens: number
  /** Null when pricing couldn't be looked up — tokens are still counted. */
  costUsd: number | null
}

/** Returned by convertDocx() on success. */
export interface ConversionResult {
  /** Accessible HTML fragment, ready to paste into Canvas RCE */
  html: string
  errors: AccessibilityError[]
  model: string
  /** Total tokens used across both AI calls */
  tokensUsed: number
  /** Per-call usage/cost breakdown, for persisting to model_calls */
  calls: ModelCallUsage[]
  /** Non-fatal warnings from mammoth during extraction */
  extractionWarnings: string[]
}

/** Returned by convertDocx() if something goes wrong. */
export interface ConversionError {
  error: string
  detail?: string
  /** Usage incurred before the failure, if any — still billable. */
  calls?: ModelCallUsage[]
}

async function toModelCallUsage(
  stage: ModelCallUsage["stage"],
  call: LiteLLMCallResult,
  config: Pick<LiteLLMConfig, "baseUrl" | "apiKey">
): Promise<ModelCallUsage> {
  const pricing = await fetchModelPricing(call.model, config)
  return {
    stage,
    model: call.model,
    promptTokens: call.promptTokens,
    completionTokens: call.completionTokens,
    costUsd: computeCallCostUsd(
      call.promptTokens,
      call.completionTokens,
      pricing
    ),
  }
}

// ─── Stage 1: DOCX extraction ─────────────────────────────────────────────────

/**
 * Extracts HTML from a .docx buffer using mammoth.
 * We use HTML (not plain text) so the AI receives preserved list structure,
 * link hrefs, and heading levels. Images are replaced with clean placeholders
 * instead of embedding raw base64 data.
 */
async function extractDocx(buffer: Buffer): Promise<{
  mammothHtml: string
  extractionWarnings: string[]
}> {
  let imageIndex = 0

  const { value: mammothHtml, messages } = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const ext = image.contentType?.split("/")[1] ?? "png"
        const name = `image${++imageIndex}.${ext}`
        return { src: `{{PLACEHOLDER:${name}}}` }
      }),
    }
  )

  const extractionWarnings = messages
    .filter((m) => m.type === "warning")
    .map((m) => m.message)

  return { mammothHtml, extractionWarnings }
}

/**
 * Extraction warnings come from mammoth reading the raw .docx — they mean a
 * source image or hyperlink couldn't be read at all. There's nothing the
 * conversion pipeline can do about content that isn't there, so these are
 * always warnings, never errors.
 */
function classifyExtractionWarning(message: string): AccessibilityError {
  const lower = message.toLowerCase()
  if (lower.includes("image")) {
    return {
      type: "missing-image",
      severity: "warning",
      message,
      suggestion:
        "This image could not be read from the source document. Re-add it manually in Canvas.",
    }
  }
  if (lower.includes("hyperlink") || lower.includes("link")) {
    return {
      type: "missing-link",
      severity: "warning",
      message,
      suggestion:
        "This link could not be read from the source document. Re-add it manually in Canvas.",
    }
  }
  return {
    type: "other",
    severity: "warning",
    message,
    suggestion: "Review the original document manually for this issue.",
  }
}

// ─── HTML formatting ──────────────────────────────────────────────────────────

/**
 * Pretty-prints the AI's single-line HTML output so it's easy to scan in the
 * review dialog. The AI is explicitly told not to format its own output (see
 * ACCESSIBILITY_SYSTEM_PROMPT) — this is the formatter it refers to. Falls
 * back to the unformatted string if the fragment can't be parsed rather than
 * failing the whole conversion over a cosmetic step.
 */
async function formatHtml(html: string): Promise<string> {
  try {
    return await prettier.format(html, { parser: "html" })
  } catch (err) {
    console.warn("[convert] HTML formatting failed, returning unformatted output:", err)
    return html
  }
}

// ─── Stage 2: AI validation ───────────────────────────────────────────────────

/**
 * The second AI call sees only the converted HTML — no knowledge of the original
 * document. This gives a fresh-eyes accessibility review of the output.
 */
const VALIDATION_SYSTEM_PROMPT = `\
You are an accessibility auditor for Canvas LMS HTML content. You will receive an HTML fragment that was generated from a Word document conversion. Your job is to review it for accessibility issues and return a structured JSON report.

## Your task

Review the HTML for violations of WCAG 2.1 AA and Canvas LMS constraints. For every issue found, produce a JSON object. Return a JSON array of all issues found. If no issues are found, return an empty array [].

## Issue object shape

{
  "type": one of: "missing-alt" | "heading-skip" | "bad-link" | "no-table-caption" | "no-table-headers" | "missing-list-markup" | "empty-heading" | "color-only-meaning" | "h1-present" | "non-descriptive-link" | "other",
  "severity": "error" or "warning",
  "message": "Specific description of the exact problem found, referencing the content where possible",
  "element": "The offending HTML snippet, max 120 characters",
  "suggestion": "Concrete, actionable fix for this specific instance",
  "wcag": "WCAG criterion e.g. WCAG 1.1.1"
}

## What to check

- Images missing alt attribute entirely → error, type: "missing-alt", WCAG 1.1.1
- Images with alt="[ALT TEXT REQUIRED]" → warning, type: "missing-alt" (flags for instructor)
- Heading levels that skip (e.g. h2 → h4) → error, type: "heading-skip", WCAG 2.4.6
- An <h1> tag present anywhere in the HTML → error, type: "h1-present". Canvas pages already have their own h1 page title so adding another creates a duplicate. Do NOT flag the absence of h1 — that is correct and expected.
- Empty heading tags → warning, type: "empty-heading"
- Links with text "click here", "here", "read more", "link", or bare URLs → error, type: "non-descriptive-link", WCAG 2.4.4
- Tables without <caption> → error, type: "no-table-caption", WCAG 1.3.1
- Tables without <th> header cells → error, type: "no-table-headers", WCAG 1.3.1
- Bullet points simulated with hyphens or asterisks inside <p> tags → warning, type: "missing-list-markup", WCAG 1.3.1
- Content that uses color phrasing like "see the red text" or "items in green" → warning, type: "color-only-meaning", WCAG 1.4.1

## Output rules

- Return ONLY the raw JSON array. No markdown fences, no explanation, no preamble.
- Be specific in every message — name the actual content, not just the rule.
- If the same issue type appears multiple times, create a separate object for each instance.
- Do not invent issues that are not present in the HTML.
`

export async function validateWithAI(
  html: string,
  config: LiteLLMConfig
): Promise<{ errors: AccessibilityError[]; call: LiteLLMCallResult }> {
  const userMessage = `Please audit the following Canvas HTML fragment for accessibility issues:\n\n${html}`

  const call = await callLiteLLM(VALIDATION_SYSTEM_PROMPT, userMessage, config)

  try {
    const errors = JSON.parse(call.content) as AccessibilityError[]
    return { errors: Array.isArray(errors) ? errors : [], call }
  } catch {
    // If the AI returns malformed JSON, surface it as a single warning
    return {
      errors: [
        {
          type: "other",
          severity: "warning",
          message: "Validation pass returned an unreadable response.",
          suggestion: "Review the HTML manually for accessibility issues.",
        },
      ],
      call,
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Converts a .docx buffer to accessible Canvas HTML.
 * Called by POST /api/convert — pass the raw file bytes and original filename.
 *
 * @param buffer    Raw .docx bytes from the uploaded file
 * @param filename  Original filename (used for logging)
 */
export async function convertDocx(
  buffer: Buffer,
  filename: string
): Promise<ConversionResult | ConversionError> {
  const calls: ModelCallUsage[] = []
  try {
    const config = getLiteLLMConfig()

    // Stage 1: extract HTML from the .docx
    console.log(`[convert] Extracting: ${filename}`)
    const { mammothHtml, extractionWarnings } = await extractDocx(buffer)

    if (!mammothHtml.trim()) {
      return {
        error: "Document appears to be empty or contains no extractable text.",
      }
    }

    // Stage 1: convert to accessible Canvas HTML
    const userMessage = buildUserMessage(mammothHtml)
    console.log(`[convert] Stage 1: Converting to HTML...`)
    const conversionCall = await callLiteLLM(
      ACCESSIBILITY_SYSTEM_PROMPT,
      userMessage,
      config
    )
    calls.push(await toModelCallUsage("convert", conversionCall, config))
    const html = await formatHtml(conversionCall.content)
    const model = conversionCall.model

    // Stage 2: validate the output for accessibility issues
    console.log(`[convert] Stage 2: Validating accessibility...`)
    const { errors: validationErrors, call: validationCall } = await validateWithAI(
      html,
      config
    )
    calls.push(await toModelCallUsage("validate", validationCall, config))

    // Extraction warnings (missing images/links from the source .docx) are
    // surfaced through the same errors[] list the frontend renders.
    const errors = [
      ...extractionWarnings.map(classifyExtractionWarning),
      ...validationErrors,
    ]

    const tokensUsed = calls.reduce(
      (sum, c) => sum + c.promptTokens + c.completionTokens,
      0
    )

    console.log(`[convert] Done. ${errors.length} issue(s) found. Tokens: ${tokensUsed}`)

    return {
      html,
      errors,
      model,
      tokensUsed,
      calls,
      extractionWarnings,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: "Conversion failed", detail: message, calls }
  }
}

// ─── CLI entrypoint ───────────────────────────────────────────────────────────
// Run: set -a && source .env && set +a && npx tsx lib/convert.ts ./file.docx

if (
  process.argv[1]?.endsWith("convert.ts") ||
  process.argv[1]?.endsWith("convert.js")
) {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error("Usage: npx tsx lib/convert.ts <path-to-docx>")
    process.exit(1)
  }

  ;(async () => {
    const fs = await import("fs/promises")
    const path = await import("path")
    const buffer = Buffer.from(await fs.readFile(filePath))
    const filename = path.basename(filePath)

    console.log(`\nConverting: ${filename}\n`)
    const result = await convertDocx(buffer, filename)

    if ("error" in result) {
      console.error("Error:", result.error, result.detail ?? "")
      process.exit(1)
    }

    console.log(`\n── HTML output (${result.html.length} chars) ──────────────`)
    console.log(result.html)

    if (result.errors.length > 0) {
      console.log(`\n── Accessibility issues (${result.errors.length}) ────────`)
      result.errors.forEach((e, i) => {
        console.log(`\n${i + 1}. [${e.severity.toUpperCase()}] ${e.type}`)
        console.log(`   ${e.message}`)
        if (e.element) console.log(`   Element: ${e.element}`)
        console.log(`   Fix: ${e.suggestion}`)
        if (e.wcag) console.log(`   ${e.wcag}`)
      })
    } else {
      console.log("\n── No accessibility issues found ✓")
    }

    console.log(`\nModel: ${result.model} | Total tokens: ${result.tokensUsed}`)
  })()
}
