import { describe, expect, it } from "vite-plus/test";
import { zocker } from "zocker";
import { z } from "zod";
import { createFixtureFactory, generateTestArray, generateTestData } from "../utils/index";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
});

describe("Zocker Infrastructure", () => {
  it("generates valid data from Zod schemas", () => {
    const user = zocker(UserSchema).generate();
    expect(UserSchema.safeParse(user).success).toBe(true);
  });

  it("generates arrays of data", () => {
    const users = zocker(z.array(UserSchema).length(10)).generate();
    expect(users).toHaveLength(10);
    for (const user of users) {
      expect(UserSchema.safeParse(user).success).toBe(true);
    }
  });

  it("generates different data on each call", () => {
    const user1 = zocker(UserSchema).generate();
    const user2 = zocker(UserSchema).generate();
    expect(user1).not.toEqual(user2);
  });

  describe("Test Utilities", () => {
    it("generateTestData creates valid data", () => {
      const user = generateTestData(UserSchema);
      expect(UserSchema.safeParse(user).success).toBe(true);
    });

    it("generateTestArray creates valid array", () => {
      const users = generateTestArray(UserSchema, 5);
      expect(users).toHaveLength(5);
      for (const user of users) {
        expect(UserSchema.safeParse(user).success).toBe(true);
      }
    });

    it("createFixtureFactory generates unique instances", () => {
      const factory = createFixtureFactory(UserSchema);
      const user1 = factory.generate();
      const user2 = factory.generate();

      expect(UserSchema.safeParse(user1).success).toBe(true);
      expect(UserSchema.safeParse(user2).success).toBe(true);
      expect(user1).not.toEqual(user2);
    });

    it("createFixtureFactory supports overrides", () => {
      const factory = createFixtureFactory(UserSchema);
      const customEmail = "custom@example.com";
      const user = factory.generate({ email: customEmail });

      expect(user.email).toBe(customEmail);
      expect(UserSchema.safeParse(user).success).toBe(true);
    });

    it("createFixtureFactory generates different data on each call", () => {
      const factory = createFixtureFactory(UserSchema, 100);
      const user1 = factory.generate();
      const user2 = factory.generate();

      expect(UserSchema.safeParse(user1).success).toBe(true);
      expect(UserSchema.safeParse(user2).success).toBe(true);
      expect(user1).not.toEqual(user2);
    });

    it("createFixtureFactory generateMany creates multiple instances", () => {
      const factory = createFixtureFactory(UserSchema);
      const users = factory.generateMany(3);

      expect(users).toHaveLength(3);
      for (const user of users) {
        expect(UserSchema.safeParse(user).success).toBe(true);
      }
    });
  });
});
