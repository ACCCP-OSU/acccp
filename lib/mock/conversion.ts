import type { ConversionStatus, UploadedDocument } from "@/lib/types/document";

export const MOCK_ERROR_RATE = 0.15;

const MOCK_ERRORS = [
  "Unable to extract readable content from the document.",
  "Conversion timed out while processing document structure.",
  "The document contains unsupported formatting that could not be converted.",
];

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatUploadTime(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function generateMockHtml(filename: string): string {
  const title = filename.replace(/\.docx$/i, "");
  return `<section>
  <h2>${title}</h2>
  <p>This is mock accessible HTML generated for <strong>${filename}</strong>.</p>
  <ul>
    <li>Semantic heading structure</li>
    <li>Descriptive link text</li>
    <li>Canvas-ready markup</li>
  </ul>
</section>`;
}

export interface MockConversionResult {
  status: "success" | "error";
  html?: string;
  errorMessage?: string;
}

export interface MockConversionHandle {
  promise: Promise<MockConversionResult>;
  cancel: () => void;
}

export function runMockConversion(
  doc: UploadedDocument,
  onStatusChange: (status: ConversionStatus) => void,
): MockConversionHandle {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  const schedule = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timers.push(id);
  };

  const promise = new Promise<MockConversionResult>((resolve) => {
    onStatusChange("queued");

    schedule(() => {
      if (cancelled) return;
      onStatusChange("processing");
    }, 400);

    const processingDuration = 1500 + Math.random() * 1000;

    schedule(() => {
      if (cancelled) return;

      const failed = Math.random() < MOCK_ERROR_RATE;
      if (failed) {
        const errorMessage =
          MOCK_ERRORS[Math.floor(Math.random() * MOCK_ERRORS.length)];
        onStatusChange("error");
        resolve({ status: "error", errorMessage });
        return;
      }

      onStatusChange("success");
      resolve({
        status: "success",
        html: generateMockHtml(doc.name),
      });
    }, 400 + processingDuration);
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    },
  };
}
