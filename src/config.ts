import type { ApiSettings } from "./types";

export const DEFAULT_PROMPT =
  "将输入的服装照片转换为极简主义工作室产品摄影图像，中心构图，间距平衡，无视觉杂乱。 保留服装设计、衣服图案、大小比例、面料质地和颜色，服装颜色不受环境影。不出现衣架，去掉衣架。 逼真、高分辨率、清晰的织物细节。 以#F1EBDF 作为背景颜色。 强调“干净、舒适、亲肤感” 构图方式：平铺展示（flat lay），上衣与裤子错位摆放，服装自然的轻微柔和的褶皱微微隆起形成自然的投影再背景上。轻微对角线结构，增强视觉节奏 画幅1:1方形构图";

export const DEFAULT_SETTINGS: ApiSettings = {
  apiKey: "",
  host: "https://grsaiapi.com",
  model: "gpt-image-2"
};

export const CHINA_HOST = "https://grsai.dakka.com.cn";

export const SETTINGS_KEY = "clothing-main-image-settings";
