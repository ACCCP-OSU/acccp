"use client";

import { useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

function isDocxFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export default function FileUpload({
  onFilesSelected,
  disabled = false,
}: FileUploadProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rejectHint, setRejectHint] = useState<string | null>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return;

    const accepted = Array.from(fileList).filter(isDocxFile);
    const rejected = fileList.length - accepted.length;

    if (rejected > 0) {
      setRejectHint("Only .docx files are supported.");
      setTimeout(() => setRejectHint(null), 3000);
    }

    if (accepted.length > 0) {
      onFilesSelected(accepted);
    }
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed p-8 transition-colors",
          disabled && "pointer-events-none opacity-50",
          isDragging
            ? "border-primary bg-muted/50"
            : "hover:bg-muted",
        )}
      >
        <Upload className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drop .docx files here or click to browse</p>
        <p className="text-xs text-muted-foreground">
          Microsoft Word documents only
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {rejectHint && (
        <p className="text-sm text-destructive">{rejectHint}</p>
      )}
    </div>
  );
}
