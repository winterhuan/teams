import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const issueDirectory = resolve(".scratch/project-chat-closed-loop/issues");
const issueFilePattern = /^(\d{2})-.+\.md$/u;
const allowedStatuses = new Set([
  "needs-triage",
  "needs-info",
  "ready-for-agent",
  "ready-for-human",
  "wontfix",
]);
const allowedProgress = new Set(["not-started", "in-progress", "completed"]);

function oneMetadataValue(text: string, name: string, file: string): string {
  const matches = [...text.matchAll(new RegExp(`^${name}:\\s*(.+)$`, "gmu"))];
  if (matches.length !== 1 || matches[0]?.[1] === undefined) {
    throw new Error(`${file}: expected exactly one ${name} field`);
  }
  return matches[0][1].trim();
}

function numbersFromRanges(value: string): number[] {
  const values: number[] = [];
  for (const part of value.split(",")) {
    const match = /^(\d+)(?:[–-](\d+))?$/u.exec(part.trim());
    if (match?.[1] === undefined) throw new Error(`invalid number range: ${part}`);
    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);
    if (end < start) throw new Error(`descending number range: ${part}`);
    for (let current = start; current <= end; current += 1) values.push(current);
  }
  return values;
}

const files = readdirSync(issueDirectory)
  .filter((file) => issueFilePattern.test(file))
  .sort();
const issues = new Map<number, { dependencies: number[]; file: string }>();
const stories = new Set<number>();

for (const file of files) {
  const fileId = Number(issueFilePattern.exec(file)?.[1]);
  const text = readFileSync(resolve(issueDirectory, file), "utf8");
  const titleId = Number(/^#\s+(\d+)\./mu.exec(text)?.[1]);
  if (titleId !== fileId) throw new Error(`${file}: title id does not match file id`);

  const status = oneMetadataValue(text, "Status", file);
  const progress = oneMetadataValue(text, "Progress", file);
  if (!allowedStatuses.has(status)) throw new Error(`${file}: invalid Status ${status}`);
  if (!allowedProgress.has(progress)) throw new Error(`${file}: invalid Progress ${progress}`);

  const blockedBy = oneMetadataValue(text, "Blocked by", file);
  const dependencies = blockedBy === "无" ? [] : numbersFromRanges(blockedBy);
  if (dependencies.some((dependency) => dependency === fileId)) {
    throw new Error(`${file}: cannot depend on itself`);
  }
  issues.set(fileId, { dependencies, file });

  for (const story of numbersFromRanges(oneMetadataValue(text, "User stories", file))) {
    if (story < 1 || story > 105) throw new Error(`${file}: invalid User story ${story}`);
    stories.add(story);
  }
}

for (let id = 1; id <= 52; id += 1) {
  if (!issues.has(id)) throw new Error(`missing issue ${id.toString().padStart(2, "0")}`);
}
for (const issue of issues.values()) {
  for (const dependency of issue.dependencies) {
    if (!issues.has(dependency)) throw new Error(`${issue.file}: missing dependency ${dependency}`);
  }
}

const visiting = new Set<number>();
const visited = new Set<number>();
function visit(id: number): void {
  if (visiting.has(id)) throw new Error(`dependency cycle includes issue ${id}`);
  if (visited.has(id)) return;
  visiting.add(id);
  for (const dependency of issues.get(id)?.dependencies ?? []) visit(dependency);
  visiting.delete(id);
  visited.add(id);
}
for (const id of issues.keys()) visit(id);

for (let story = 1; story <= 105; story += 1) {
  if (!stories.has(story)) throw new Error(`missing User story ${story}`);
}

process.stdout.write(JSON.stringify({ issueCount: issues.size, storyCount: stories.size, valid: true }));
