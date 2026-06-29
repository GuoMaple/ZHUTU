export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function tryCacheRemoteImage(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return "";
    const blob = await response.blob();
    return await fileToDataUrl(new File([blob], "generated-image"));
  } catch {
    return "";
  }
}

export async function downloadImage(url: string, fileName: string) {
  let href = url;
  let objectUrl = "";
  if (!url.startsWith("data:")) {
    try {
      const response = await fetch(url, { mode: "cors" });
      if (response.ok) {
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        href = objectUrl;
      }
    } catch {
      href = url;
    }
  }

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.target = "_blank";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  if (objectUrl) URL.revokeObjectURL(objectUrl);
}
