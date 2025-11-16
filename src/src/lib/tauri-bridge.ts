type InvokeFn = typeof import("@tauri-apps/api/core").invoke;

const TAURI_MARKERS = ["__TAURI_INTERNALS__", "__TAURI_IPC__"] as const;

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __TAURI_IPC__?: unknown;
  }
}

let cachedInvoke: InvokeFn | null = null;

export const isTauriRuntime = () => {
  if (typeof window === "undefined") return false;
  return TAURI_MARKERS.some((marker) => marker in window);
};

async function getInvoke(): Promise<InvokeFn> {
  if (!cachedInvoke) {
    const mod = await import("@tauri-apps/api/core");
    cachedInvoke = mod.invoke;
  }
  return cachedInvoke;
}

export async function invokeTauri<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    throw new Error("Tauri runtime is not available in this environment.");
  }
  const invoke = await getInvoke();
  return invoke<T>(command, args);
}
