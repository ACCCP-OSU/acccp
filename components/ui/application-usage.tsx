import { Button } from "./button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

export default function ApplicationUsage(): React.JSX.Element {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="lg" />}>
        Usage
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usage</DialogTitle>
          <DialogDescription>
            This application assists with the conversion of Microsoft Word
            documents to accessible Canvas content.
          </DialogDescription>
        </DialogHeader>
        <p className="font-medium">Follow the steps below to get started.</p>
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            Drop .docx files onto the upload dropzone or click to browse and
            queue documents for conversion.
          </li>
          <li>
            Click{" "}
            <strong className="font-medium text-foreground">Convert</strong> to
            start the conversion process.
          </li>
          <li>
            Once conversion completes, click a document name to view, copy, and
            download the converted HTML output.
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}
