import { Download, Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchChatAttachmentBlob } from "@/services/internalChatApi";

const PREVIEW_ZOOM_MIN = 0.5;
const PREVIEW_ZOOM_MAX = 5;
const PREVIEW_ZOOM_STEP = 0.25;

function clampPreviewZoom(z: number): number {
  return Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, Math.round(z * 1000) / 1000));
}

/** Raster / common raster images OK for `<img>`; exclude SVG/XML for safer rendering. */
export function isInlinePreviewImageMime(mime: string): boolean {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!m.startsWith("image/")) return false;
  if (m === "image/svg+xml") return false;
  return true;
}

type ChatAttachmentImageProps = {
  orgId: string;
  fileId: string;
  filename: string;
  mimeType: string;
  compact?: boolean;
  isMine?: boolean;
  onDownload?: (fileId: string, filename: string) => void;
};

export function ChatAttachmentImage({
  orgId,
  fileId,
  filename,
  mimeType,
  compact,
  isMine,
  onDownload,
}: ChatAttachmentImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || inView) return;
    const ob = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) setInView(true);
      },
      { rootMargin: "160px", threshold: 0.05 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView || !orgId || !fileId || loadFailed) return;
    let cancelled = false;

    fetchChatAttachmentBlob(orgId, fileId)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(() => setLoadFailed(true));

    return () => {
      cancelled = true;
    };
  }, [inView, orgId, fileId, loadFailed]);

  useEffect(
    () => () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
    [blobUrl],
  );

  const openPreview = useCallback(() => setPreviewOpen(true), []);

  useEffect(() => {
    if (previewOpen) setPreviewZoom(1);
  }, [previewOpen]);

  const onPreviewWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -PREVIEW_ZOOM_STEP : PREVIEW_ZOOM_STEP;
    setPreviewZoom((z) => clampPreviewZoom(z + delta));
  }, []);

  if (loadFailed) {
    return (
      <button
        type="button"
        disabled={!onDownload}
        onClick={() => onDownload?.(fileId, filename)}
        className={cn(
          "mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs underline-offset-2 hover:underline disabled:opacity-70",
          isMine ? "bg-primary-foreground/10" : "bg-secondary",
        )}
      >
        <span className="font-medium truncate">{filename}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">Download</span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="mt-1 space-y-1">
      {!blobUrl ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-4 text-xs text-muted-foreground",
            isMine ? "bg-primary-foreground/10" : "bg-secondary",
          )}
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Loading preview…</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPreview}
          className={cn(
            "group relative flex w-full cursor-zoom-in overflow-hidden rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
            isMine ? "ring-offset-primary" : "ring-offset-background",
          )}
          aria-label={`Open full-size preview of ${filename}`}
        >
          <img
            src={blobUrl}
            alt={filename}
            className={cn(
              "h-auto w-full bg-black/20 object-contain",
              compact ? "max-h-[7rem]" : "max-h-48",
            )}
            draggable={false}
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-2 pt-6 text-left text-[10px] font-medium text-white opacity-95">
            Click for full preview
          </span>
        </button>
      )}

      <div className={cn("flex flex-wrap gap-2 pt-1", compact && "justify-end")}>
        <Button type="button" variant="outline" size="sm" disabled={!onDownload} className="h-8 gap-1.5 px-2 text-xs" onClick={() => onDownload?.(fileId, filename)}>
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[92vh] max-w-[min(94vw,64rem)] flex-col gap-0 overflow-hidden border-border bg-card p-0 sm:rounded-xl">
          <DialogHeader className="gap-1 border-b border-border px-4 pb-3 pt-4">
            <DialogTitle className="truncate text-left text-sm font-medium">{filename}</DialogTitle>
            <p className="text-xs text-muted-foreground">{mimeType}</p>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/25 px-3 py-2">
            <p className="max-sm:hidden text-[11px] text-muted-foreground">
              Ctrl + wheel (Windows/Linux) or ⌘ + pinch/scroll — zoom viewer
            </p>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-1 sm:flex-nowrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                aria-label="Zoom out"
                onClick={() => setPreviewZoom((z) => clampPreviewZoom(z - PREVIEW_ZOOM_STEP))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-[3.5rem] shrink-0 text-center font-mono text-xs tabular-nums">{Math.round(previewZoom * 100)}%</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                aria-label="Zoom in"
                onClick={() => setPreviewZoom((z) => clampPreviewZoom(z + PREVIEW_ZOOM_STEP))}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => setPreviewZoom(1)}>
                <RotateCcw className="h-3.5 w-3.5" />
                100%
              </Button>
            </div>
          </div>
          <div
            className="relative flex flex-1 min-h-[220px] max-h-[calc(92vh-11rem)] w-full overflow-auto bg-black/90 p-3"
            onWheel={onPreviewWheel}
          >
            <div className="mx-auto flex min-h-full min-w-min items-start justify-center">
              {blobUrl ? (
                <img
                  src={blobUrl}
                  alt=""
                  draggable={false}
                  className="h-auto shrink-0 select-none rounded-md shadow-md"
                  style={{
                    width: `${previewZoom * 100}%`,
                    maxWidth: previewZoom <= 1 ? "100%" : "none",
                    objectFit: "contain",
                    ...(previewZoom <= 1
                      ? { maxHeight: "calc(92vh - 14rem)" as const }
                      : {}),
                  }}
                />
              ) : (
                <Loader2 className="h-10 w-10 shrink-0 animate-spin text-primary-foreground" />
              )}
            </div>
          </div>
          <DialogFooter className="justify-end gap-2 border-t border-border px-4 py-3 sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
            <Button type="button" variant="secondary" size="sm" disabled={!onDownload} className="gap-1.5" onClick={() => onDownload?.(fileId, filename)}>
              <Download className="h-4 w-4" />
              Download original
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
