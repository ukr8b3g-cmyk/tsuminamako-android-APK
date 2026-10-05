# HTML / WebView APK v0.4.16 音声改善

- 博士入口と3枚の紹介カード: 日英で元WAVの実再生、聞き直し、BGM停止・復帰、SE OFF、閉じる・背景移行時の取り消し PASS。
- 4音声の事前取得、1回の一時失敗再試行、継続失敗打ち切り、許可拒否後の手動復旧、遅延Promise取り消し PASS。
- 320/390/430px縦画面と横画面、3テーマの既存サムネイル、追加ボタンの44pxタッチ領域、日英スクリーンショット確認 PASS。
- 既存オープニング音声、クリア音声、博士の手帳ロジック PASS。
- APK: Java→DEX→署名、同梱ファイルのバイト一致、署名v2/v3、zipalign 16KB、同じローカル署名証明書 PASS。minSDK 24 / targetSDK 36 / versionCode 16。
- APKから取り出したHTMLをHTTPSで表示し、日英の音声と聞き直し、Android戻る・背景停止・復帰、保存データ移行を確認。実機のAndroid System WebViewと音声出力は未確認です。

詳細: [音声改善](docs/NARRATION_0.4.16_JA.md)。以下は過去版の記録です。

# v0.4.10 検証

正本はmainの2c55361（v0.4.9）に今回のHTML更新とGodot実装を統合したものです。
画像・音声は既存資産を維持し、再生成したWebPはmainとGit blob SHA-1が一致しています。

- HTML: 満杯対策6条件、完成・小話12条件、既存設定画面30条件（日本語/英語・3テーマ・スマホ/PC）PASS。
- 既存Node CI対象8テスト PASS。
- Godot: 満杯・完成・デモ小話28チェック、報酬23チェック、再開19チェック、既存visual refresh PASS。
- APK: Godot export exit 0。署名v2/v3、ZIP CRC、zipalign 16KB検証 PASS。
- APK: com.namakotsumi.prototype、versionCode 10、versionName 0.4.10、minSDK 24、targetSDK 36、ARM64。
- 日本語/英語各200話、英語カード21枚の収録を確認。
- 一部Godotテスト終了時にObjectDB/resourceの解放警告が残ります。実機インストール・タッチ・画面安全領域は未確認です。

ゲームではカードのあと次の水槽へ移ります。博士は手帳ボタンから閲覧できます。デモ完成後はカードを付与せず博士を表示し、12〜40秒の待ち時間後に次のデモへ進みます。手動で開いた手帳は自動終了せず、画像拡大中はデモの待ち時間を停止します。
目標未達でも、全6形状の到達可能な残留位置がない場合だけ満員完成にします。盤面を削除・並べ替えしません。

---

# v0.4.9 検証記録

基準: 099b6c8ce80e05411f9840c0ebb1f5eb375a2d88。変更はdot環境で作成。

## 最終ソースで確認済み
- 2026-10-01 UTC: Godot 4.6.3 headless 15スイート、Node.js非描画8スイートすべて成功。描画ブラウザ試験は含まない
- Godot 4.6.3 headless: ルール39件、300ブラウザー参照配置一致
- Node.js: ルール22件、10,000配置の不変条件、100seedクリア
- 設定開閉・モード保持・盤面停止、4サイズの配置を追加検証
- 追加レビューで見つかった設定中の着地・消滅演出の進行を修正。実フレームを待つ回帰試験で、落下中の位置・時間・フェーズ・Tween・既存パーティクルの停止、設定を閉じてもポーズを維持すること、再開後に演出と落下が進むことを検証
- 上記修正後、Godot 4.6.3 headlessの全15スイートを再実行し、全アサーション成功・終了コード0を確認（下記の既存終了時リソース診断は残存）
- 既存の保存復帰・NEXT・乱数・報酬重複防止試験を再実行
- 英日UI文字幅・博士文章・カード説明の3150チェックで失敗0（この時点のソース）
- 古いデモ報酬、マッハindex、横一列設定を期待していた試験を現仕様へ更新

