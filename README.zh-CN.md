# LinoRoute Studio

LinoRoute Studio 是一个开源的图片与视频 AI 创作工作台，支持文生图、图生图、文生视频、图生视频、提示词库以及浏览器本地作品管理。

语言： [English](README.md) · 简体中文 · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md)

## 在线体验

- **在线演示：** [studio.linoroute.com](https://studio.linoroute.com)
- **推荐兼容 API：** [LinoRoute](https://linoroute.com)
- **API 文档：** [ninoroute.com/tutorials](https://ninoroute.com/tutorials/00-intro)

不配置 Key 也可以浏览界面和提示词库。真实生成需要用户自行填写 API Key。项目默认适配 LinoRoute；更换服务商时需要核对模型名、接口路径和响应格式，不能仅靠更换地址保证兼容。

## 截图

![图片创作](screenshots/image-workspace.png)

![视频创作](screenshots/video-workspace.png)

![GPT-image-2.5 工作流](screenshots/gpt-image-2-5.png)

![移动端布局](screenshots/mobile-image-workspace.png)

## 功能

- GPT-image 系列图片生成与参考图输入
- Seedance、MiniMax、Kling、Veo、Gemini 等视频模型
- 文生图、图生图、文生视频、图生视频
- 根据模型联动画面比例、分辨率、画质和时长
- 图片与视频提示词库
- 浏览器本地作品和本地文件管理
- 可选的签名 OSS 上传，用于临时保存素材与结果；提示词预览使用独立的长期存储桶
- 英文优先界面，支持中文切换；文档提供六种语言
- 不内置服务器主 API Key 的安全中转模式

## 隐私与密钥

Studio 采用用户自带 Key 的方式。API Key 由用户输入，只随需要它的请求发送。不要将 Key 提交到仓库、写入 `VITE_*`/`NEXT_PUBLIC_*` 变量，或粘贴到 Issue 中。

Key 保存在当前标签页的 `sessionStorage` 中，刷新后仍可使用；这不是 Cookie，也不是云端账号。作品记录保存在浏览器 IndexedDB 中，不跨设备同步。公共电脑使用后请断开 Key；部分浏览器的会话恢复功能也可能恢复标签页存储。

OSS 使用短时签名 URL。OSS AccessKey 只能放在服务端签名器中，不能进入浏览器构建产物。详见 [`SECURITY.md`](SECURITY.md) 和 [`docs/provider-adapters.md`](docs/provider-adapters.md)。

## 本地运行

需要 Bun 1.4.2 和 Node.js 24+；可选的 OSS 服务需要 Python 3.11+：

```bash
bun install
cp .env.example .env.local
bun run dev
```

打开 `http://127.0.0.1:4178`。默认上游为 `https://linoroute.com`，也可以通过 `STUDIO_API_UPSTREAM` 更换为其他兼容服务。

上游地址不带 `/v1` 或末尾斜杠。生产部署还需要 API 转发服务；仓库已包含 Nginx 配置、OSS 签名服务和空白密钥模板，详见[部署说明](deploy/studio/README.md)。上传签名有效期为 5 分钟，读取链接为 7 天；OSS 生命周期删除规则需另外配置。

```bash
bun run typecheck
bun run test
bun run build
```

## 许可证

项目使用 [GNU AGPL v3 或更高版本](LICENSE)。部分 UI 源自 QuantumNous 的 new-api Web 客户端，相关版权头和许可证义务仍然保留。品牌、模型 Logo 和提示词素材的说明见 [`NOTICE`](NOTICE)。
