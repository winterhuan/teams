import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("validates the closed-loop issue map as an executable dependency contract", () => {
  const output = execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--experimental-transform-types",
      resolve("scripts/validate-issue-map.ts"),
    ],
    { encoding: "utf8" },
  );

  expect(JSON.parse(output)).toEqual({
    issueCount: 52,
    storyCount: 105,
    valid: true,
  });
});
