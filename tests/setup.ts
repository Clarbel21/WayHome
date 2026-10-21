import { vi } from "vitest";
// Browser-like storage for store tests; browser integration tests use real localStorage.
const data = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => {
    data.set(key, value);
  },
  removeItem: (key: string) => {
    data.delete(key);
  },
  clear: () => data.clear(),
  key: (index: number) => Array.from(data.keys())[index] ?? null,
  get length() {
    return data.size;
  },
});
vi.stubGlobal("window", {
  localStorage: globalThis.localStorage,
  addEventListener: vi.fn(),
});
