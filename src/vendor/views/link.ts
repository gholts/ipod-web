import type { Navigate } from "../view-types.js";
import { createLogger } from "../environment.js";
const linkLogger = createLogger("linkNavigation");
async function navigateWithHost(navigate: Navigate, url: string) {
  try {
    await navigate(url);
  } catch (error) {
    linkLogger.error(`Host navigation failed for "${url}"`, error);
  }
}
const linkNavigation = (
  anchor: HTMLAnchorElement,
  navigate: Navigate | undefined,
) => {
  let currentNavigate = navigate;
  function handleClick(event: MouseEvent) {
    const modifiedClick =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!(
      !currentNavigate ||
      event.defaultPrevented ||
      event.button !== 0 ||
      modifiedClick
    )) {
      event.preventDefault();
      navigateWithHost(currentNavigate, anchor.href);
    }
  }
  anchor.addEventListener("click", handleClick);
  return {
    update(nextContext: Navigate | undefined) {
      currentNavigate = nextContext;
    },
    destroy() {
      anchor.removeEventListener("click", handleClick);
    },
  };
};
export { linkNavigation };
