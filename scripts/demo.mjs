import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const compilerRoot = dirname(fileURLToPath(import.meta.resolve("@typespec/compiler/package.json")));
const demos = process.argv.slice(2);
const allowed = new Set(["good", "bad-casing", "bad-operation"]);

if (demos.length === 0 || demos.some((name) => !allowed.has(name))) {
  throw new Error("Usage: node scripts/demo.mjs <good|bad-casing|bad-operation> [...]");
}

for (const name of demos) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(
    process.execPath,
    [
      resolve(compilerRoot, "cmd/tsp.js"),
      "compile",
      resolve(root, "demos/lint", name),
      "--no-emit",
      "--warn-as-error",
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`TypeSpec compiler terminated by ${result.signal}`);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
