export type TaskStatus = "empty" | "ready" | "generating" | "done" | "error";

export interface StudioTask {
  id: number;
  status: TaskStatus;
  fileName: string;
  inputPreview: string;
  inputPayloadUrl: string;
  publicImageUrl: string;
  resultUrl: string;
  cachedResult: string;
  progress: number;
  error: string;
  lastRequestId: string;
}

export interface ApiSettings {
  apiKey: string;
  host: string;
  model: string;
}

export interface HistoryItem {
  id: string;
  taskName: string;
  createdAt: string;
  inputPreview: string;
  resultUrl: string;
  cachedResult: string;
  model: string;
  host: string;
}

export interface GenerationUpdate {
  id?: string;
  progress?: number;
  status?: string;
  error?: string;
  failure_reason?: string;
  results?: Array<string | { url?: string }>;
  data?: GenerationUpdate;
  code?: number;
  msg?: string;
}
