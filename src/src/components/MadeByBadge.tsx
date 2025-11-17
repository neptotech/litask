import { useCallback, useEffect, useRef, useState } from "react";
import { Github } from "lucide-react";
import { isTauriRuntime } from "@/lib/tauri-bridge";
import { cn } from "@/lib/utils";

const PROFILE_URL = "https://github.com/neptotech";
const IDLE_HIDE_DELAY = 2400; // ms to wait after last pointer move before hiding

async function openProfile() {
  if (isTauriRuntime()) {
    try {
      const { open } = await import("@tauri-apps/plugin-opener");
      await open(PROFILE_URL);
      return;
    } catch (error) {
      console.error("Failed to open profile via Tauri opener", error);
    }
  }
  window.open(PROFILE_URL, "_blank", "noopener,noreferrer");
}

export function MadeByBadge() {
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, IDLE_HIDE_DELAY);
  }, []);

  const revealBadge = useCallback(() => {
    setIsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    const handlePointerMove = () => {
      revealBadge();
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchstart", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchstart", handlePointerMove);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [revealBadge]);

  const handleClick = useCallback(() => {
    void openProfile();
  }, []);

  const handleFocus = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsVisible(true);
  }, []);

  const handleBlur = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  return (
    <button
      type="button"
      aria-label="Open GitHub profile"
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        "pointer-events-none fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg transition duration-500 hover:border-primary/60 hover:text-primary supports-[backdrop-filter]:backdrop-blur",
        isVisible
          ? "pointer-events-auto opacity-100 translate-y-0"
          : "opacity-0 translate-y-2"
      )}
    >
      <Github className="h-4 w-4" aria-hidden="true" />
      <span className="text-left leading-tight">
        Made by <span className="text-foreground">@github/neptotech</span>
      </span>
    </button>
  );
}
