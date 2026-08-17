# 発表・質疑カウントダウン

iPadで発表時間と質疑応答の残り時間を大きく表示する、静的HTMLのPWAです。

## iPadでアプリのように使う方法

1. このフォルダの中身をHTTPS対応の静的ホスティングに公開します。
   - GitHub Pages
   - Cloudflare Pages
   - Netlify
   - Vercel
2. iPadのSafariで公開URLを開きます。
3. 共有ボタンから「ホーム画面に追加」を選びます。
4. ホーム画面に追加された「発表タイマー」アイコンから起動します。

初回表示後は主要ファイルをキャッシュするため、通信が不安定でも表示しやすくなります。ベル音はiPadの仕様上、最初に「スタート」または「ベル確認」をタップした後に有効になります。

## GitHub Pagesで公開する場合

このリポジトリをGitHubに置き、`main`ブランチのルートをGitHub Pagesに指定します。

公開後のURL例:

```text
https://<ユーザー名>.github.io/<リポジトリ名>/
```

公開URLをiPadのSafariで開き、「ホーム画面に追加」してください。

## ファイル構成

```text
index.html
styles.css
app.js
manifest.webmanifest
service-worker.js
assets/
  icon.svg
  icon-180.png
  icon-192.png
  icon-512.png
```