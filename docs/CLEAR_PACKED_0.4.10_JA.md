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
