/**
 * ACCCP Conversion Quality Checker
 *
 * Runs a real .docx through the conversion pipeline, then optionally sends
 * the output to a stronger model to evaluate accuracy and accessibility quality.
 *
 * Usage:
 *   npx tsx scripts/quality-check.ts <file.docx>              # always runs quality review
 *   npx tsx scripts/quality-check.ts <file.docx> --rate 50    # quality review 1-in-50 chance
 *   npx tsx scripts/quality-check.ts <file.docx> --skip       # conversion only, no review
 *
 * Required env vars (same as main app):
 *   LITELLM_BASE_URL, LITELLM_API_KEY, LITELLM_MODEL
 *
 * Optional env var for the stronger judge model:
 *   LITELLM_QUALITY_MODEL   (defaults to LITELLM_MODEL if not set)
 *
 * set -a && source .env && set +a
 * npx tsx scripts/quality-check.ts path/to/file.docx
 */

import fs from "node:fs/promises"
import path from "node:path"
import mammoth from "mammoth"

// ─── Config ───────────────────────────────────────────────────────────────────

function getConfig() {
  const baseUrl = process.env.LITELLM_BASE_URL
  const apiKey = process.env.LITELLM_API_KEY
  const model = process.env.LITELLM_MODEL ?? "gpt-5.4-nano-2026-03-17"
  const qualityModel = process.env.LITELLM_QUALITY_MODEL ?? model

  if (!baseUrl) throw new Error("Missing env var: LITELLM_BASE_URL")
  if (!apiKey) throw new Error("Missing env var: LITELLM_API_KEY")

  return { baseUrl, apiKey, model, qualityModel }
}

// ─── LiteLLM client ───────────────────────────────────────────────────────────

async function callModel(
  systemPrompt: string,
  userMessage: string,
  model: string,
  config: ReturnType<typeof getConfig>,
): Promise<string> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LiteLLM error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  return data.choices[0].message.content.trim()
}

// ─── Quality review prompt ────────────────────────────────────────────────────

const JUDGE_SYSTEM_PROMPT = `\
You are a strict accessibility auditor and document conversion reviewer. You will receive:
1. The original HTML extracted from a Word document (raw mammoth output)
2. The converted HTML our AI pipeline produced (intended to be accessible Canvas LMS HTML)
3. A list of accessibility issues the pipeline flagged

Your job is to evaluate the conversion on three dimensions:

## Content accuracy (0–100)
Was all meaningful content from the original preserved? Check: headings, paragraphs, lists, tables, links, images (as placeholders). Deduct points for missing content, garbled text, or added content that wasn't in the original.

## Accessibility improvement (0–100)
Did the conversion actually improve accessibility beyond the mammoth output? Check: semantic heading hierarchy (no h1, levels don't skip), descriptive link text, table captions and headers, proper list markup, alt attributes on images. Deduct points where the output is no better than or worse than the input.

## Canvas compatibility (0–100)
Is the HTML suitable for Canvas LMS? Check: no <html>/<head>/<body> wrappers, no <script> tags, no inline styles that conflict with Canvas, heading levels start at h2 or lower.

## Output format
Return ONLY a JSON object — no markdown, no explanation:
{
  "contentAccuracy": <0-100>,
  "accessibilityImprovement": <0-100>,
  "canvasCompatibility": <0-100>,
  "overallPass": <true if all three scores >= 70, else false>,
  "issues": ["specific problem 1", "specific problem 2"],
  "verdict": "one-sentence summary of the conversion quality"
}
`

// ─── Quality review ───────────────────────────────────────────────────────────

interface QualityResult {
  contentAccuracy: number
  accessibilityImprovement: number
  canvasCompatibility: number
  overallPass: boolean
  issues: string[]
  verdict: string
}

async function runQualityReview(
  originalHtml: string,
  convertedHtml: string,
  accessibilityErrors: unknown[],
  config: ReturnType<typeof getConfig>,
): Promise<QualityResult> {
  const userMessage = `
## Original HTML (mammoth extraction)
${originalHtml}

## Converted HTML (pipeline output)
${convertedHtml}

## Accessibility issues flagged by pipeline
${accessibilityErrors.length === 0 ? "None" : JSON.stringify(accessibilityErrors, null, 2)}
`.trim()

  console.log(`\n[quality] Running review with model: ${config.qualityModel}`)
  const raw = await callModel(JUDGE_SYSTEM_PROMPT, userMessage, config.qualityModel, config)

  try {
    return JSON.parse(raw) as QualityResult
  } catch {
    throw new Error(`Quality model returned unreadable response:\n${raw}`)
  }
}

// ─── Sampling logic ───────────────────────────────────────────────────────────

/**
 * Returns true if quality review should run this time.
 * rate=1 → always run, rate=50 → ~1-in-50 chance, rate=0 → never
 */
