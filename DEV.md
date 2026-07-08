# 开发者指南

本文档面向本地开发和维护者，说明项目结构、可用命令以及开发注意事项。

## 技术栈

| 工具 | 用途 |
| --- | --- |
| TypeScript | 类型安全的开发语言 |
| Rolldown | 生产构建，输出 ESM + CJS 双格式 |
| Babel + Terser | 语法降级到 ES5 + 代码压缩 |
| Vite | 本地开发服务器（playground） |
| Vitest + happy-dom | 单元测试 |
| Biome | 代码格式化 & 代码检查 |
| Husky + lint-staged | pre-commit 钩子自动检查 |
| pnpm | 包管理器 |

## 项目结构

```
files-getter/
├── .vscode/                  # VSCode 配置（保存自动格式化、扩展推荐）
├── src/
│   ├── index.ts              # 入口：导出 filesGetter + 类型
│   ├── filesGetter.ts        # 核心实现（隐藏 input + change/focus 双重监听）
│   ├── types.ts              # 类型定义（FilesGetterMode / FilesGetterOptions）
│   └── __tests__/
│       └── filesGetter.test.ts  # 15 个测试用例
├── playground/               # 浏览器手动测试页
│   ├── index.html
│   └── main.ts
├── dist/                     # 构建产物（ESM + CJS + d.ts）
├── rolldown.config.ts        # 构建配置（Babel ES5 + Terser 压缩）
├── vite.config.ts            # Vite 配置（含 vitest test 字段）
├── tsconfig.json             # TypeScript 基础配置
├── tsconfig.build.json       # TypeScript 生成 .d.ts 声明文件
├── biome.json                # Biome 格式化/检查规则
├── .husky/pre-commit         # Git 提交前自动执行 lint-staged
├── package.json
├── README.md                 # 用户文档（API 使用说明）
├── DEV.md                    # 本文件（开发指南）
└── .gitignore
```

## 命令速查

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动 Vite 开发服务器，在浏览器中打开 playground 手动测试 |
| `pnpm build` | 生产构建：rolldown 打包（Babel 降级 + Terser 压缩）+ tsc 生成 .d.ts |
| `pnpm test` | 运行一次 vitest 单测（15 个测试用例） |
| `pnpm test:watch` | vitest 监听模式，文件变更自动重跑 |
| `pnpm format` | 用 Biome 格式化所有代码 |
| `pnpm lint` | 用 Biome 检查代码规范 |
| `pnpm check` | Biome 格式化 + 自动修复 |
| `pnpm typecheck` | TypeScript 类型检查（不生成文件） |
| `pnpm prepare` | 安装 husky git hooks（自动在 `pnpm install` 后执行） |

### 推荐开发流程

```bash
# 1. 安装依赖
pnpm install

# 2. 写代码前先跑一遍类型检查 + 单测，确认环境正常
pnpm typecheck
pnpm test

# 3. 开发时开启 playground 手动验证浏览器行为
pnpm dev

# 4. 提交前自动检查（husky + lint-staged 会自动执行，无需手动操作）
#    但也可以手动跑一遍：
pnpm check
pnpm typecheck
pnpm test

# 5. 构建验证产物
pnpm build
```

## 构建产物说明

`pnpm build` 会生成 `dist/` 目录，包含：

| 文件 | 说明 |
| --- | --- |
| `dist/index.mjs` | ESM 格式，ES5 语法 + 已压缩 |
| `dist/index.cjs` | CommonJS 格式，ES5 语法 + 已压缩 |
| `dist/index.d.ts` | TypeScript 类型声明入口 |
| `dist/*.d.ts` | 各模块的类型声明文件 |

构建管线：

```
src/*.ts
  → Rolldown 读取 TS 源码
    → @rollup/plugin-babel（@babel/preset-typescript 剥离 TS 语法 → @babel/preset-env 降级到 ES5）
    → 自定义 terser 插件（generateBundle 阶段直接替换 chunk code，输出单行压缩的 ES5）
  → dist/index.mjs + dist/index.cjs

src/*.ts
  → tsc --emitDeclarationOnly（仅生成类型声明）
  → dist/*.d.ts
```

