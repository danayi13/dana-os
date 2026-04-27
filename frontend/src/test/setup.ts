import "@testing-library/jest-dom";
import { beforeEach } from "vitest";

// Highcharts uses CSS.supports internally; jsdom doesn't implement it.
if (!globalThis.CSS) {
  // @ts-expect-error stub
  globalThis.CSS = {};
}
if (!globalThis.CSS.supports) {
  globalThis.CSS.supports = () => false;
}

// cmdk uses ResizeObserver and scrollIntoView internally; jsdom doesn't include them.
globalThis.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => { };
}

// jsdom doesn't implement window.matchMedia; stub it defaulting to light mode.
Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { },
    removeListener: () => { },
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => false,
  }),
});

// jsdom 29+ doesn't always expose localStorage as a proper Storage object.
// Stub it so providers that read/write localStorage work in tests.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Clear localStorage before each test so persisted settings don't leak between tests.
beforeEach(() => {
  localStorageMock.clear();
});
