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

export interface Session {
  id: number;
  name: string;
}
