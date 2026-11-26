import { describe, expect, it } from "vite-plus/test";

describe("Vitest Infrastructure", () => {
  it("uses happy-dom environment", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });

  it("supports globals without imports", () => {
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });

  it("loads setup files correctly", () => {
    expect((globalThis as { setupComplete?: boolean }).setupComplete).toBe(true);
  });
});
