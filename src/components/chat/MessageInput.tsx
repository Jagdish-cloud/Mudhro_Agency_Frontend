import { useCallback, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";


export type ChatMessageInputProps = {
  disabled?: boolean;
  onTyping: (isTyping: boolean) => void;
  onSendText: (text: string, clientMessageId: string) => Promise<void>;
  fileSlot?: ReactNode;
};

export function ChatMessageInput({ disabled, onTyping, onSendText, fileSlot }: ChatMessageInputProps) {
  const [text, setText] = useState("");

  const flushTyping = useCallback(() => {
    onTyping(false);
  }, [onTyping]);

  const submit = async () => {
    const t = text.trim();
    if (!t || disabled) return;
    const clientMessageId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    await onSendText(t, clientMessageId);
    setText("");
    flushTyping();
  };

  return (
    <div className="space-y-2 border-t border-border bg-background/80 px-3 py-2 backdrop-blur">
      <div className="flex items-end gap-2">
        {fileSlot ?? null}
        <Textarea
          placeholder="Write a message…"
          disabled={disabled}
          value={text}
          rows={2}
          onChange={(e) => {
            setText(e.target.value);
            onTyping(true);
          }}
          onBlur={() => flushTyping()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          className="min-h-11 resize-none"
        />
        <Button size="sm" variant="success" disabled={disabled || !text.trim()} type="button" onClick={() => void submit()}>
          Send
        </Button>
      </div>
    </div>
  );
}
