import { strictEqual } from "node:assert";
import { readFileSync } from "node:fs";
import { Given, Then } from "@cucumber/cucumber";
import { z } from "zod";

const Manifest = z.object({ name: z.string() });

let manifest: z.infer<typeof Manifest> | undefined;

Given("the root package.json", () => {
  manifest = Manifest.parse(
    JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")),
  );
});

Then("its name is {string}", (name: string) => {
  strictEqual(manifest?.name, name);
});
