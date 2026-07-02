import { useEffect, useRef } from "react";

// Name of the window event the mobile FloatingActionButton dispatches. Each
// page registers a handler via useFabAction so the FAB opens that page's own
// add form, rather than the layout hard-coding a target per route.
export const FAB_EVENT = "fab:add";

// Subscribe the currently-mounted page to the FAB. Only one page is mounted at
// a time (router Outlet), so exactly one handler runs per FAB press. A ref keeps
// the latest handler without re-subscribing on every render.
export function useFabAction(handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = () => ref.current();
    window.addEventListener(FAB_EVENT, fn);
    return () => window.removeEventListener(FAB_EVENT, fn);
  }, []);
}
