import { ABORT_ERROR_NAME, filesGetter } from "../src/index";

const resultEl = document.getElementById("result")!;

function show(files: File[]) {
  if (files.length === 0) {
    resultEl.innerHTML = '<span class="empty">No files selected</span>';
    return;
  }

  // directory 模式下每个 File 带 webkitRelativePath
  const hasPaths = files[0].webkitRelativePath !== "";
  const lines = files.map((f) => {
    const size = `${(f.size / 1024).toFixed(1)} KB`;
    return hasPaths
      ? `├─ ${f.webkitRelativePath}  (${size})`
      : `${f.name}  (${size}, ${f.type || "unknown type"})`;
  });
  resultEl.innerHTML = `<strong>${files.length} file(s):</strong>\n${lines.join("\n")}`;
}

document.getElementById("btn-single")!.addEventListener("click", async () => {
  const files = await filesGetter({ mode: "single", accept: "image/*" });
  show(files);
});

document.getElementById("btn-multiple")!.addEventListener("click", async () => {
  const files = await filesGetter({ mode: "multiple" });
  show(files);
});

document.getElementById("btn-directory")!.addEventListener("click", async () => {
  try {
    const files = await filesGetter({ mode: "directory" });
    console.log(files);
    show(files);
  } catch (err: any) {
    if (err.name === ABORT_ERROR_NAME) {
      resultEl.innerHTML = '<span class="empty">Cancelled</span>';
      return;
    }
    throw err;
  }
});