> 为什么不直接用 Rolldown 的 `output.minify: true`？
>
> Rolldown 内置压缩器会把字符串字面量优化成 ES6 模板字面量（`` `string` ``），破坏 ES5 兼容性。因此我们改为在 `generateBundle` 钩子中调用 `terser.minify({ ecma: 5 })`，确保最终产物保持 ES5 语法。

## 测试说明

测试使用 **vitest + happy-dom** 模拟浏览器 DOM 环境。由于文件选择对话框无法在 JSDOM 中真正弹出，测试的核心策略是：

1. **属性验证**：调用 `filesGetter()` 后立即检查 DOM 中的 `<input>` 元素属性是否正确设置。
2. **事件模拟**：手动构造 `FileList`（通过 `DataTransfer().files`）并派发 `change` 事件来模拟用户选择。
3. **焦点模拟**：派发 `window.focus` 事件来模拟对话框关闭，验证取消兜底逻辑。

测试覆盖范围：

- `single` / `multiple` / `directory` 三种模式的属性设置
- `accept` 字符串和数组的映射
- `capture` 属性设置
- 用户取消 → resolve `[]`
- `change` 事件 → resolve `File[]`
- focus 兜底取消逻辑
- 并发多次调用互不干扰
- input 元素在 resolve 后被移除

## 开发注意事项

### 1. 包管理器

本项目使用 **pnpm** 管理依赖。请勿使用 npm 或 yarn，避免生成错误的 lock 文件。`.gitignore` 已排除 `package-lock.json`。

### 2. 代码规范

- 保存时自动格式化（VSCode 配置已就绪）
- Biome 负责格式化和检查，规则见 `biome.json`
- 缩进 2 空格，LF 换行，双引号
- **源码注释使用中文**

### 3. 零运行时依赖

`files-getter` 是一个纯浏览器端工具库，**不依赖任何第三方 npm 包**。所有 `devDependencies` 仅用于开发和构建。添加依赖时注意确认是 devDependency。

### 4. ES5 兼容

构建产物语法降级到 ES5（目标 IE 11），确保兼容老旧移动设备。如果在源码中使用了新 API（如 `Array.from`、`Promise`、`Map` 等），这些不会被打包降级 —— 调用方需要自行 polyfill 或确保目标环境支持。

### 5. 文件选择器实现

核心实现在 `src/filesGetter.ts`，基于隐藏 `<input type="file">` 元素：

- **选择监听**：主要靠 `change` 事件；兜底靠 `window.focus`（部分浏览器取消时不触发 change）。
- **DOM 挂载**：input 必须挂到 `document.body`（Firefox 要求元素在 DOM 中 click() 才生效）。
- **清除**：resolve 后立即从 DOM 移除 input，避免内存泄漏。

### 6. 文件夹模式兼容性

`mode: "directory"` 使用非标准属性 `webkitdirectory`。该属性在 Chrome、Firefox、Safari、Edge 的主流桌面版本中均支持，但**不支持 IE**，且部分移动端浏览器不完全支持。

### 7. 拖拽功能（后续计划）

项目已经为拖拽功能预留了扩展空间。后续在 `src/dropZone.ts` 中实现 `dropZone(element, options)`，通过 `dragover` / `drop` 事件从 `DataTransfer` 中提取 File 对象，复用 `FilesGetterOptions` 接口。

### 8. Git 提交规范

- pre-commit 钩子会自动执行 `biome check --write` 对暂存的 `.ts/.js/.json/.md` 文件进行格式化。
- 如果 Biome 报错且无法自动修复，提交会被阻止，需要手动修复后重新提交。

### 9. VSCode 推荐扩展

打开项目时 VSCode 会提示安装推荐扩展（`.vscode/extensions.json`）：

- **Biome**（`biomejs.biome`）：代码格式化和检查
- **Vitest**（`vitest.explorer`）：测试用例浏览和运行
