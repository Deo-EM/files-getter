#!/usr/bin/env node
/**
 * 一键发布脚本：创建 changeset → 累加版本号 → 测试 → 构建 → 发布到 npm → 提交推送。
 *
 * 用法:
 *   pnpm release         # 默认 patch
 *   pnpm release:patch   # 0.1.0 → 0.1.1
 *   pnpm release:minor   # 0.1.0 → 0.2.0
 *   pnpm release:major   # 0.1.0 → 1.0.0
 *
 * 全程无需人工干预。以 git tag 为版本基准，自动跳过已存在的 tag。
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const type = process.argv[2] || "patch";
const validTypes = ["patch", "minor", "major"];
if (!validTypes.includes(type)) {
  console.error(`❌ 无效的版本类型: ${type}，可选: ${validTypes.join(", ")}`);
  process.exit(1);
}

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function exec(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function parseVer(v) {
  return v.replace(/^v/, "").split(".").map(Number);
}

function compareVer(a, b) {
  const pa = parseVer(a);
  const pb = parseVer(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function bump(version, t) {
  const [major, minor, patch] = parseVer(version);
  if (t === "major") return `${major + 1}.0.0`;
  if (t === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** 检查本地和远程 tag 是否存在 */
function tagExists(version) {
  const tagName = `v${version}`;
  try {
    execSync(`git rev-parse "${tagName}"`, { stdio: "ignore" });
    return true;
  } catch {}
  try {
    const out = execSync(`git ls-remote --tags origin "refs/tags/${tagName}"`, {
      encoding: "utf-8",
    }).trim();
    if (out) return true;
  } catch {}
  return false;
}

/** 收集本地 + 远程所有版本 tag */
function getAllTags() {
  const local = exec('git tag --list "v*"')
    .split("\n")
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
  let remote = [];
  try {
    remote = exec('git ls-remote --tags origin "v*"')
      .split("\n")
      .map((line) => line.replace(/.*refs\/tags\//, "").replace(/\^\{\}$/, ""))
      .filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
  } catch {}
  return [...new Set([...local, ...remote])];
}

const pkgPath = resolve(process.cwd(), "package.json");

try {
  // 1. 确保工作区干净
  const status = exec("git status --porcelain");
  if (status) {
    console.error("❌ 工作区有未提交的改动，请先 commit 或 stash:");
    console.error(status);
    process.exit(1);
  }

  // 2. 以本地 + 远程最高 tag 为基准，避免 package.json 落后
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  let currentVersion = pkg.version;

  const tags = getAllTags();
  if (tags.length > 0) {
    tags.sort(compareVer);
    const latestVersion = tags[tags.length - 1].replace(/^v/, "");
    if (compareVer(latestVersion, currentVersion) > 0) {
      console.warn(
        `⚠️  package.json (${currentVersion}) 落后于最新 tag (v${latestVersion})，以 tag 为基准`,
      );
      currentVersion = latestVersion;
      // 同步 package.json（changeset 不会自动修正这个差距）
      pkg.version = currentVersion;
      writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
      exec(`git add package.json && git commit -m "chore: sync version to v${currentVersion}"`);
    }
  }

  // 3. 计算目标版本，跳过已存在的 tag
  let targetVersion = bump(currentVersion, type);
  while (tagExists(targetVersion)) {
    console.warn(`⚠️  v${targetVersion} 已存在，继续递增 patch`);
    targetVersion = bump(targetVersion, "patch");
  }

  console.log(`📦 目标版本: v${currentVersion} → v${targetVersion}`);

  // 4. 确保 .changeset 目录存在，写入 changeset 文件
  const changesetDir = resolve(process.cwd(), ".changeset");
  if (!existsSync(changesetDir)) {
    mkdirSync(changesetDir, { recursive: true });
  }

  const changesetContent = `---
"files-getter": ${type}
---

Release v${targetVersion}
`;
  writeFileSync(resolve(changesetDir, "auto-release.md"), changesetContent);

  // 5. changeset version（自动累加版本号 + 更新 CHANGELOG，删除 changeset 文件）
  run(`pnpm changeset version`, `更新版本号与 CHANGELOG`);

  // 6. 测试
  run("pnpm test", "运行测试");

  // 7. 构建
  run("pnpm build", "构建产物");

  // 8. 提交版本变更（package.json + CHANGELOG.md + 清理的 .changeset）
  exec("git add package.json CHANGELOG.md .changeset/");
  run(`git commit -m "chore: release v${targetVersion}"`, `提交版本变更 v${targetVersion}`);

  // 9. 创建 tag
  run(`git tag v${targetVersion}`, `创建 tag v${targetVersion}`);

  // 10. 发布到 npm
  run("pnpm publish --no-git-checks", "发布到 npm");

  // 11. 推送
  run("git push --follow-tags", "推送 commit 与 tag 到远程");

  console.log(`\n✅ 发布完成！v${targetVersion}`);
} catch (e) {
  console.error("\n❌ 发布失败:", e.message);
  process.exit(1);
}
