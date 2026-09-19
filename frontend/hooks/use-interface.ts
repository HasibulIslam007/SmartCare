import { create } from "zustand";
interface InterfaceState {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}
export const useInterface = create<InterfaceState>((set) => ({
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}));
