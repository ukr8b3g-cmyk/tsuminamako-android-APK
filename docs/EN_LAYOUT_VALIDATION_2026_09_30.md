# 英語UIのレイアウト確認（2026-09-30）

対象正本: `D:\Godot_v4.7.2-stable_win64.exe\NamakoTsumi_v0.4`。
HTMLはbrowserソースと再生成したSTART.html、Godotは同プロジェクトのスクリプトに反映。

## 修正

- 設定5ボタンの幅を揃え、「Speed Mach」と最長BGM名が収まる幅・文字サイズへ調整。日本語のマッハ/最長曲名も同じ問題を解消。
- 英語のResume/New Gameの文字サイズを統一し、New Gameの広い文字間隔を除去。
- 英語HUDを一行表示にし、フッターの文字高さを確保。
- HTML英文本文は改行を保ちながら余分な空白を通常の英文として処理。
- Godotの長い英文博士見出しを本文に重ならないサイズへ調整。
- Godot図鑑名を最大3行に折り返し、タイル下部の余白を確保。
- Godotの博士/カード画面に専用テーマを適用。紙面・報酬の明るい背景の上では濃い文字色を保ち、夜モードの図鑑は暗い背景と明るい文字に統一。

## 検証済み

- 日本語/英語 × ライト/ダーク。サイズは540×860、360×640、360×800、390×844、412×915、480×960、635×1036、1440×3200。
- HTML: 実Edgeのヘッドレス描画で4144ケース、失敗0。デモ、再開/新規、プレイ、ポーズ、全100話、図鑑、全21報酬画像の見出し/説明を確認。390/412などはdeviceScaleFactor=3で検証。
- Godot 4.7.2: 3150項目、失敗0。設定ボタン同士の重なり、全文字幅、全100話の見出し/本文、図鑑名、報酬説明、ボード/ステータスの間隔を確認。
- GodotはWindows上のOpenGL Compatibilityレンダラーでも実描画し、390×844のライト/ダーク、博士、図鑑、コンプリート報酬のスクリーンショットを目視確認。
- 既存test_i18n.js / test_lore_viewer.js / test_demo_card_policy.js / test_os_locale.gd / test_responsive.gdも成功。
- 検証プロセスは終了。実ユーザーの設定/コレクションは変更せず、Godotの一時チェックポイントは終了時に削除。

再検証: tests/test_english_layout.js（既存Playwrightが必要）とtests/test_english_layout.gd。画像・JSON証跡はtests/english_layout_validation。

## 制約

Android端末での実機確認とAPK再作成は未実施。Androidのシステムフォント、ノッチ/システムバーの実測結果ではない。
画像内に描かれた報酬カードの日本語は今回のUI対象外。
変更前10ファイルのハッシュ一致バックアップ: D:\Codex\_snapshots\NamakoTsumi\20260930-212858-english-layout。
