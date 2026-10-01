# 0.4.3 スマートフォン文字・操作改善

## 変更
- HTML / Godot: ゲーム速度1・1.5・2・3倍、デモのマッハは維持。
- タイトルを水槽左上に移し、上部に難易度・ポーズ・うんちく・図鑑を配置。
- 小さい設定文字・状態表示を拡大。長い曲名やOFF表示が収まるよう横幅を調整。下部のスタート・続きの文字サイズは維持。
- 研究手帖の話番号・見出し・本文を拡大。Godotも長文をスクロールで読める。
- Godotにうんちくの入口・もう1話・閉じるを実装。ゲームを止めて閲覧し、閉じると元の状態へ復帰。閲覧中のセーブ上書きを防止。
- Godotの100話をHTMLと同じv2.1へ統一。博士・犬・イルカの既存日英画像6枚をネイティブへ収録。
- Android: DisplayServer.get_display_safe_areaを使用し、上・下・左右の安全領域を確保。移動・縮小に合わせて盤面の入力座標を変換。タッチからマウス入力への変換を明示。
- バージョン0.4.3 / code4、同じパッケージ・署名。

## 確認
- tests/test_mobile_readability.js: Edge実ブラウザー、ja/en・ライト/ダーク・360x640/390x844/412x915/1440x3200の16ケースPASS。最長設定文字、3倍速、ポーズ、談話、元位置への復帰、スクロールを確認。
- tests/test_mobile_readability.gd: 日英・4サイズ・4曲・5速度・両テーマ、文字幅と談話/ポーズ復帰を検証、failures=0。
- Godot実描画: 同テストをNVIDIA OpenGLで実行、failures=0。tests/native_readable_*の実画像を確認。
- tests/test_i18n.js、tests/test_os_locale.gd: PASS。
- APK: v2/v3署名検証PASS、ZIP整合性PASS。日英100話JSON、日英博士/仲間画像6枚、英語WebPカード21枚同梱。
- APK: 159,346,679 bytes。SHA256: 9B76E55C6946B8ECFAF50265FBFBE3EC72869D6101D29B70A5E14CF7E5AD711E。

## 未確認
Android実機でのインストール、カメラ安全領域の実際の見え方、OSフォントによる最終表示、タッチ操作は未実施。

## 復元用
D:/Codex/_snapshots/NamakoTsumi/20260930-231720-mobile-readability
変更前の主要14ファイルはコピー時ハッシュ照合済み。追加で旧100話JSON・セッション処理・インストール案内も保管。
