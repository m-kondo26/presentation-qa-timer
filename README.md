# 発表・質疑カウントダウン

iPhoneとiPadで発表時間と質疑応答の残り時間を大きく表示する、縦向き・横向き対応の静的HTML PWAです。

このリポジトリには、別ページとして学校チャイムツールも含まれます。ネット時刻に同期し、設定した曜日と授業の開始・終了時刻にチャイムを鳴らします。初期時間割は次のとおりです。

- 1限: 8:40〜10:10
- 2限: 10:30〜12:00
- 3限: 13:00〜14:30
- 4限: 14:50〜16:20
- 5限: 16:40〜18:10
- 6限: 18:30〜20:00

時間割、使用曜日、音量は学校チャイム画面で変更でき、端末内に自動保存されます。

新規利用者には英語で表示され、右上の言語ボタンから日本語へ切り替えられます。公開URLへのリンクを研究室や学会のWebサイトへ掲載して利用できます。

## iPhone・iPadでアプリのように使う方法

1. このフォルダの中身をHTTPS対応の静的ホスティングに公開します。
   - GitHub Pages
   - Cloudflare Pages
   - Netlify
   - Vercel
2. iPhoneまたはiPadのSafariで公開URLを開きます。
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

学校チャイムの公開URL:

```text
日本語: https://m-kondo26.github.io/presentation-qa-timer/school-bell/?lang=ja
English: https://m-kondo26.github.io/presentation-qa-timer/school-bell/?lang=en
```

研究室Webからは、このURLへ直接リンクしてください。

## ファイル構成

```text
index.html
styles.css
app.js
manifest.webmanifest
service-worker.js
school-bell/
  index.html
  styles.css
  app.js
  scheduler-core.js
  manifest.webmanifest
  manifest-en.webmanifest
assets/
  icon.svg
  icon-180.png
  icon-192.png
  icon-512.png
```
