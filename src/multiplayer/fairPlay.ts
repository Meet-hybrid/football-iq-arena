import { useEffect } from "react";

export type FairPlaySignal = "tab_hidden" | "window_blur" | "copy" | "paste";

export function useFairPlayMonitor(enabled: boolean, onSignal: (signal: FairPlaySignal) => void) {
  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onSignal("tab_hidden");
    };
    const onBlur = () => onSignal("window_blur");
    const onCopy = () => onSignal("copy");
    const onPaste = () => onSignal("paste");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [enabled, onSignal]);
}
