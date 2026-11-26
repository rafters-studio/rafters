import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vite-plus/test";
import { server } from "./msw/server";

// MSW setup - hybrid strategy: live in local dev, mocked in CI
const shouldUseMSW = process.env.CI === "true";

if (shouldUseMSW) {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}

// React Testing Library cleanup
afterEach(() => {
  cleanup();
});

// Mark setup as complete for infrastructure tests
if (typeof globalThis !== "undefined") {
  Object.defineProperty(globalThis, "setupComplete", {
    value: true,
    writable: false,
    configurable: false,
  });
}
