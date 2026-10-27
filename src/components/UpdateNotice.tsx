import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

// GitHub Pages caches index.html for a few minutes and presentation tabs often stay
// open for hours. This checks whether a newer deployment exists and offers a refresh,
// so nobody demos an old build by accident. Production builds only.
const CHECK_EVERY_MS = 5 * 60 * 1000;

function currentEntry() {
  const script = document.querySelector<HTMLScriptElement>(
    'script[type="module"][src*="assets/index-"]',
  );
  return script?.src.match(/assets\/index-[^/]+\.js/)?.[0] ?? null;
}

export function UpdateNotice() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const mine = currentEntry();
    if (!mine) return;
    let stopped = false;
    const check = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`./index.html?v=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const latest = (await res.text()).match(
          /assets\/index-[^"']+\.js/,
        )?.[0];
        if (!stopped && latest && latest !== mine) setAvailable(true);
      } catch {
        /* offline or blocked: keep the current build */
      }
    };
    const first = setTimeout(check, 4000);
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => !document.hidden && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  if (!available || dismissed) return null;
  return (
    <div className="update-notice" role="status">
      <span>A newer version of WayHome is available.</span>
      <button
        type="button"
        className="update-refresh"
        onClick={() => window.location.reload()}
      >
        <RefreshCw size={15} aria-hidden="true" /> Refresh
      </button>
      <button
        type="button"
        className="update-dismiss"
        aria-label="Dismiss update notice"
        onClick={() => setDismissed(true)}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export const buildLabel = `build ${__WAYHOME_BUILD__} · ${new Date(
  __WAYHOME_BUILT_AT__,
).toLocaleDateString([], { day: "numeric", month: "short" })}`;
