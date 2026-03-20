import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "ds-dev-mode";

interface DevModeState {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
}

export const useDevModeStore = create<DevModeState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((state) => ({ enabled: !state.enabled })),
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
