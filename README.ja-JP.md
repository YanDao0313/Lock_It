# Lock It

`Lock It` は Electron + React + TypeScript ベースのデスクトップ自動ロックツールで、教室・実験室・オフィスなどの環境に適しています。  
**本プロジェクトは娯楽用途です。本番環境では使用しないでください。** 本番利用による結果は利用者の責任となります。

## 言語ドキュメント

- 简体中文（默认）: [README.md](./README.md)
- English (AI Translation): [README.en-US.md](./README.en-US.md)
- 日本語（AI 翻訳）: このファイル
- 한국어（AI 번역）: [README.ko-KR.md](./README.ko-KR.md)

## 主な機能

- 週間自動ロックスケジュール（1日に複数時間帯を設定可能）
- 6桁固定PINでの解錠、任意でTOTP解錠も対応
- TOTP QR バインド（デバイス名形式: `LockIt - [DeviceName]`）
  - デバイス識別名は2回目確認後にロックされ変更不可
- ロック画面スタイルのカスタマイズ（文言、配色、時刻表示、フォント設定）
- 解錠時の写真撮影と監査記録（成功/失敗、試行回数、解錠方式）
- 全記録削除前のパスワード検証（global fixed / both 設定に準拠）
- システムトレイ常駐
- 初回セットアップウィザード（Setup）

## 技術スタック

- Electron `^39.2.6`
- React `^19.2.1`
- TypeScript `^5.9.3`
- electron-vite `^5.0.0`
- Tailwind CSS `^4.1.18`
- electron-store `^11.0.2`
- otplib `^13.3.0`
- qrcode `^1.5.4`

## 開発

依存関係のインストール:

```bash
yarn
```

開発起動:

```bash
yarn dev
```

型チェック:

```bash
yarn typecheck
```

## ビルドとパッケージング

```bash
# Windows
yarn build:win

# macOS
yarn build:mac

# Linux
yarn build:linux

# ローカル解凍ビルド（テスト用）
yarn build:unpack
```

## 自動更新

本プロジェクトは `electron-updater` + GitHub Releases で構成されています。

- 配信設定: `electron-builder.yml`
  - `provider: github`
  - `owner: YanDao0313`
  - `repo: Lock_It`
- 本番環境では起動後に自動更新を確認してダウンロード
- ダウンロード完了後、アプリ終了時に自動インストール

### 新バージョンの公開

1. `package.json` の `version` を更新
2. GitHub Token を設定（repo release 権限が必要）
3. パッケージ化と公開を実行

PowerShell 例:

```powershell
$env:GH_TOKEN = "<your_github_token>"
yarn build:win
```

> `electron-builder` は設定に従ってインストーラーと更新メタデータを GitHub Releases に公開します。

## プロジェクト構成（簡易）

```text
src/
	main/       # Electron メインプロセス（window/tray/IPC/更新/スケジューラ）
	preload/    # セキュアブリッジ API（window.api）
	renderer/   # React UI（Setup / Settings / LockScreen）
```
