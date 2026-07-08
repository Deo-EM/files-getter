# files-getter

> 指令式浏览器文件获取工具 —— `await filesGetter(options)` 一行代码获取 File 对象。

零运行时依赖，兼容所有现代浏览器。支持选择单个文件、多个文件以及整个文件夹。

## 安装

```bash
pnpm add files-getter
```

或使用其他包管理器：

```bash
npm install files-getter
yarn add files-getter
```

## 快速开始

```ts
import { filesGetter } from "files-getter";
```

### 选择单个文件

```ts
// mode 默认为 "single"，可省略
const [file] = await filesGetter();

if (file) {
  console.log(`文件名: ${file.name}`);
  console.log(`文件大小: ${file.size} bytes`);
  console.log(`MIME 类型: ${file.type}`);
}
```

### 选择多个文件

```ts
const files = await filesGetter({ mode: "multiple" });
console.log(`已选择 ${files.length} 个文件`);
```

### 选择整个文件夹

```ts
const folderFiles = await filesGetter({ mode: "directory" });
folderFiles.forEach((f) => {
  // 通过 webkitRelativePath 获取文件夹内的相对路径
  console.log(f.webkitRelativePath);
});
```

### 限定文件类型

```ts
// 字符串形式
const [img] = await filesGetter({ accept: "image/*" });

// 数组形式（内部自动用逗号拼接）
const docs = await filesGetter({
  mode: "multiple",
  accept: [".pdf", ".docx", ".doc", "text/plain"],
});
```

### 移动端拍照

```ts
// 调用后置摄像头拍照
const [photo] = await filesGetter({
  accept: "image/*",
  capture: "environment",
});

// 调用前置摄像头自拍
const [selfie] = await filesGetter({
  accept: "image/*",
  capture: "user",
});
```

## 用户取消处理

当用户关闭文件选择对话框而未选择任何文件时，Promise 会 **reject 一个 `AbortError`**。

```ts
try {
  const files = await filesGetter();
  // 正常处理文件...
} catch (err) {
  if (err instanceof DOMException && err.name === "AbortError") {
    console.log("用户取消了选择");
    return;
  }
  throw err; // 其他异常继续向上抛
}
```

也可以通过导出的 `ABORT_ERROR_NAME` 常量来判断：

```ts
import { filesGetter, ABORT_ERROR_NAME } from "files-getter";

try {
  const files = await filesGetter();
} catch (err) {
  if (err instanceof Error && err.name === ABORT_ERROR_NAME) {
    // 用户取消
  }
}
```

## API 文档

### `filesGetter(options?)`

打开文件选择对话框并返回用户选择的文件。

**返回值：** `Promise<File[]>`

- 用户选择了文件 → resolve 包含所选文件的 `File[]` 数组
- 用户取消了选择 → reject 一个 `DOMException`（`name` 为 `"AbortError"`）

### 参数类型：`FilesGetterOptions`

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mode` | `"single"` \| `"multiple"` \| `"directory"` | `"single"` | 选择模式：单个文件 / 多个文件 / 整个文件夹 |
| `accept` | `string` \| `string[]` | — | 可接受的文件类型，对应 HTML [`input.accept`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Attributes/accept)。数组会自动用逗号拼接。 |
| `capture` | `"user"` \| `"environment"` | — | 移动端摄像头方向。`"user"` 为前置摄像头，`"environment"` 为后置摄像头。需配合 `accept` 为图片或视频类型时使用。 |

### 类型导出

```ts
import {
  filesGetter,
  type FilesGetterOptions,
  type FilesGetterMode,
} from "files-getter";
```

## 浏览器兼容性

| 模式 | Chrome | Firefox | Safari | Edge |
| --- | --- | --- | --- | --- |
| `single` | ✅ | ✅ | ✅ | ✅ |
| `multiple` | ✅ | ✅ | ✅ | ✅ |
| `directory` | ✅ | ✅ | ✅ | ✅ |

> 文件夹模式依赖非标准属性 `webkitdirectory`，所有主流桌面浏览器均已支持。

## 实现原理

库内部动态创建一个隐藏的 `<input type="file">` 元素，根据配置项设置对应属性后调用 `click()` 触发原生文件选择对话框，通过 `change` 事件和 `window focus` 事件双重监听来捕获选择和取消行为。

## 开发计划

- [ ] `dropZone(element, options)` —— 支持拖拽文件到指定 DOM 节点获取 File 对象。

## License

MIT
