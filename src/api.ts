import type { ApiSettings, GenerationUpdate } from "./types";

const COMPLETIONS_PATH = "/v1/draw/completions";

export async function generateMainImage(
  settings: ApiSettings,
  imageUrl: string,
  prompt: string,
  onUpdate: (update: GenerationUpdate) => void
): Promise<{ resultUrl: string; requestId: string }> {
  const response = await fetch(`${settings.host}${COMPLETIONS_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: settings.model,
      prompt,
      aspectRatio: "1024x1024",
      urls: [imageUrl],
      variants: 1,
      shutProgress: false
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `API 请求失败：HTTP ${response.status}`);
  }

  if (!response.body) {
    const json = (await response.json()) as GenerationUpdate;
    const update = normalizeUpdate(json);
    onUpdate(update);
    return extractResult(update);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: GenerationUpdate = {};

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") break;
        latest = normalizeUpdate(JSON.parse(payload));
        onUpdate(latest);
      } else {
        const json = normalizeUpdate(JSON.parse(line));
        if (json.code && json.code !== 0) {
          throw new Error(json.msg || "API 返回错误");
        }
        latest = json;
        onUpdate(latest);
      }
    }
  }

  return extractResult(latest);
}

function normalizeUpdate(update: GenerationUpdate): GenerationUpdate {
  return update.data ? { ...update.data, code: update.code, msg: update.msg } : update;
}

function extractResult(update: GenerationUpdate) {
  const first = update.results?.[0];
  const resultUrl = typeof first === "string" ? first : first?.url || "";
  if (!resultUrl) {
    throw new Error(update.error || update.failure_reason || "没有收到生成图片地址");
  }
  return { resultUrl, requestId: update.id || "" };
}