function shouldRunReview(rate: number): boolean {
  if (rate <= 0) return false
  if (rate === 1) return true
  return Math.random() < 1 / rate
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const filePath = args.find((a) => !a.startsWith("--"))

  if (!filePath) {
    console.error("Usage: npx tsx scripts/quality-check.ts <file.docx> [--rate N] [--skip]")
    process.exit(1)
  }

  const rateArg = args.indexOf("--rate")
  const sampleRate = rateArg !== -1 ? parseInt(args[rateArg + 1] ?? "1", 10) : 1
  const skipReview = args.includes("--skip")

  const config = getConfig()
  const buffer = Buffer.from(await fs.readFile(filePath))
  const filename = path.basename(filePath)

  console.log(`\n── Conversion Quality Check ────────────────────────────────`)
  console.log(`File:          ${filename}`)
  console.log(`Model:         ${config.model}`)
  console.log(`Quality model: ${config.qualityModel}`)
  console.log(`Sample rate:   ${skipReview ? "skipped" : sampleRate === 1 ? "always" : `1-in-${sampleRate}`}`)
  console.log(`────────────────────────────────────────────────────────────\n`)

  // ── Step 1: Extract original HTML via mammoth ──────────────────────────────
  console.log("[1/3] Extracting original HTML via mammoth...")
  let imageIndex = 0
  const { value: originalHtml, messages } = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const ext = image.contentType?.split("/")[1] ?? "png"
        return { src: `{{PLACEHOLDER:image${++imageIndex}.${ext}}}` }
      }),
    },
  )

  const warnings = messages.filter((m) => m.type === "warning").map((m) => m.message)
  if (warnings.length) {
    console.log(`   Extraction warnings (${warnings.length}):`)
    warnings.forEach((w) => console.log(`   • ${w}`))
  }

  if (!originalHtml.trim()) {
    console.error("✗ Document is empty or contains no extractable text.")
    process.exit(1)
  }

  // ── Step 2: Run the AI conversion pipeline ─────────────────────────────────
  console.log("[2/3] Running AI conversion pipeline...")

  // Import accessibilty prompts
  const { ACCESSIBILITY_SYSTEM_PROMPT, buildUserMessage } = await import(
    "../lib/prompts/accessibility.js"
  ).catch(() => import("../lib/prompts/accessibility.ts" as never)) as {
    ACCESSIBILITY_SYSTEM_PROMPT: string
    buildUserMessage: (html: string) => string
  }

  const convertedHtml = await callModel(
    ACCESSIBILITY_SYSTEM_PROMPT,
    buildUserMessage(originalHtml),
    config.model,
    config,
  )

  console.log(`   Converted HTML length: ${convertedHtml.length} chars`)

  // Run Stage 2 validation
  const VALIDATION_PROMPT = `You are an accessibility auditor for Canvas LMS HTML. Review the HTML for WCAG 2.1 AA violations. Return a JSON array of issues, or [] if none. Each issue: { type, severity, message, element, suggestion, wcag }. Return ONLY the raw JSON array.`
  const validationRaw = await callModel(
    VALIDATION_PROMPT,
    `Audit this Canvas HTML:\n\n${convertedHtml}`,
    config.model,
    config,
  )

  let accessibilityErrors: unknown[] = []
  try {
    const parsed = JSON.parse(validationRaw)
    accessibilityErrors = Array.isArray(parsed) ? parsed : []
  } catch {
    console.log("   Warning: validation stage returned unreadable JSON")
  }

  console.log(`   Accessibility issues found: ${accessibilityErrors.length}`)

  // ── Step 3: Quality review (sampling) ─────────────────────────────────────
  const runReview = !skipReview && shouldRunReview(sampleRate)

  if (!runReview) {
    console.log("[3/3] Quality review skipped.")
    console.log("\n── Results ─────────────────────────────────────────────────")
    console.log("Conversion:   ✓ Complete")
    console.log(`Issues found: ${accessibilityErrors.length}`)
    console.log(`Review:       Skipped (rate 1/${sampleRate})`)
    return
  }

  console.log("[3/3] Running quality review...")
  const quality = await runQualityReview(originalHtml, convertedHtml, accessibilityErrors, config)

  // ── Output ─────────────────────────────────────────────────────────────────
  const pass = quality.overallPass

  console.log("\n── Quality Review Results ───────────────────────────────────")
  console.log(`Content accuracy:        ${quality.contentAccuracy}/100`)
  console.log(`Accessibility improvement: ${quality.accessibilityImprovement}/100`)
  console.log(`Canvas compatibility:     ${quality.canvasCompatibility}/100`)
  console.log(`Overall:                 ${pass ? "✓ PASS" : "✗ FAIL"}`)
  console.log(`Verdict: ${quality.verdict}`)

  if (quality.issues.length > 0) {
    console.log(`\nIssues identified by reviewer:`)
    quality.issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`))
  }

  console.log("────────────────────────────────────────────────────────────")

  if (!pass) process.exit(1)
}

main().catch((err) => {
  console.error("\nFatal error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
