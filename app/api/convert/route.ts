/**
 * POST /api/convert
 *
 * Accepts a .docx file and returns accessible Canvas HTML plus a structured
 * list of accessibility errors.
 *
 * ─── API INTERACTION MAP ─────────────────────────────────────────────────────
 *
 *  1. AUTH (BuckeyePass SSO)
 *     Runs first — every request. Verifies the session token and resolves the
 *     userId by looking up (or creating) a row in the PostgreSQL `users` table.
 *     Unauthenticated requests are rejected here.
 *
 *  2. FILE STORAGE (S3 / MinIO) + PostgreSQL `documents` + `artifacts`
 *     Uploads the raw .docx buffer to S3/MinIO and gets back a storage key.
 *     Then inserts a `documents` row (filename, size, checksum) and an
 *     `artifacts` row (type: source_docx) pointing to that storage key.
 *
 *  3. JOB TRACKING (PostgreSQL `conversion_jobs`)
 *     Runs twice:
 *       Before conversion — insert a `conversion_jobs` row with status "processing"
 *       so the job appears in the admin board immediately while it runs.
 *       After conversion — update status to "completed" or "failed", insert an
 *       `artifacts` row for the HTML output (type: html_output), and insert one
 *       `validation_findings` row per AccessibilityError returned by Stage 2.
 *
 *  4. AI CONVERSION (LiteLLM via convertDocx)
 *     The core of this route. Runs after auth, storage, and job creation.
 *     Two-stage pipeline: mammoth extracts HTML → Stage 1 AI converts it →
 *     Stage 2 AI validates and returns AccessibilityError[].
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Request:  multipart/form-data  { file: <.docx binary> }
 * Response: application/json
 *   {
 *     jobId:               string               — conversion_jobs.id (UUID)
 *     html:                string               — accessible Canvas HTML
 *     errors:              AccessibilityError[] — structured issues for the UI
 *     model:               string
 *     tokensUsed:          number
 *     extractionWarnings:  string[]
 *   }
 *
 * Frontend usage:
 *   const form = new FormData()
 *   form.append("file", docxFile)
 *   const res = await fetch("/api/convert", { method: "POST", body: form })
 *   const data = await res.json()
 */

import { NextRequest, NextResponse } from "next/server"
import { convertDocx } from "@/lib/convert"

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

export async function POST(req: NextRequest) {

  // ── INTERACTION POINT 1: AUTH ─────────────────────────────────────────────
  // Verify BuckeyePass SSO session. Look up or create the user in the
  // PostgreSQL `users` table and extract their UUID. Reject with 401 if invalid.
  const userId = "unauthenticated" // placeholder until auth is wired up

  // ── Parse multipart form ──────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Expected multipart/form-data." },
      { status: 400 }
    )
  }

  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided. Include a .docx file as the 'file' field." },
      { status: 400 }
    )
  }

  const filename = file.name

  if (!filename.toLowerCase().endsWith(".docx")) {
    return NextResponse.json(
      { error: "Invalid file type. Only .docx files are supported." },
      { status: 415 }
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` },
      { status: 413 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // ── INTERACTION POINT 2: FILE STORAGE + documents + artifacts ────────────
  // Upload the .docx buffer to S3/MinIO and receive a storage key.
  // Insert a `documents` row with file metadata (filename, size, checksum).
  // Insert an `artifacts` row (artifact_type: source_docx) with the storage key.
  const s3Key = `pending/${Date.now()}_${filename}` // placeholder until storage is wired up

  // ── INTERACTION POINT 3a: JOB TRACKING — create conversion_jobs row ───────
  // Insert a `conversion_jobs` row linked to the document, with status "processing".
  // This makes the job visible in the admin board before conversion completes.
  const jobId = `job_${Date.now()}` // placeholder — will be a UUID from PostgreSQL

  console.log(`[api/convert] job=${jobId} user=${userId} file=${filename}`)

  // ── INTERACTION POINT 4: AI CONVERSION ───────────────────────────────────
  // Two-stage pipeline: Stage 1 converts the DOCX to accessible HTML,
  // Stage 2 validates it and returns structured AccessibilityError[].
  const result = await convertDocx(buffer, filename)

  // ── INTERACTION POINT 3b: JOB TRACKING — update conversion_jobs row ───────
  // Update conversion_jobs status to "completed" or "failed".
  // On success: insert an artifacts row (artifact_type: html_output) with the HTML
  // storage key, and insert one validation_findings row per AccessibilityError.

  if ("error" in result) {
    console.error(`[api/convert] job=${jobId} failed: ${result.error}`)
    return NextResponse.json(
      { error: result.error, detail: result.detail, jobId },
      { status: 500 }
    )
  }

  console.log(
    `[api/convert] job=${jobId} completed. errors=${result.errors.length} tokens=${result.tokensUsed}`
  )

  return NextResponse.json({
    jobId,
    html: result.html,
    errors: result.errors,
    model: result.model,
    tokensUsed: result.tokensUsed,
    extractionWarnings: result.extractionWarnings,
  })
}
