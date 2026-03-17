import { create } from "zustand";

export const STEPS = ["landing", "input", "analysis", "summary", "profile", "login"];

const STEP_TO_PATH = {
  landing: "/",
  input: "/analyze",
  analysis: "/analysis",
  summary: "/summary",
  profile: "/profile",
  login: "/login",
};

const PATH_TO_STEP = Object.fromEntries(
  Object.entries(STEP_TO_PATH).map(([step, path]) => [path, step]),
);

function pathToStep(pathname) {
  return PATH_TO_STEP[pathname] ?? "landing";
}

export const useLocationStore = create((set, get) => ({
  step: pathToStep(window.location.pathname),

  /**
   * Call once on app mount. Wires the popstate listener so browser
   * back / forward updates the in-app step. Returns a cleanup function.
   */
  init: () => {
    // Stamp the current history entry so popstate always has state
    const currentStep = get().step;
    window.history.replaceState({ step: currentStep }, "", window.location.pathname);

    const handlePopState = (event) => {
      const step = event.state?.step ?? pathToStep(window.location.pathname);
      set({ step });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  },

  /** Push a new entry onto the browser history stack and update step. */
  navigate: (step) => {
    const path = STEP_TO_PATH[step] ?? "/";
    window.history.pushState({ step }, "", path);
    set({ step });
  },

  /** Replace the current history entry (no new stack entry) and update step. */
  replace: (step) => {
    const path = STEP_TO_PATH[step] ?? "/";
    window.history.replaceState({ step }, "", path);
    set({ step });
  },
}));
