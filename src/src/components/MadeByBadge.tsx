import { useCallback } from "react";
import { Github } from "lucide-react";
import { isTauriRuntime } from "@/lib/tauri-bridge";

const PROFILE_URL = "https://github.com/neptotech";

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
  const handleClick = useCallback(() => {
    void openProfile();
  }, []);

  return (
    <button
      type="button"
      aria-label="Open GitHub profile"
      onClick={handleClick}
      className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg transition hover:border-primary/60 hover:text-primary supports-[backdrop-filter]:backdrop-blur"
    >
      <Github className="h-4 w-4" aria-hidden="true" />
      <span className="text-left leading-tight">
        Made by <span className="text-foreground">@github/neptotech</span>
      </span>
    </button>
  );
}
