import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { isPathInsideWorkspace } from "../src/pi-tool-gate-extension.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("rejects a path that escapes the Workspace through a symbolic link", () => {
  const root = mkdtempSync(join(tmpdir(), "hearth-gate-root-"));
  const outside = mkdtempSync(join(tmpdir(), "hearth-gate-outside-"));
  directories.push(root, outside);
  mkdirSync(join(root, "safe"));
  symlinkSync(outside, join(root, "safe", "escape"));

  expect(isPathInsideWorkspace(root, "note.txt")).toBe(true);
  expect(isPathInsideWorkspace(root, "safe/escape/forbidden.txt")).toBe(false);
});
