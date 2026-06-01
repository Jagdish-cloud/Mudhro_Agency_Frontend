import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MessageCircle, Minimize2, SendHorizontal, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEventHandler,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useInternalChatSocket } from "@/context/internal-chat-socket-context";
import { getCurrentOrganizationId, getStoredAdminInfo } from "@/lib/agencyAuth";
import { cn } from "@/lib/utils";
import { ChatAttachmentImage, isInlinePreviewImageMime } from "@/components/chat/ChatAttachmentImage";
import {
  fetchChatList,
  fetchChatMessages,
  sendChatMessage,
  downloadChatAttachment,
} from "@/services/internalChatApi";

type AgencyChatDockProps = {
  isOpen: boolean;
  onToggle: () => void;
};

const CHAT_DOCK_POSITION_KEY = "mudhro_agency_chat_dock_position";
const CHAT_DOCK_SIZE_KEY = "mudhro_agency_chat_dock_size";
const CHAT_DOCK_MODAL_POS_KEY = "mudhro_agency_chat_modal_position";
/** ~22rem × 28rem at 16px root */
const DEFAULT_DOCK_WIDTH = 352;
const DEFAULT_DOCK_HEIGHT = 448;
const MIN_DOCK_DIMENSION = 260;
const FULLSCREEN_THRESHOLD = 0.75;

const HOLD_TO_DRAG_MS = 180;
const BUTTON_SIZE = 48;
const VIEWPORT_PADDING = 16;
const MODAL_GAP = 12;

type ChatDockPosition = { x: number; y: number };
type DockSize = { width: number; height: number };
type ModalPlacement = {
  left: number;
  top: number;
  horizontal: "left" | "right";
  vertical: "up" | "down";
};

function getViewportMaxDock(): DockSize {
  if (typeof window === "undefined") return { width: DEFAULT_DOCK_WIDTH, height: DEFAULT_DOCK_HEIGHT };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxUseW = vw - VIEWPORT_PADDING * 2;
  const maxUseH = vh - VIEWPORT_PADDING * 2;
  return {
    width: Math.max(MIN_DOCK_DIMENSION, maxUseW),
    height: Math.max(MIN_DOCK_DIMENSION, maxUseH),
  };
}

function clampDockDimensions(width: number, height: number): DockSize {
  const max = getViewportMaxDock();
  return {
    width: clampValue(width, MIN_DOCK_DIMENSION, max.width),
    height: clampValue(height, MIN_DOCK_DIMENSION, max.height),
  };
}

/** True when resizing past threshold should animate to fullscreen. */
function crossesFullscreenThreshold(width: number, height: number): boolean {
  if (typeof window === "undefined") return false;
  return (
    width > window.innerWidth * FULLSCREEN_THRESHOLD || height > window.innerHeight * FULLSCREEN_THRESHOLD
  );
}

function getDefaultPosition(): ChatDockPosition {
  if (typeof window === "undefined") return { x: 16, y: 16 };
  return {
    x: window.innerWidth - BUTTON_SIZE - VIEWPORT_PADDING,
    y: window.innerHeight - BUTTON_SIZE - VIEWPORT_PADDING,
  };
}

function clampPosition(position: ChatDockPosition): ChatDockPosition {
  if (typeof window === "undefined") return position;
  return {
    x: Math.min(Math.max(position.x, VIEWPORT_PADDING), window.innerWidth - BUTTON_SIZE - VIEWPORT_PADDING),
    y: Math.min(Math.max(position.y, VIEWPORT_PADDING), window.innerHeight - BUTTON_SIZE - VIEWPORT_PADDING),
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Windowed modal fixed `left/top` when user dragged the header away from auto FAB placement. */
type ModalPinnedPosition = { left: number; top: number };

function readStoredModalPin(): ModalPinnedPosition | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CHAT_DOCK_MODAL_POS_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { left?: number; top?: number };
    if (typeof p.left !== "number" || typeof p.top !== "number" || Number.isNaN(p.left) || Number.isNaN(p.top)) return null;
    return { left: p.left, top: p.top };
  } catch {
    return null;
  }
}

