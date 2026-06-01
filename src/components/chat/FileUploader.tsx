import { useRef, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { uploadChatAttachmentMultipart } from "@/services/internalChatApi";

type ChatFileUploaderProps = {
  orgId: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  onUploaded: (fileId: string) => void;
};

export function ChatFileUploader({ orgId, disabled, className, label = "Attach file", onUploaded }: ChatFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled || busy) return;
    setBusy(true);
    try {
      const done = await uploadChatAttachmentMultipart(orgId, file);
      onUploaded(done.fileId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => void onChange(e)}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip,.txt"
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={onPick}>
        {busy ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Uploading…
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}
