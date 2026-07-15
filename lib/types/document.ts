export type ConversionStatus =
  | "idle"
  | "queued"
  | "processing"
  | "success"
  | "error";

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  status: ConversionStatus;
  locked: boolean;
  html?: string;
  errorMessage?: string;
}

/** Mirrors the columns of `sessions` that the dashboard UI needs. */
export interface Session {
  id: string;
  title: string;
}
