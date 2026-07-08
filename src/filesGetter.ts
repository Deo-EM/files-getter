import type { FilesGetterOptions } from "./types";

/**
 * 用户取消选择时 reject 的 Error 名称。
 * 调用方可通过 `err.name === 'AbortError'` 判断。
 */
export const ABORT_ERROR_NAME = "AbortError";

/**
 * 以编程方式打开浏览器原生文件选择对话框，并返回用户选中的 {@link File} 对象数组。
 *
 * - 创建隐藏的 `<input type="file">` 元素。
 * - 根据 {@link FilesGetterOptions} 设置 `accept`、`multiple`、`webkitdirectory` 等属性。
 * - 调用 `input.click()` 弹出系统对话框。
 * - 用户确认选择后 resolve 为 File 数组；用户取消则 reject。
 *
 * directory 模式下，每个 File 自带 `webkitRelativePath` 属性
 * （如 `"sub/folder/a.txt"`），调用方可据此还原目录结构。
 *
 * @example
 * ```ts
 * try {
 *   // 选取单张图片
 *   const [file] = await filesGetter({ accept: 'image/*' })
 *   if (file) console.log(file.name)
 *
 *   // 选取多个文件
 *   const files = await filesGetter({ mode: 'multiple' })
 *   console.log(`已选择 ${files.length} 个文件`)
 *
 *   // 选取整个文件夹（每个 File 带 webkitRelativePath）
 *   const folderFiles = await filesGetter({ mode: 'directory' })
 *   for (const f of folderFiles) {
 *     console.log(f.webkitRelativePath)  // e.g. "sub/img/photo.jpg"
 *   }
 * } catch (err) {
 *   if (err.name === 'AbortError') { } // 用户取消
 * }
 * ```
 */
export function filesGetter(options: FilesGetterOptions = {}): Promise<File[]> {
  const { mode = "single", accept, capture } = options;

  return new Promise<File[]>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.style.position = "fixed";
    input.style.top = "-9999px";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";

    if (mode === "multiple") {
      input.multiple = true;
    } else if (mode === "directory") {
      input.setAttribute("webkitdirectory", "");
      input.multiple = true;
    }

    if (accept) {
      input.accept = Array.isArray(accept) ? accept.join(",") : accept;
    }

    if (capture) {
      input.capture = capture;
    }

    document.body.appendChild(input);

    let settled = false;

    const cleanup = () => {
      input.remove();
    };

    const finalize = (files: File[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(files);
    };

    const abort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException("The user aborted the file selection.", ABORT_ERROR_NAME));
    };

    // 用户确认选择后触发；directory 模式下每个 File 自带 webkitRelativePath
    input.addEventListener("change", () => {
      const files = input.files ? Array.from(input.files) : [];
      finalize(files);
    });

    // 用户取消选择
    input.addEventListener("cancel", abort);

    try {
      input.click();
    } catch {
      // click() 被浏览器安全策略阻止（非用户手势调用时可能发生）
      abort();
    }
  });
}
