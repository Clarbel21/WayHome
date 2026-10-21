import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
// Hash routes do not reload the document. Reveal each destination instead of
// leaving the user at the old button's scroll position below its page heading.
export function RouteFocus() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const heading = document.querySelector<HTMLElement>("main h1, main h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }, [pathname]);
  return null;
}
