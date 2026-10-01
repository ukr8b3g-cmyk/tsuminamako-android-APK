# HTML液晶モード v0.4.7

## 変更
- 夜・昼・液晶の3モード。初回は夜、最後の選択を保存。
- 日本語OSロケールは日本語、その他は英語。
- 暗い銀色の細かいヘアライン素材、青緑の筐体枠、ネジ、赤い操作ボタン。
- 液晶内部は灰緑色・黒いナマコ。8×12盤面と既存ルールを維持。
- 大きい中央タイトル、デモ時のみAUTO DEMO。カード・研究手帖の画像はカラー。
- 下端説明の余白を拡張。狭いHUDでは現在値と目標を横並びにし、枠の重なりを回避。

## 確認
- 日英×8画面サイズ（320×568～1440×3200、PC1280×800）：テーマ切替・保存、ボタンラベル、左右余白、デモ／プレイ切替、ポーズ、手帖復帰、ブラウザーエラーなし。
- 最終余白修正後は日英×4代表サイズを再確認。
- test_i18n.js、test_demo_card_policy.js 合格。
- 実Android端末のタッチ操作、APKは今回未確認・未変更。

## 素材
browser/assets/lcd_metal.png：imagegen組み込みツールで作成。
生成プロンプト：Create a clean seamless brushed silver aluminum material texture for an original retro handheld game housing. Flat orthographic material only, subtle fine horizontal metallic grain, soft neutral silver gray, even lighting, no objects, no frame, no buttons, no text, no logos, no screen, no strong highlights or scratches. Entire square image filled with the same premium silver material, restrained low contrast, suitable as CSS background texture.
CSSで暗い銀色を乗算。START.htmlに素材を埋め込み、単独ファイルで動作。

## 起動
START.htmlを開き、上部の表示モードを「夜モード→昼モード→液晶」と切り替える。

## バックアップ
D:\Codex\_snapshots\NamakoTsumi\20261001-015241-lcd-html（9ファイル、コピー後SHA256一致）。
