# 服装主图生成工作台

一个可部署到 GitHub Pages 的前端网站，用于把服装照片生成电商 1:1 主图。页面支持 3 个独立任务同时运行，浏览器本地保存 API Key 和历史生成记录。

## 功能

- 3 个上传窗口和 3 个生成预览窗口
- 每个任务可独立上传、生成、重新生成、下载
- 历史生成记录缓存在浏览器 IndexedDB，可下载或删除
- 首次使用填写 API Key，后续自动读取本地缓存
- 默认使用 Grsai GPT Image API：`POST /v1/draw/completions`
- 默认输出参数：`aspectRatio: "1024x1024"`

## 本地运行

```bash
npm install
npm run dev
```

打开终端提示的本地地址，例如 `http://localhost:5173`。

## 构建

```bash
npm run build
```

构建产物会输出到 `dist/`。

## GitHub Pages

仓库已包含 `.github/workflows/deploy.yml`。上传到 GitHub 后，在仓库设置中启用 Pages，并选择 GitHub Actions 作为部署来源即可。

## API 配置

页面右上角设置按钮可修改：

- API Key
- Host：海外节点 `https://grsaiapi.com`，国内直连 `https://grsai.dakka.com.cn`
- 模型：`gpt-image-2` 或 `gpt-image-2-vip`

Grsai 文档中的图片参数为 `urls`。本项目会把本地上传图转为 data URL 传入；如果接口侧要求公网 URL，可在每个任务的「图片 URL」输入框粘贴可访问图片地址后生成。
