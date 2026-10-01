# LCD Android / HTML v0.4.8

- 正本: D:\Godot_v4.7.2-stable_win64.exe\NamakoTsumi_v0.4
- 変更前スナップショット: D:\Codex\_snapshots\NamakoTsumi\20261001-021000-lcd-android (9ファイル、SHA256一致)
- Godot: 夜・昼・液晶、選択保存、OS日英切替、銀色ヘアライン筐体、17論理px相当のネジ、赤い操作ボタン、モノクロ液晶、中央タイトル／AUTO DEMO。
- HTMLとGodot: HUDの下46論理pxを盤面開始の最小位置として確保。必要時は盤面のセルを均等に縮小し、8×12と縦横比を維持。短い画面でも残り匹数・達成率がフレームに重ならない。
- HTMLのネジ11→17論理px、端から7px。
- Native: 下端説明の折返しを抑え、下マージンを確保。カード／うんちくのカラー画像と縦長ダイアログは維持。

検証:
- test_lcd_native.gd PASS: ja/en × 8サイズ × 3テーマ=48条件、HUD/枠余白、ボタンラベル、テーマフラグ、プレイ／デモ、ポーズ／うんちく復帰。
- ネイティブ実レンダリング日英: tests/lcd_native_ja.png、tests/lcd_native_en.png、プロセス終了コード0。
- test_pause_demo.gd PASS、test_fullheight.gd failures=0。
- HTMLブラウザー ja/en × 4サイズ=8条件 PASS、表示切替・保存・余白・ラベル・プレイ・ポーズ・うんちく、pageerrorなし。
- APK export exit0、apksigner v2/v3 true、ZIP全310項目のCRC合格、液晶素材・english_ui.json同梱。
- ARM64、minSDK24、targetSDK36、version0.4.8/code8。

制約: Android実機でのインストール、タッチ、カメラ安全領域は未確認。
