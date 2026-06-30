# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## AI conversion pipeline

The DOCX → Canvas HTML conversion pipeline lives in `lib/convert.ts` and is exposed via `POST /api/convert`.

### Setup

Copy `.env.example` to `.env` and fill in your LiteLLM credentials:

```
LITELLM_BASE_URL=https://litellm.cloud.osu.edu
LITELLM_API_KEY=your-key-here
LITELLM_MODEL=gpt-5.4-nano-2026-03-17
```

### API

**POST /api/convert**

Accepts a `.docx` file as `multipart/form-data` and returns accessible Canvas HTML plus structured accessibility errors.

```ts
const form = new FormData()
form.append("file", docxFile)
const res = await fetch("/api/convert", { method: "POST", body: form })
const { html, errors, tokensUsed } = await res.json()
```

### Local testing (without the full app)

```bash
set -a && source .env && set +a
npx tsx lib/convert.ts path/to/file.docx
```
