import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { Button } from "@/components/ui/button";

export type SignaturePadHandle = {
  clear: () => void;
  toDataURL: () => string | null;
  isEmpty: () => boolean;
};

type SignaturePadProps = {
  className?: string;
  width?: number;
  height?: number;
  /** Called when ink is added or cleared so parents can read data after unmount. */
  onInkChange?: (dataUrl: string | null) => void;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { className, width = 480, height = 180, onInkChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return { canvas, ctx };
  }, []);

  const clearCanvasOnly = useCallback(() => {
    const pair = getCtx();
    if (!pair) return;
    const { canvas, ctx } = pair;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    hasInk.current = false;
  }, [getCtx]);

  const clear = useCallback(() => {
    clearCanvasOnly();
    onInkChange?.(null);
  }, [clearCanvasOnly, onInkChange]);

  useEffect(() => {
    clearCanvasOnly();
  }, [clearCanvasOnly, width, height]);

  useImperativeHandle(
    ref,
    () => ({
      clear,
      toDataURL: () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasInk.current) return null;
        try {
          return canvas.toDataURL("image/png");
        } catch {
          return null;
        }
      },
      isEmpty: () => !hasInk.current,
    }),
    [clear],
  );

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const pair = getCtx();
    if (!pair) return;
    drawing.current = true;
    const { ctx } = pair;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const pair = getCtx();
    if (!pair) return;
    const { ctx } = pair;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  };

  const end = () => {
    drawing.current = false;
    if (hasInk.current && canvasRef.current) {
      try {
        onInkChange?.(canvasRef.current.toDataURL("image/png"));
      } catch {
        onInkChange?.(null);
      }
    }
  };

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="touch-none cursor-crosshair rounded-md border border-input bg-white"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => {
          e.preventDefault();
          start(e);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          move(e);
        }}
        onTouchEnd={end}
      />
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => clear()}>
        Clear
      </Button>
    </div>
  );
});
