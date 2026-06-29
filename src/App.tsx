import {
  Download,
  History,
  ImagePlus,
  Loader2,
  RefreshCw,
  Settings,
  Trash2,
  Wand2,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { generateMainImage } from "./api";
import { CHINA_HOST, DEFAULT_PROMPT, DEFAULT_SETTINGS } from "./config";
import { downloadImage, fileToDataUrl, tryCacheRemoteImage } from "./image-utils";
import {
  addHistory,
  deleteHistory,
  getHistory,
  loadSettings,
  saveSettings
} from "./storage";
import type { ApiSettings, HistoryItem, StudioTask } from "./types";

function createTask(id: number): StudioTask {
  return {
    id,
    status: "empty",
    fileName: "",
    inputPreview: "",
    inputPayloadUrl: "",
    publicImageUrl: "",
    resultUrl: "",
    cachedResult: "",
    progress: 0,
    error: "",
    lastRequestId: ""
  };
}

const initialTasks = [createTask(1), createTask(2), createTask(3)];

export default function App() {
  const [tasks, setTasks] = useState<StudioTask[]>(initialTasks);
  const [settings, setSettings] = useState<ApiSettings>(() => loadSettings());
  const [draftSettings, setDraftSettings] = useState<ApiSettings>(settings);
  const [settingsOpen, setSettingsOpen] = useState(!settings.apiKey);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [toast, setToast] = useState("");
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const runningCount = useMemo(
    () => tasks.filter((task) => task.status === "generating").length,
    [tasks]
  );

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateTask(
    id: number,
    updater: Partial<StudioTask> | ((task: StudioTask) => Partial<StudioTask>)
  ) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              ...(typeof updater === "function" ? updater(task) : updater)
            }
          : task
      )
    );
  }

  async function refreshHistory() {
    try {
      setHistoryItems(await getHistory());
    } catch {
      setToast("历史记录读取失败");
    }
  }

  async function handleFile(taskId: number, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("请选择图片文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast("图片不能超过 10MB");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    updateTask(taskId, {
      status: "ready",
      fileName: file.name,
      inputPreview: dataUrl,
      inputPayloadUrl: dataUrl,
      publicImageUrl: "",
      resultUrl: "",
      cachedResult: "",
      progress: 0,
      error: "",
      lastRequestId: ""
    });
  }

  function applyImageUrl(taskId: number, url: string) {
    const nextUrl = url.trim();
    updateTask(taskId, {
      status: nextUrl ? "ready" : "empty",
      fileName: nextUrl ? "图片链接" : "",
      inputPreview: nextUrl,
      inputPayloadUrl: nextUrl,
      publicImageUrl: nextUrl,
      resultUrl: "",
      cachedResult: "",
      progress: 0,
      error: "",
      lastRequestId: ""
    });
  }

  async function generateTask(taskId: number) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === "generating") return;
    if (!settings.apiKey.trim()) {
      setDraftSettings(settings);
      setSettingsOpen(true);
      return;
    }

    const imageUrl = task.publicImageUrl.trim() || task.inputPayloadUrl;
    if (!imageUrl) {
      setToast("请先上传图片");
      return;
    }

    updateTask(taskId, {
      status: "generating",
      progress: 3,
      error: "",
      resultUrl: "",
      cachedResult: ""
    });

    try {
      const { resultUrl, requestId } = await generateMainImage(
        settings,
        imageUrl,
        DEFAULT_PROMPT,
        (update) => {
          updateTask(taskId, (current) => ({
            progress: Math.max(
              current.progress,
              Math.min(99, Number(update.progress ?? current.progress ?? 10))
            ),
            lastRequestId: update.id || current.lastRequestId,
            error: update.error || update.failure_reason || current.error
          }));
        }
      );

      const cachedResult = await tryCacheRemoteImage(resultUrl);
      updateTask(taskId, {
        status: "done",
        progress: 100,
        resultUrl,
        cachedResult,
        lastRequestId: requestId
      });

      await addHistory({
        id: crypto.randomUUID(),
        taskName: task.fileName || `任务 ${taskId}`,
        createdAt: new Date().toISOString(),
        inputPreview: task.inputPreview,
        resultUrl,
        cachedResult,
        model: settings.model,
        host: settings.host
      });
      await refreshHistory();
      setToast(`任务 ${taskId} 生成完成`);
    } catch (error) {
      updateTask(taskId, {
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "生成失败，请检查 API Key 或图片地址"
      });
    }
  }

  function submitSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      ...draftSettings,
      apiKey: draftSettings.apiKey.trim(),
      host: draftSettings.host.replace(/\/$/, "")
    };
    setSettings(next);
    saveSettings(next);
    setSettingsOpen(false);
    setToast("设置已保存");
  }

  async function removeHistoryItem(id: string) {
    await deleteHistory(id);
    await refreshHistory();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">E-commerce Image Studio</p>
          <h1>服装主图生成工作台</h1>
        </div>
        <div className="topbar-actions">
          <span className="status-pill">{runningCount}/3 运行中</span>
          <button
            className="icon-button"
            onClick={() => {
              setDraftSettings(settings);
              setSettingsOpen(true);
            }}
            title="设置"
            aria-label="设置"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="task-list" aria-label="生成任务">
          {tasks.map((task) => (
            <article className="task-row" key={task.id}>
              <div className="upload-pane">
                <div className="pane-head">
                  <span>任务 {task.id}</span>
                  <button
                    className="small-button"
                    onClick={() => inputRefs.current[task.id]?.click()}
                    disabled={task.status === "generating"}
                  >
                    替换上传新图片
                  </button>
                </div>

                <button
                  className={`drop-zone ${task.inputPreview ? "has-image" : ""}`}
                  onClick={() => inputRefs.current[task.id]?.click()}
                  disabled={task.status === "generating"}
                >
                  {task.inputPreview ? (
                    <img src={task.inputPreview} alt={task.fileName} />
                  ) : (
                    <span>
                      <ImagePlus size={30} />
                      上传服装照片
                    </span>
                  )}
                </button>

                <input
                  ref={(element) => {
                    inputRefs.current[task.id] = element;
                  }}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    handleFile(task.id, event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />

                <div className="url-line">
                  <input
                    value={task.publicImageUrl}
                    onChange={(event) => applyImageUrl(task.id, event.target.value)}
                    placeholder="图片 URL"
                    disabled={task.status === "generating"}
                  />
                </div>

                <button
                  className="primary-button"
                  onClick={() => generateTask(task.id)}
                  disabled={
                    task.status === "generating" ||
                    (!task.inputPayloadUrl && !task.publicImageUrl)
                  }
                >
                  {task.status === "generating" ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <Wand2 size={17} />
                  )}
                  生成主图
                </button>
              </div>

              <div className="preview-pane">
                <div className="pane-head">
                  <span>预览 {task.id}</span>
                  {task.status === "generating" && (
                    <span className="progress-label">{task.progress}%</span>
                  )}
                </div>

                <div className="preview-box">
                  {task.status === "generating" && (
                    <div className="progress-state">
                      <Loader2 className="spin" size={34} />
                      <div className="progress-track">
                        <span style={{ width: `${task.progress}%` }} />
                      </div>
                    </div>
                  )}

                  {task.status === "done" && (
                    <img
                      src={task.cachedResult || task.resultUrl}
                      alt={`任务 ${task.id} 生成结果`}
                    />
                  )}

                  {task.status === "error" && (
                    <div className="error-state">{task.error}</div>
                  )}

                  {task.status !== "generating" &&
                    task.status !== "done" &&
                    task.status !== "error" && <div className="empty-state">1:1</div>}
                </div>

                <div className="preview-actions">
                  <button
                    className="secondary-button"
                    disabled={task.status !== "done"}
                    onClick={() =>
                      downloadImage(
                        task.cachedResult || task.resultUrl,
                        `clothing-main-image-task-${task.id}.png`
                      )
                    }
                  >
                    <Download size={16} />
                    下载
                  </button>
                  <button
                    className="secondary-button"
                    disabled={
                      task.status === "generating" ||
                      (!task.inputPayloadUrl && !task.publicImageUrl)
                    }
                    onClick={() => generateTask(task.id)}
                  >
                    <RefreshCw size={16} />
                    重新生成
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="history-section" aria-label="历史生成记录">
          <div className="section-head">
            <div>
              <p className="eyebrow">Cache</p>
              <h2>历史生成记录</h2>
            </div>
            <History size={22} />
          </div>

          {historyItems.length === 0 ? (
            <div className="history-empty">暂无记录</div>
          ) : (
            <div className="history-grid">
              {historyItems.map((item) => (
                <article className="history-card" key={item.id}>
                  <img
                    src={item.cachedResult || item.resultUrl}
                    alt={item.taskName}
                  />
                  <div className="history-meta">
                    <strong>{item.taskName}</strong>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="history-actions">
                    <button
                      className="icon-button compact"
                      title="下载"
                      aria-label="下载"
                      onClick={() =>
                        downloadImage(
                          item.cachedResult || item.resultUrl,
                          `history-${item.id}.png`
                        )
                      }
                    >
                      <Download size={17} />
                    </button>
                    <button
                      className="icon-button compact danger"
                      title="删除"
                      aria-label="删除"
                      onClick={() => removeHistoryItem(item.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {settingsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="settings-modal" onSubmit={submitSettings}>
            <div className="modal-head">
              <h2>API 设置</h2>
              <button
                type="button"
                className="icon-button compact"
                onClick={() => setSettingsOpen(false)}
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>

            <label>
              API Key
              <input
                type="password"
                value={draftSettings.apiKey}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    apiKey: event.target.value
                  }))
                }
                placeholder="Bearer 后面的 key"
                autoFocus
              />
            </label>

            <label>
              Host
              <select
                value={draftSettings.host}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    host: event.target.value
                  }))
                }
              >
                <option value={DEFAULT_SETTINGS.host}>海外节点</option>
                <option value={CHINA_HOST}>国内直连</option>
              </select>
            </label>

            <label>
              模型
              <select
                value={draftSettings.model}
                onChange={(event) =>
                  setDraftSettings((current) => ({
                    ...current,
                    model: event.target.value
                  }))
                }
              >
                <option value="gpt-image-2">gpt-image-2</option>
                <option value="gpt-image-2-vip">gpt-image-2-vip</option>
              </select>
            </label>

            <button className="primary-button" type="submit">
              保存设置
            </button>
          </form>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
