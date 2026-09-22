# Changelog

User-facing changes to LinoRoute Studio. English is followed by 简体中文.

## 2026-09-22 — Image editing, works gallery and video progress

### Fixed

- GPT-image-2.5 Flare and Sunburst multipart image edits now send
  `output_format` instead of the JSON-only `format` alias. Text-to-image
  requests are unchanged; the fix does not retry paid submissions.
- Pending video tasks continue checking beyond the previous 150-query limit.
  Temporary query failures retry with backoff; stalled status requests time
  out after 30 seconds. Terminal failures and invalid credentials stop checks.
- Switching studio sections no longer interrupts the current video's checks.
  Checks pause while the browser tab is hidden or offline and resume when it
  becomes visible or reconnects. My works refreshes pending cards from local
  storage as their tasks finish.

### Improved

- My works now uses responsive image/video preview cards, short two-line
  prompt excerpts, model and status labels, timestamps, and media filters.
- Expired, unavailable, failed and pending results have explicit placeholders.
  Opening a work still restores its complete saved prompt and settings.
- Removed the duplicate full prompt below generated images and videos.
  The prompt editor, saved history, output-size information and downloads remain.
- Added English/Chinese interface text and regression coverage for these flows.

### Scope and privacy

- History remains local to the current browser and API key. Key-based
  cross-device cloud history has been discussed but is **not implemented**
  in this update.
- Closing the page does not keep a browser polling loop running on a server.
- This update does not change OSS retention or introduce permanent media storage.
  Signed-link expiry and bucket lifecycle deletion remain separate settings.
- No production API keys, OSS credentials or private deployment configuration
  are included in the source update.

### 简体中文

#### 修复

- 修复 GPT-image-2.5 Flare / Sunburst 图生图的格式字段：
  multipart 请求改用 `output_format`，文生图请求保持不变，不自动重发付费生成请求。
- 视频进度查询不再受原有 150 次上限限制。临时错误会退避重试，
  卡住的状态查询在 30 秒后超时；明确失败或凭据无效时停止查询。
- 切换站内页面不中断当前视频查询；浏览器标签页隐藏或离线时暂停，
  返回或恢复联网时继续。“我的作品”会随本地任务状态自动更新。

#### 界面优化

- “我的作品”改为图片／视频预览卡片，配合两行提示词摘要、
  模型、状态、时间及图片／视频筛选。
- 过期、无法预览、失败和等待中的记录显示明确占位提示；
  打开作品仍保留完整提示词和设置。
- 去掉图片、视频结果下方重复的整段提示词；
  左侧编辑框、历史记录、尺寸信息和下载功能保留。
- 补充中英文界面文案及对应回归测试。

#### 本次范围

- 历史记录仍保存在当前浏览器并按 Key 区分。
  “同 Key 跨设备云端作品库”目前仅讨论方案，**尚未实现**。
- 关闭网页后，不会在服务器上继续运行浏览器的自动查询。
- 本次没有改变 OSS 保存期限，也没有增加永久存储。
  链接过期和存储桶生命周期删除是两项独立设置。
- 源码更新不包含生产 API Key、OSS 密钥和服务器私有配置。
