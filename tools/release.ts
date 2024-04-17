import semver from "semver";
import pkg from "../package.json";
import fs from "fs-extra";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { $ } from "execa";
import prompts from "prompts";

const $$ = $({ stdio: "inherit" });

async function release() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const v = semver.parse(pkg.version)!;
  const version = semver.inc(pkg.version, v.minor >= 9 ? "major" : "minor")!;

  console.log("需要提交的暂存文件如下：");

  await $$`git diff --cached --stat`;

  const response = await prompts({
    type: "confirm",
    name: "confirm",
    message: `请确认是否提交v${version}?`,
  });

  if (!response.confirm) process.exit();

  pkg.version = version;
  fs.writeJSONSync(path.join(__dirname, "..", "package.json"), pkg, {
    spaces: "  ",
  });
  await $$`git add package.json`;
  await $$`git commit -m v${version}`;
  await $$`git tag v${version}`;
  await $$`git push`;
  await $$`git push origin v${version}`;
}

release();
