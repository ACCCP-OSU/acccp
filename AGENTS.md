<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## shadcn / UI structure

- UI primitives live in `components/ui/`. Add new ones via `npx shadcn@latest add <name>`.
- Primitives use `@base-ui/react`, `cn()` from `lib/utils.ts`, semantic design tokens from `app/globals.css`, and Lucide icons.
- App composites (`application-usage`, `dashboard-sidebar`, `document-workspace`, etc.) import sibling UI with `./`; pages and layouts use `@/components/ui/...`.
- Config: `components.json` — style `base-rhea`, CSS variables, Lucide icon library.
- Theme: forced light mode in `app/layout.tsx` (`ThemeProvider forcedTheme="light"`) to match Canvas.

### Installed primitives

accordion, badge, breadcrumb, button, card, dialog, dropdown-menu, field, input, label, separator, sheet, sidebar, skeleton, table, tooltip

### App composites (hand-written on top of primitives)

`application-usage`, `dashboard-sidebar`, `document-table`, `document-workspace`, `conversion-result-dialog`, `file-upload`, `rename-dialog`, `session-button`

## Mock / demo conventions

- **Sessions and documents** are held in memory via `contexts/session-context.tsx` (`SessionProvider`). No persistence; refresh resets state.
- **Session switching** shows the document list for the selected session only. Sidebar session CRUD is wired through the same context.
- **Conversion demo** uses `lib/mock/conversion.ts` — simulates `queued → processing → success | error` with `setTimeout` and a configurable random error rate. Does not call `POST /api/convert`.
- **Document types** live in `lib/types/document.ts`. Field names (`html`, `errorMessage`) align with `lib/convert.ts` so the mock runner can be swapped for the real API later.
- **Real pipeline** (for future wiring): `lib/convert.ts` + `app/api/convert/route.ts`.
