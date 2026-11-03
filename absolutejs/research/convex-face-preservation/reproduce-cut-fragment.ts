import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cutFragmentFixture } from "../../tests/cut-fragment-fixture";
const { default: R, buildInfo } = await import(resolve(process.argv[2]!));
await R.init();
const { model } = JSON.parse(
  readFileSync(new URL("./cut-fragment.json", import.meta.url), "utf8"),
);
const result = cutFragmentFixture(R, model, {
  hz: process.argv[4] ? Number(process.argv[4]) : undefined,
  iterations: process.argv[5] ? Number(process.argv[5]) : undefined,
  restitution: process.argv[6] ? Number(process.argv[6]) : undefined,
  groundMode: process.argv[7],
});
writeFileSync(
  process.argv[3]!,
  JSON.stringify({ buildInfo, ...result }, null, 2),
);
console.log(
  JSON.stringify({
    packageVersion: buildInfo.packageVersion,
    steps: result.steps,
    seconds: result.seconds,
    sleeping: result.final.sleeping,
  }),
);
