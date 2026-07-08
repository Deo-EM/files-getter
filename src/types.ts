/**
 * 文件选择器的选择模式。
 *
 * - `single`    — 选择单个文件（默认）
 * - `multiple`  — 选择多个文件
 * - `directory` — 选择整个文件夹（非标准属性 webkitdirectory，主流浏览器均已支持）
 */
export type FilesGetterMode = "single" | "multiple" | "directory";

/**
 * 传给 {@link filesGetter} 的配置项。
 */
export interface FilesGetterOptions {
  /**
   * 选择模式。
   * @default "single"
   */
  mode?: FilesGetterMode;

  /**
   * 可接受的文件类型（MIME 类型或文件扩展名）。
   *
   * 直接映射到 input 元素的 `accept` 属性。
   * 数组会自动用逗号拼接（例如 `['image/*', '.pdf']` → `image/*,.pdf`）。
   *
   * @see https://developer.mozilla.org/zh-CN/docs/Web/HTML/Attributes/accept
   */
  accept?: string | string[];

  /**
   * 指定调用哪个摄像头，仅在 `accept` 为 `image/*` 或 `video/*` 时有效。
   * - `user`        — 前置摄像头
   * - `environment` — 后置摄像头
   *
   * 仅在移动端设备上有意义。
   */
  capture?: "user" | "environment";
}
