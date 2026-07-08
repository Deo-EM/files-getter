import babel from "@rollup/plugin-babel";
import { defineConfig } from "rolldown";
import { minify } from "terser";

/**
 * 自定义 Terser 压缩插件。
 *
 * 在 generateBundle 阶段直接替换 chunk 的 code，实现更激进的压缩。
 */
function terserPlugin() {
  return {
    name: "terser-es5",
    async generateBundle(
      _options: unknown,
      bundle: Record<string, { type: string; code?: string }>,
    ) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk" || !chunk.code) continue;
        const result = await minify(chunk.code, {
          ecma: 5,
          module: true,
          compress: {
            drop_console: true,
            drop_debugger: true,
            passes: 2,
          },
          mangle: true,
          format: {
            comments: false,
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
            targets: "> 0.1%, last 10 versions, not dead, Android >= 4.4, iOS >= 9",
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
