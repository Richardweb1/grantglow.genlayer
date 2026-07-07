import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contract = await readFile(resolve(root, "contracts/grant_glow.py"), "utf8");
const app = await readFile(resolve(root, "src/App.tsx"), "utf8");
const readme = await readFile(resolve(root, "README.md"), "utf8");

const checks = [
  ["contract exposes upgraded review_grant write", contract.includes("def review_grant(")],
  ["contract keeps backward compatible check_grant", contract.includes("def check_grant(")],
  ["contract stores dashboard counters", contract.includes("open_count") && contract.includes("high_priority_count")],
  ["contract stores deadline and eligibility evidence", contract.includes("latest_deadline") && contract.includes("latest_eligibility")],
  ["contract exposes get_dashboard view", contract.includes("def get_dashboard(")],
  ["frontend writes review_grant", app.includes('functionName: "review_grant"')],
  ["frontend reads get_dashboard", app.includes('functionName: "get_dashboard"')],
  ["frontend renders history panel", app.includes("STORED REVIEW HISTORY")],
  ["README documents v2 scope", readme.includes("What changed in v2")],
] as const;

const failed = checks.filter(([, passed]) => !passed);

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (failed.length) {
  process.exitCode = 1;
  console.error(`\n${failed.length} milestone check(s) failed.`);
} else {
  console.log("\nGrantGlow v2 milestone checks passed.");
}