## 実装修正
- ブラウザー図鑑と盤面タイトルの重なり順
- タイトルとAUTO DEMOの重なり
- ブラウザーLCDのイージー推奨表示欠落
- Android戻る通知の階層処理（実機確認は未実施）
- 不足していた2つのfixtureと、明示的な再生成スクリプト
- 英語カード説明が次へボタンへ重なるケースの領域調整

## 容量
元APKのローカル監査では英語作業用PNG21枚が約39.86MB混入。正本と一致するソースだけでの再ビルドは161.10MBから121.23MBへ縮小。これは今回の最終ビルドの値ではない。
今回、カード・人物画・金属背景のGodot importを品質0.90のLossyに指定。ブラウザーの人物画6枚は同解像度のWebP品質92へ、金属背景は768pxのWebPへ変更。最終APKは60,891,771 bytes。詳しいビルド・検証結果は本書の「2026-10-02 UTC クラウドAPKビルド」を参照。

## 未完了・環境制約
- dot環境のXvfb/Chromiumはローカルソケット作成が拒否され、描画試験を開始できない
- 中間版はGodot4.7.2で実描画を確認したが、その後の配色・音量・残数表示変更を含む最終版の描画は未確認。ローカル作業はユーザー指示で終了した
- 最終版のブラウザー実画面試験は未実行（上記の環境制約）。Nodeによるロジック試験と区別する
- Android実機のタッチ、ノッチ、復帰、音、性能、16KB端末は未確認
- 公開用署名/AAB、Google Play審査は未実施
- 一部の既存Godot試験は終了時にObjectDB残存警告と「resources still in use」のERROR診断を出力する。アサーション失敗とは区別し、継続時リークの証明ではない
- セーブ破損は再現していない。今回、保存形式を変更したという意味ではない

過去の記録: docs/VERIFICATION_BEFORE_0_4_9.md。

## GitHub上の追加検証
ブラウザー設定UIを30条件（2言語×5画面/DPR×3テーマ）で確認するCIを追加。設定中の停止、閉じた後の操作復帰、音量の保存、領域内配置を検証する。CI結果は当該コミットのChecksで確認する。この文書への追加だけでは実行成功を意味しない。

## 2026-10-02 UTC クラウドAPKビルド

- Godot 4.7.2公式バイナリと同版Android export templateの公式SHA-512を照合し、Android SDK公式配布物もチェックサム照合。承認済みSDK利用規約の下で作成
- 6e327d52453ac334735b6a6e10c74a72e7c90b14時点のソースに、下記1行のエクスポート修正を適用
- scripts/card_catalog.gdの英語画像判定をFileAccess.file_existsからResourceLoader.existsへ変更。ソースでは成功していた試験が、修正前のexported PCKでは英語21件・フランス語21件失敗することを再現。修正後のPCKおよび最終APKの展開資源では計63件すべて成功
- 修正後のGodot 4.7.2 headless全15スイートとNode非描画全8スイートが成功。Godot終了時の既存ObjectDB/resource残存診断は引き続きあり
- APK生成成功、package com.namakotsumi.prototype、version 0.4.9/code9、arm64-v8a、minSdk24、targetSdk36、debuggable=true
- APKは60,891,771 bytes。記録済みv0.4.8の161,104,265 bytesから約62.2%減。50MB以下ではない
- APK Signature Scheme v2/v3検証成功、ZIP CRC成功、zipalign -c -P 16 -v 4成功。libgodot_android.soとlibc++_shared.soの全LOAD segment alignmentは0x4000
- APK内にbrowser/tests/tools/docs/builds、START.html、英語作業用PNGの混入なし
- SHA-256: 256dc216b98d19052280412f899cd6abccc5ba2d730cb09d357ef50173a25e32
- Java21、Android Build-Tools35.0.1使用。GodotのtargetSdk36との差に関するフォールバック通知あり。署名/整列検証は成功。ADB daemon接続不可の通知は実機接続がない環境によるもので、APK export自体は終了コード0
- 新規クラウドデバッグ署名。元の署名鍵は使用していない。既存アプリへの上書き不可に注意し、保存データ保護のため旧アプリを削除しない。詳細はANDROID_INSTALL_JA.md
- Android実機の起動・操作・音・描画・16KB端末での動作は未検証。Google Play公開・Release投稿はしていない