function clampModalPosition(left: number, top: number, modalWidth: number, modalHeight: number): ModalPinnedPosition {
  if (typeof window === "undefined") return { left, top };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    left: clampValue(left, VIEWPORT_PADDING, vw - modalWidth - VIEWPORT_PADDING),
    top: clampValue(top, VIEWPORT_PADDING, vh - modalHeight - VIEWPORT_PADDING),
  };
}

function headerDragTargetSkip(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("a,button,input,textarea,[role='button'],[role='link']"));
}

function readStoredDockSize(): DockSize | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CHAT_DOCK_SIZE_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { width?: number; height?: number };
    if (typeof p.width !== "number" || typeof p.height !== "number") return null;
    return clampDockDimensions(p.width, p.height);
  } catch {
    return null;
  }
}

function genClientMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `cm_${Date.now()}`;
}

function getInitialDockSize(): DockSize {
  const saved = typeof window !== "undefined" ? readStoredDockSize() : null;
  return saved ?? { width: DEFAULT_DOCK_WIDTH, height: DEFAULT_DOCK_HEIGHT };
}

export function AgencyChatDock({ isOpen, onToggle }: AgencyChatDockProps) {
  const orgId = getCurrentOrganizationId();
  const viewerId = getStoredAdminInfo()?.id ?? "";
  const qc = useQueryClient();
  const socketApi = useInternalChatSocket();

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dockSize, setDockSize] = useState<DockSize>(getInitialDockSize);

  const preFullscreenSizeRef = useRef<DockSize>(clampDockDimensions(DEFAULT_DOCK_WIDTH, DEFAULT_DOCK_HEIGHT));
  const dockSizeRef = useRef<DockSize>(getInitialDockSize());
  const [isResizingDock, setIsResizingDock] = useState(false);

  useEffect(() => {
    dockSizeRef.current = dockSize;
  }, [dockSize]);

  const listQuery = useQuery({
    queryKey: ["internal-chat", "dock-list", orgId],
    enabled: Boolean(orgId) && isOpen,
    queryFn: () => fetchChatList(orgId!, { limit: 20 }),
  });

  useEffect(() => {
    const first = listQuery.data?.items?.[0];
    if (!activeThreadId && first?.id) setActiveThreadId(first.id);
  }, [activeThreadId, listQuery.data?.items]);

  useEffect(() => {
    const s = socketApi.socket;
    if (!activeThreadId || !viewerId || !s) return;
    socketApi.joinChatRoom(activeThreadId);
    const onConnect = () => socketApi.joinChatRoom(activeThreadId);
    s.on("connect", onConnect);
    return () => {
      s.off("connect", onConnect);
      socketApi.leaveChatRoom(activeThreadId);
    };
  }, [activeThreadId, socketApi, viewerId]);

  const messagesQuery = useQuery({
    queryKey: ["internal-chat", "dock-msgs", orgId, activeThreadId],
    enabled: Boolean(orgId && activeThreadId && isOpen),
    queryFn: async () => {
      const r = await fetchChatMessages(orgId!, activeThreadId!, { limit: 40 });
      return r.messages ?? [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => sendChatMessage(orgId!, body),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["internal-chat", "dock-msgs", orgId, vars.chatId] });
      void qc.invalidateQueries({ queryKey: ["internal-chat", "dock-list", orgId] });
      void qc.invalidateQueries({ queryKey: ["internal-chat", "list", orgId] });
    },
  });

  const threads = listQuery.data?.items ?? [];

  const activeMessages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  const [position, setPosition] = useState<ChatDockPosition>(() => {
    if (typeof window === "undefined") return { x: 16, y: 16 };
    const raw = localStorage.getItem(CHAT_DOCK_POSITION_KEY);
    if (!raw) return getDefaultPosition();
    try {
      return clampPosition(JSON.parse(raw) as ChatDockPosition);
    } catch {
      return getDefaultPosition();
    }
  });
  const [isDraggingLauncher, setIsDraggingLauncher] = useState(false);
  const [modalPinnedPosition, setModalPinnedPosition] = useState<ModalPinnedPosition | null>(() => {
    const pin = typeof window !== "undefined" ? readStoredModalPin() : null;
    if (!pin) return null;
    const size = getInitialDockSize();
    return clampModalPosition(pin.left, pin.top, size.width, size.height);
  });
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const [modalPlacement, setModalPlacement] = useState<ModalPlacement>({
    left: VIEWPORT_PADDING,
    top: VIEWPORT_PADDING,
    horizontal: "left",
    vertical: "up",
  });
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  /** Pointer-down snapshot for dragging the windowed modal by its header (viewport coords). */
  const modalDragRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startFabX: number;
    startFabY: number;
  } | null>(null);
  /** Latest FAB position ref for deriving movement deltas during launcher drag without stale closures. */
  const launcherFabRef = useRef<ChatDockPosition>({ x: 0, y: 0 });
  const modalPinnedRef = useRef<ModalPinnedPosition | null>(modalPinnedPosition);
  const isPointerDownRef = useRef(false);
  const holdTimerRef = useRef<number | null>(null);
  const shouldSkipClickRef = useRef(false);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });

  useLayoutEffect(() => {
    launcherFabRef.current = position;
  }, [position]);

  useLayoutEffect(() => {
    modalPinnedRef.current = modalPinnedPosition;
  }, [modalPinnedPosition]);

  useEffect(() => {
    localStorage.setItem(CHAT_DOCK_POSITION_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (!isFullscreen) {
      localStorage.setItem(CHAT_DOCK_SIZE_KEY, JSON.stringify(dockSize));
    }
  }, [dockSize, isFullscreen]);

  useEffect(() => {
    if (modalPinnedPosition === null) {
      localStorage.removeItem(CHAT_DOCK_MODAL_POS_KEY);
      return;
    }
    localStorage.setItem(CHAT_DOCK_MODAL_POS_KEY, JSON.stringify(modalPinnedPosition));
  }, [modalPinnedPosition]);

  useEffect(() => {
    if (!isOpen) setIsFullscreen(false);
  }, [isOpen]);

  const exitFullscreen = useCallback(() => {
    const r = clampDockDimensions(preFullscreenSizeRef.current.width, preFullscreenSizeRef.current.height);
    setDockSize(r);
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    const onResizeViewport = () => {
      setPosition((prev) => clampPosition(prev));
      if (!isFullscreen) {
        setDockSize((prev) => clampDockDimensions(prev.width, prev.height));
        setModalPinnedPosition((prev) => {
          if (!prev || isFullscreen) return prev;
          const { width, height } = dockSizeRef.current;
          return clampModalPosition(prev.left, prev.top, width, height);
        });
      }
    };
    window.addEventListener("resize", onResizeViewport);
    return () => window.removeEventListener("resize", onResizeViewport);
  }, [isFullscreen]);

  /** After leaving fullscreen (or fullscreen disabled), reclamp persisted pin to current viewport and dock size. */
  useEffect(() => {
    if (isFullscreen) return;
    setModalPinnedPosition((prev) => {
      if (!prev) return prev;
      const { width, height } = dockSizeRef.current;
      return clampModalPosition(prev.left, prev.top, width, height);
    });
  }, [isFullscreen]);

  useEffect(() => {
    if (!modalPinnedPosition || isFullscreen) return;
    const { width, height } = dockSize;
    setModalPinnedPosition((prev) =>
      prev ? clampModalPosition(prev.left, prev.top, width, height) : prev,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reclamp when dimensions change while pinned
  }, [dockSize.width, dockSize.height]);

  useLayoutEffect(() => {
    if (!isOpen || isFullscreen || modalPinnedPosition !== null) return;
    const raf = window.requestAnimationFrame(() => {
      const buttonRect = launcherRef.current?.getBoundingClientRect();
      const modalElement = modalRef.current;
      if (!buttonRect || !modalElement) return;

      const modalWidth = modalElement.offsetWidth;
      const modalHeight = modalElement.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const spaces = {
        left: buttonRect.left,
        right: viewportWidth - buttonRect.right,
        top: buttonRect.top,
        bottom: viewportHeight - buttonRect.bottom,
      };

      const horizontal: ModalPlacement["horizontal"] =
        spaces.right >= modalWidth + VIEWPORT_PADDING
          ? "right"
          : spaces.left >= modalWidth + VIEWPORT_PADDING
            ? "left"
            : spaces.right >= spaces.left
              ? "right"
              : "left";

      const vertical: ModalPlacement["vertical"] =
        spaces.bottom >= modalHeight + VIEWPORT_PADDING
          ? "down"
          : spaces.top >= modalHeight + VIEWPORT_PADDING
            ? "up"
            : spaces.bottom >= spaces.top
              ? "down"
              : "up";

      const preferredLeft =
        horizontal === "right" ? buttonRect.right + MODAL_GAP : buttonRect.left - modalWidth - MODAL_GAP;
      const preferredTop =
        vertical === "down" ? buttonRect.bottom + MODAL_GAP : buttonRect.top - modalHeight - MODAL_GAP;

      const left = clampValue(preferredLeft, VIEWPORT_PADDING, viewportWidth - modalWidth - VIEWPORT_PADDING);
      const top = clampValue(preferredTop, VIEWPORT_PADDING, viewportHeight - modalHeight - VIEWPORT_PADDING);

      setModalPlacement({ left, top, horizontal, vertical });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, position.x, position.y, isFullscreen, dockSize.width, dockSize.height, modalPinnedPosition]);

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const onLauncherPointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
    isPointerDownRef.current = true;
    pointerOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
    shouldSkipClickRef.current = false;
    holdTimerRef.current = window.setTimeout(() => {
      if (!isPointerDownRef.current) {
        return;
      }
      setIsDraggingLauncher(true);
      shouldSkipClickRef.current = true;
      try {
        launcherRef.current?.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }, HOLD_TO_DRAG_MS);
  };

  const onLauncherPointerMove: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (!isDraggingLauncher || isFullscreen || !isOpen) return;
    const prevFab = launcherFabRef.current;
    const desiredNextFab = clampPosition({
      x: event.clientX - pointerOffsetRef.current.x,
      y: event.clientY - pointerOffsetRef.current.y,
    });
    const dx = desiredNextFab.x - prevFab.x;
    const dy = desiredNextFab.y - prevFab.y;
    const pin = modalPinnedRef.current;
    if ((dx !== 0 || dy !== 0) && pin !== null && !isFullscreen) {
      const { width, height } = dockSizeRef.current;
      const modalNext = clampModalPosition(pin.left + dx, pin.top + dy, width, height);
      const effDx = modalNext.left - pin.left;
      const effDy = modalNext.top - pin.top;
      const syncedFab = clampPosition({ x: prevFab.x + effDx, y: prevFab.y + effDy });
      launcherFabRef.current = syncedFab;
      modalPinnedRef.current = modalNext;
      setPosition(syncedFab);
      setModalPinnedPosition(modalNext);
      return;
    }
    launcherFabRef.current = desiredNextFab;
    setPosition(desiredNextFab);
  };

  const onLauncherPointerUpInner = (releaseCapture: boolean, eventPointerId: number | undefined) => {
    isPointerDownRef.current = false;
    clearHoldTimer();
    if (!isDraggingLauncher) return;
    setIsDraggingLauncher(false);
    if (releaseCapture && eventPointerId !== undefined && launcherRef.current) {
      try {
        launcherRef.current.releasePointerCapture(eventPointerId);
      } catch {
        // ignore
      }
    }
  };

  const onLauncherPointerUp: PointerEventHandler<HTMLButtonElement> = (event) => {
    onLauncherPointerUpInner(true, event.pointerId);
  };

  const onLauncherPointerCancel: PointerEventHandler<HTMLButtonElement> = (event) => {
    onLauncherPointerUpInner(true, event.pointerId);
  };

  const onHeaderPointerDown: PointerEventHandler<HTMLElement> = (event) => {
    if (!isOpen || isFullscreen || event.button !== 0) return;
    if (headerDragTargetSkip(event.target)) return;
    const modal = modalRef.current;
    if (!modal) return;
    const rect = modal.getBoundingClientRect();
    modalDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startFabX: position.x,
      startFabY: position.y,
    };
    setIsDraggingModal(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const onHeaderPointerMove: PointerEventHandler<HTMLElement> = (event) => {
    if (!isDraggingModal || !modalDragRef.current || isFullscreen || !isOpen) return;
    const start = modalDragRef.current;
    const deltaX = event.clientX - start.startX;
    const deltaY = event.clientY - start.startY;
    const { width, height } = dockSizeRef.current;
    const modalNext = clampModalPosition(start.startLeft + deltaX, start.startTop + deltaY, width, height);
    const effDx = modalNext.left - start.startLeft;
    const effDy = modalNext.top - start.startTop;
    const syncedFab = clampPosition({
      x: start.startFabX + effDx,
      y: start.startFabY + effDy,
    });
    modalPinnedRef.current = modalNext;
    launcherFabRef.current = syncedFab;
    setModalPinnedPosition(modalNext);
    setPosition(syncedFab);
  };

  const onHeaderPointerUp: PointerEventHandler<HTMLElement> = (event) => {
    if (!isDraggingModal) return;
    modalDragRef.current = null;
    setIsDraggingModal(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const onLauncherClick = () => {
    if (shouldSkipClickRef.current) {
      shouldSkipClickRef.current = false;
      return;
    }
    if (isFullscreen) {
      exitFullscreen();
      return;
    }
    onToggle();
  };

  const onResizeCornerPointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (!isOpen || isFullscreen) return;
    event.preventDefault();
    event.stopPropagation();
    setIsResizingDock(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const onResizeCornerPointerMove: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (!isResizingDock) return;
    const prev = dockSizeRef.current;
    const next = clampDockDimensions(prev.width + event.movementX, prev.height + event.movementY);

    if (crossesFullscreenThreshold(next.width, next.height)) {
      preFullscreenSizeRef.current = { ...prev };
      setIsFullscreen(true);
      setIsResizingDock(false);
      dockSizeRef.current = prev;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    dockSizeRef.current = next;
    setDockSize(next);
  };

  const onResizeCornerPointerUp: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (!isResizingDock) return;
    setIsResizingDock(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const sendDraft = useCallback(async () => {
    if (!draft.trim() || !orgId || !activeThreadId || !viewerId) return;
    await sendMutation.mutateAsync({
      chatId: activeThreadId,
      messageType: "text",
      bodyText: draft.trim(),
      clientMessageId: genClientMessageId(),
    });
    setDraft("");
    socketApi.emitTyping(activeThreadId, false);
  }, [activeThreadId, draft, orgId, sendMutation, socketApi, viewerId]);

  if (!orgId) return null;

  const transitionPanelWhileIdle =
    "motion-safe:transition-[inset,width,height,left,top,max-width,max-height,border-radius,box-shadow] motion-safe:duration-[280ms] motion-safe:ease-out motion-reduce:transition-none motion-reduce:duration-0";

  const modalShellClass = cn(
    "fixed flex min-h-0 flex-col overflow-hidden border border-border bg-card shadow-2xl",
    isDraggingModal ? "motion-reduce:transition-none" : transitionPanelWhileIdle,
    isOpen ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0 motion-reduce:translate-y-0",
    isFullscreen && isOpen
      ? "inset-0 z-[50] max-h-none max-w-none rounded-none md:rounded-none"
      : "z-[40] rounded-2xl",
  );

  const windowedEffectiveLeft = modalPinnedPosition?.left ?? modalPlacement.left;
  const windowedEffectiveTop = modalPinnedPosition?.top ?? modalPlacement.top;
  const windowedTransformOrigin = modalPinnedPosition
    ? "center center"
    : `${modalPlacement.horizontal === "right" ? "left" : "right"} ${modalPlacement.vertical === "down" ? "top" : "bottom"}`;

  const modalPositionStyle =
    isFullscreen && isOpen
      ? { left: 0, top: 0, right: 0, bottom: 0, width: "100%", height: "100%" }
      : {
          left: windowedEffectiveLeft,
          top: windowedEffectiveTop,
          width: dockSize.width,
          height: dockSize.height,
          transformOrigin: windowedTransformOrigin,
        };

  return (
    <>
      <div
        ref={modalRef}
        className={modalShellClass}
        style={modalPositionStyle}
        aria-hidden={!isOpen}
      >
        {!isFullscreen && isOpen ? (
          <button
            type="button"
            aria-label="Resize chat"
            className="pointer-events-auto absolute bottom-0 right-0 z-[1] h-9 w-9 cursor-nwse-resize touch-none border-none bg-transparent p-0"
            onPointerDown={onResizeCornerPointerDown}
            onPointerMove={onResizeCornerPointerMove}
            onPointerUp={onResizeCornerPointerUp}
            onPointerCancel={onResizeCornerPointerUp}
          >
            <span className="pointer-events-none absolute bottom-1 right-1 block h-3 w-3 rounded-br-lg border-r-2 border-b-2 border-muted-foreground/50" aria-hidden />
          </button>
        ) : null}

        <header
          className={cn(
            "relative flex shrink-0 cursor-grab touch-none items-start justify-between gap-2 border-b border-border px-3 py-2.5 select-none md:px-4 md:py-3",
            isDraggingModal && "cursor-grabbing",
          )}
          onPointerDown={isFullscreen ? undefined : onHeaderPointerDown}
          onPointerMove={isFullscreen ? undefined : onHeaderPointerMove}
          onPointerUp={isFullscreen ? undefined : onHeaderPointerUp}
          onPointerCancel={isFullscreen ? undefined : onHeaderPointerUp}
        >
          <div className="min-w-0">
            <h3 className="text-xs font-semibold md:text-[13px]">Agency chat</h3>
            <p className="text-[11px] text-muted-foreground leading-snug md:text-xs">
              Quick replies —{" "}
              <Link to="/agency/chat" className="underline" onClick={onToggle}>
                open full desktop view
              </Link>
            </p>
          </div>
          {isFullscreen && isOpen ? (
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={exitFullscreen}>
              <Minimize2 className="h-4 w-4" aria-hidden />
              <span className="sr-only">Shrink chat dock</span>
            </Button>
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              "grid min-h-0 flex-1 overflow-hidden grid-rows-[minmax(0,1fr)]",
              isFullscreen
                ? "grid-cols-[minmax(8rem,10rem)_minmax(0,1fr)] sm:grid-cols-[minmax(9rem,12rem)_minmax(0,1fr)]"
                : "grid-cols-[8rem_minmax(0,1fr)] md:grid-cols-[9rem_minmax(0,1fr)]",
            )}
          >
          <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-border p-1.5 md:p-2">
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain">
              {listQuery.isFetching ? (
                <Spinner size="sm" className="mx-auto" />
              ) : threads.length === 0 ? (
                <p className="px-1 text-[10px] text-muted-foreground leading-relaxed md:text-[11px]">No chats yet.</p>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className={cn(
                      "w-full rounded-lg px-1.5 py-1 md:px-2 md:py-1.5 text-left text-[11px] leading-snug md:text-xs",
                      thread.id === activeThreadId ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary",
                    )}
                    onClick={() => setActiveThreadId(thread.id)}
                  >
                    <p className="truncate font-medium">{thread.title}</p>
                    <p className="text-[10px] md:text-[11px]">{thread.unreadCount} unread</p>
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div
              role="log"
              className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-y-contain px-2 py-2 md:space-y-2 md:px-3"
            >
              {messagesQuery.isLoading ? (
                <Spinner className="mx-auto mt-8" />
              ) : (
                activeMessages.map((msg) => {
                  const mine = msg.senderOrganizationUserId === viewerId;
                  const showImageThumb =
                    Boolean(orgId && msg.file && isInlinePreviewImageMime(msg.file.mimeType ?? ""));

                  return (
                    <div
                      key={msg.id}
                      className={cn("flex w-full shrink-0", mine ? "justify-end pl-8" : "justify-start pr-8")}
                    >
                      <div
                        className={cn(
                          "box-border min-w-0 w-fit max-w-[min(85%,20rem)] rounded-lg px-1.5 py-1 text-left text-[11px] leading-snug shadow-sm sm:max-w-[min(85%,24rem)] md:max-w-[min(85%,28rem)] md:px-2 md:text-xs",
                          mine ? "bg-primary text-primary-foreground" : "bg-secondary",
                        )}
                      >
                      {msg.bodyText ? <p className="whitespace-pre-wrap break-words">{msg.bodyText}</p> : null}
                      {showImageThumb ? (
                        <ChatAttachmentImage
                          orgId={orgId!}
                          fileId={msg.file!.id}
                          filename={msg.file!.originalName}
                          mimeType={msg.file!.mimeType}
                          compact
                          isMine={mine}
                          onDownload={(fid, fname) => void downloadChatAttachment(orgId!, fid, fname)}
                        />
                      ) : msg.file ? (
                        <button
                          type="button"
                          disabled={!orgId}
                          className={cn(
                            "mt-0.5 w-full truncate rounded px-1 py-0.5 text-left text-[10px] underline underline-offset-2 hover:opacity-90 md:text-[11px]",
                            mine ? "text-primary-foreground/95" : "text-foreground",
                          )}
                          onClick={() =>
                            msg.file?.id &&
                            orgId &&
                            void downloadChatAttachment(orgId, msg.file.id, msg.file.originalName)
                          }
                        >
                          📎 {msg.file.originalName}
                        </button>
                      ) : null}
                      <p
                        className={cn(
                          "mt-0.5 text-[9px] leading-normal md:text-[10px]",
                          mine ? "text-primary-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <footer className="shrink-0 border-t border-border p-1.5 md:p-2">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendDraft();
                    }
                  }}
                  className="text-xs md:text-sm"
                  placeholder="Send a message..."
                  disabled={!activeThreadId || sendMutation.isPending}
                  onFocus={() => activeThreadId && socketApi.emitTyping(activeThreadId, true)}
                  onBlur={() => activeThreadId && socketApi.emitTyping(activeThreadId, false)}
                />
                <Button
                  size="sm"
                  variant="success"
                  type="button"
                  onClick={() => void sendDraft()}
                  disabled={!draft.trim() || !activeThreadId || sendMutation.isPending}
                >
                  <SendHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              </div>
            </footer>
          </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed",
          isOpen && isFullscreen ? "z-[60]" : "z-[40]",
        )}
        style={{ left: position.x, top: position.y }}
      >
        <Button
          ref={launcherRef}
          variant="success"
          className={cn(
            "h-12 w-12 rounded-full shadow-lg touch-none",
            isDraggingLauncher ? "cursor-grabbing" : "cursor-grab",
          )}
          onClick={onLauncherClick}
          onPointerDown={onLauncherPointerDown}
          onPointerMove={onLauncherPointerMove}
          onPointerUp={onLauncherPointerUp}
          onPointerCancel={onLauncherPointerCancel}
          aria-label={isFullscreen ? "Shrink chat dock" : "Toggle chat dock"}
        >
          {isOpen && !isFullscreen ? <X className="h-5 w-5" /> : isFullscreen ? <Minimize2 className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </Button>
      </div>
    </>
  );
}
