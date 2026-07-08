import babel from "@rollup/plugin-babel";
import { defineConfig } from "rolldown";
import { minify } from "terser";

/**
 * 自定义 Terser 压缩插件。
 *
 * 在 generateBundle 阶段直接替换 chunk 的 code，确保最终写入磁盘的是
 * 真正压缩后的 ES5 代码（Rolldown 内置 minify 会把字符串转成模板字面量，破坏 ES5 兼容性）。
 */
function terserPlugin() {
  return {
    name: "terser-es5",
    async generateBundle(_options: unknown, bundle: Record<string, { code?: string }>) {
      for (const chunk of Object.values(bundle)) {
        if (!chunk.code) continue;
        const result = await minify(chunk.code, {
          ecma: 5,
          compress: {
            drop_console: true,
            drop_debugger: true,
            passes: 2,
          },
          mangle: true,
          format: {
            comments: false,
            beautify: false,
            indent_level: 0,
          },
        });
        if (result.code) {
          chunk.code = result.code;
        }
      }
    },
  };
}

export default defineConfig({
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.mjs",
      format: "esm",
    },
    {
      file: "dist/index.cjs",
      format: "cjs",
    },
  ],
  plugins: [
    babel({
      babelHelpers: "bundled",
      presets: [
        [
          "@babel/preset-env",
          {
            targets: { ie: "11" },
            modules: false,
          },
        ],
        "@babel/preset-typescript",
      ],
      extensions: [".ts"],
    }),
    terserPlugin(),
  ],
});
