# LinoRoute Studio

画像と動画を作成できるオープンソースの AI クリエイティブワークスペースです。テキストからの生成、画像からの生成、プロンプトライブラリ、ブラウザ内の作品管理に対応します。

言語： [English](README.md) · [简体中文](README.zh-CN.md) · 日本語 · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md)

## リンク

- **オンラインデモ：** [studio.linoroute.com](https://studio.linoroute.com)
- **推奨 API：** [LinoRoute](https://linoroute.com)
- **API ドキュメント：** [ninoroute.com/tutorials](https://ninoroute.com/tutorials/00-intro)

画面とプロンプトライブラリは API キーなしで閲覧できます。実際の生成には利用者自身のキーが必要です。標準の接続先は LinoRoute です。他社サービスを使う場合はモデル名、パス、レスポンス形式の確認が必要です。

## スクリーンショット

![画像ワークスペース](screenshots/image-workspace.png)

![動画ワークスペース](screenshots/video-workspace.png)

![モバイルレイアウト](screenshots/mobile-image-workspace.png)

## 主な機能

- GPT-image 系の画像生成と参照画像
- Seedance、MiniMax、Kling、Veo、Gemini などの動画モデル
- モデルごとの比率、解像度、品質、長さの設定
- 画像・動画のプロンプトライブラリ
- ブラウザ内の作品とローカルファイル管理
- オプションの署名付き OSS ストレージ

## セキュリティ

キーはリポジトリや `VITE_*`/`NEXT_PUBLIC_*` 変数に保存しないでください。OSS の AccessKey は署名サーバーだけに置きます。詳細は [`SECURITY.md`](SECURITY.md) を参照してください。

## 開発

```bash
bun install
cp .env.example .env.local
bun run dev
```

`STUDIO_API_UPSTREAM` で互換 API の公開 URL を変更できます。ライセンスは [AGPL v3 以降](LICENSE) です。
