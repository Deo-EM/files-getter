import { afterEach, describe, expect, it } from "vitest";
import { ABORT_ERROR_NAME, filesGetter } from "../filesGetter";

/**
 * 辅助函数：用 DataTransfer 将 File 数组构造成 FileList。
 */
function makeFileList(files: File[]): FileList {
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  return dt.files;
}

/**
 * 辅助函数：在 filesGetter() 创建的隐藏 file input 上派发合成 change 事件，
 * 使 Promise resolve（File[]）。
 */
function resolveWithFiles(files: File[]): void {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("未在 DOM 中找到 input 元素");
  Object.defineProperty(input, "files", { value: makeFileList(files) });
  input.dispatchEvent(new Event("change"));
}

// ---------------------------------------------------------------------------
// 每个测试后清理残留的 input
// ---------------------------------------------------------------------------
afterEach(() => {
  document.body.innerHTML = "";
});

// ===========================================================================
describe("filesGetter", () => {
  // ── 创建 input 元素 ──────────────────────────────────────────────────────
  describe("input 元素创建", () => {
    it("创建隐藏的 input[type=file] 并挂载到 body", () => {
      const promise = filesGetter({ mode: "single" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      expect(input).not.toBeNull();
      expect(input!.type).toBe("file");
      expect(input!.style.position).toBe("fixed");
      resolveWithFiles([]);
      return promise.then(() => {});
    });

    it("Promise resolve 后从 DOM 中移除 input", async () => {
      const promise = filesGetter({ mode: "single" });
      resolveWithFiles([new File(["hello"], "a.txt")]);
      await promise;
      expect(document.querySelector('input[type="file"]')).toBeNull();
    });
  });

  // ── 模式：single（默认） ─────────────────────────────────────────────────
  describe("模式：single（默认）", () => {
    it("用户选择一个文件后 resolve 为 [file]", async () => {
      const file = new File(["content"], "readme.md", { type: "text/markdown" });
      const promise = filesGetter();
      resolveWithFiles([file]);
      const result = await promise;
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(file);
      expect(result[0].name).toBe("readme.md");
    });

    it("change 事件触发但无文件时 resolve 为 []", async () => {
      const promise = filesGetter();
      resolveWithFiles([]);
      const result = await promise;
      expect(result).toEqual([]);
    });

    it("不设置 multiple 属性", () => {
      filesGetter({ mode: "single" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      expect(input.multiple).toBe(false);
      resolveWithFiles([]);
    });
  });

  // ── 模式：multiple ───────────────────────────────────────────────────────
  describe("模式：multiple", () => {
    it("resolve 为所有选中文件", async () => {
      const f1 = new File(["a"], "a.txt");
      const f2 = new File(["b"], "b.txt");
      const f3 = new File(["c"], "c.txt");
      const promise = filesGetter({ mode: "multiple" });
      resolveWithFiles([f1, f2, f3]);
      const result = await promise;
      expect(result).toHaveLength(3);
    });

    it("设置 input.multiple = true", () => {
      filesGetter({ mode: "multiple" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      expect(input.multiple).toBe(true);
      resolveWithFiles([]);
    });
  });

  // ── 模式：directory ──────────────────────────────────────────────────────
  describe("模式：directory", () => {
    it("设置 webkitdirectory 属性和 multiple", () => {
      filesGetter({ mode: "directory" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      expect(input.getAttribute("webkitdirectory")).toBe("");
      expect(input.multiple).toBe(true);
      resolveWithFiles([]);
    });

    it("resolve 为文件夹内所有文件（含子目录文件）", async () => {
      // directory 模式返回 Recursive File 列表，每个 File 带 webkitRelativePath
      const f = new File(["data"], "photo.jpg");
      // 模拟浏览器给 directory 模式下文件设置的 webkitRelativePath
      Object.defineProperty(f, "webkitRelativePath", { value: "sub/photo.jpg" });
      const promise = filesGetter({ mode: "directory" });
      resolveWithFiles([f]);
      const result = await promise;
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("photo.jpg");
    });
  });

  // ── accept 选项 ──────────────────────────────────────────────────────────
  describe("accept 选项", () => {
    it("字符串 accept 直接映射", () => {
      filesGetter({ accept: "image/*" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      expect(input.accept).toBe("image/*");
      resolveWithFiles([]);
    });

    it("数组 accept 用逗号拼接", () => {
      filesGetter({ accept: [".png", ".jpg", "image/webp"] });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      expect(input.accept).toBe(".png,.jpg,image/webp");
      resolveWithFiles([]);
    });
  });

  // ── capture 选项 ─────────────────────────────────────────────────────────
  describe("capture 选项", () => {
    it("设置 input.capture", () => {
      filesGetter({ capture: "user" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      expect(input.capture).toBe("user");
      resolveWithFiles([]);
    });
  });

  // ── cancel 事件 → reject AbortError ──────────────────────────────────────
  describe("cancel 事件 → reject", () => {
    it("用户取消对话框时 reject AbortError（不再 resolve 空数组）", async () => {
      const promise = filesGetter({ mode: "single" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      input.dispatchEvent(new Event("cancel"));
      await expect(promise).rejects.toThrow("aborted");
    });

    it("directory 模式取消也 reject", async () => {
      const promise = filesGetter({ mode: "directory" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      input.dispatchEvent(new Event("cancel"));
      await expect(promise).rejects.toThrow("aborted");
    });

    it("cancel 后不能再 resolve", async () => {
      const promise = filesGetter({ mode: "single" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      input.dispatchEvent(new Event("cancel"));
      input.dispatchEvent(new Event("change"));
      await expect(promise).rejects.toThrow();
    });

    it("reject 的 Error.name 为 AbortError", async () => {
      const promise = filesGetter({ mode: "single" });
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      input.dispatchEvent(new Event("cancel"));
      try {
        await promise;
        expect.unreachable("应该 reject");
      } catch (err: unknown) {
        expect(err instanceof DOMException && err.name === ABORT_ERROR_NAME).toBe(true);
      }
    });
  });

  // ── 并发 ─────────────────────────────────────────────────────────────────
  describe("并发", () => {
    it("正确处理并发的多次独立调用", async () => {
      const f1 = new File(["1"], "1.txt");
      const f2 = new File(["2"], "2.txt");
      const f3 = new File(["3"], "3.txt");

      const p1 = filesGetter({ mode: "multiple" });
      const p2 = filesGetter({ mode: "single" });

      const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
      expect(inputs).toHaveLength(2);

      Object.defineProperty(inputs[1], "files", { value: makeFileList([f2]) });
      inputs[1].dispatchEvent(new Event("change"));

      Object.defineProperty(inputs[0], "files", { value: makeFileList([f1, f3]) });
      inputs[0].dispatchEvent(new Event("change"));

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toHaveLength(2);
      expect(r2).toHaveLength(1);
      expect(document.querySelectorAll('input[type="file"]').length).toBe(0);
    });
  });
});
