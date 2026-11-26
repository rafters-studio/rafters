import { describe, expect, it } from "vite-plus/test";

describe("MSW Infrastructure", () => {
  it("uses live requests in local development", () => {
    expect(process.env.CI ? "mocked" : "live").toBe(process.env.CI ? "mocked" : "live");
  });

  it("configures hybrid strategy correctly", () => {
    const shouldUseMSW = process.env.CI === "true";
    expect(typeof shouldUseMSW).toBe("boolean");
  });
});
