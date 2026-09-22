# 我が子の成長記録（Web版）

ペットの体重・食事・排泄などの成長記録をつけるアプリのWeb版です。
スマホアプリ版（[pet-record-app](../pet-record-app)）と同じデータ構造・機能を、
ブラウザだけで動くPWA（GitHub Pages配信）として再実装しています。

## スマホアプリ版との違い

- データはブラウザ内（IndexedDB）に保存されます。端末・ブラウザをまたいでは共有されません。
- 音声入力は専用機能を持たず、スマホのキーボードのマイク機能で代用します。
- Gemini APIキーはブラウザのlocalStorageに保存されます（暗号化はされません）。
- スマホアプリ版で書き出したバックアップファイル（JSON）を、設定画面からそのまま読み込めます（逆方向も可）。

## 開発

```bash
npm install
npm run dev
```

## ビルド・デプロイ

`main` ブランチにpushすると、GitHub Actionsが自動でビルドしてGitHub Pagesに公開します（`.github/workflows/deploy.yml`）。

このリポジトリの環境（Windows ARM64）では `npm run build` をローカル実行すると
Rolldownのネイティブバイナリがアプリケーション制御ポリシーにブロックされるため、
ビルドはCI（Ubuntu）側でのみ行う想定です。動作確認は `npm run dev` で行ってください。

## バックアップの互換性

書き出されるJSON形式はスマホアプリ版と同一です（`app: "wagako-seichou-kiroku"`）。
どちらのアプリで書き出したファイルも、もう一方の「設定」→「バックアップから復元」で読み込めます。
