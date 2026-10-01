# カード画像の英語化 完了記録

## 実装

- 20枚の図鑑カードと全員集合カード1枚を、01→20→全員集合の順に1枚ずつ英語化。各入力・出力を目視確認。
- 組み込みの image_gen を使用（編集モード、text-localization）。CLI/API生成は使用していない。
- 日本語原版は保持。英語PNGとランタイム用WebPを cards/images/en に保存。画像は1024×1536、WebP quality=94。
- 日本語ロケールは日本語原版、それ以外は英語版。HTMLの報酬・図鑑・拡大、Godotの共通カタログに適用。
- ルート START.html は両言語画像を埋め込み済み。browser/START.html は相対パス参照。
- 英語WebP合計: 9,959,940 bytes (9.50 MiB)。
- 変更前スナップショット: D:/Codex/_snapshots/NamakoTsumi/20260930-220924-english-card-art（8ファイル、作成時ハッシュ検証済み）。

## 保存先と英語表記

|番号|日本語|英語|ランク|英語画像|
|---|---|---|---|---|
|01|すなチビナマコ|Sandy Baby Namako|N|cards/images/en/card_01.webp|
|02|ももチビナマコ|Peach Baby Namako|N|cards/images/en/card_02.webp|
|03|若草のナマコ|Meadow Namako|N|cards/images/en/card_03.webp|
|04|水色のナマコ|Sky Blue Namako|N|cards/images/en/card_04.webp|
|05|さんごのナマコ|Coral Namako|R|cards/images/en/card_05.webp|
|06|ぶどうのナマコ|Grape Namako|R|cards/images/en/card_06.webp|
|07|夜凪のナマコ|Night Calm Namako|R|cards/images/en/card_07.webp|
|08|翡翠のナマコ|Jade Namako|SR|cards/images/en/card_08.webp|
|09|虹珠のナマコ|Rainbow Pearl Namako|SR|cards/images/en/card_09.webp|
|10|星潮のナマコ|Star Tide Namako|SSR|cards/images/en/card_10.webp|
|11|キングナマコ|King Namako|SECRET|cards/images/en/card_11.webp|
|12|クラウンナマコ|Clown Namako|SECRET|cards/images/en/card_12.webp|
|13|ねむりチビナマコ|Sleepy Baby Namako|N|cards/images/en/card_13.webp|
|14|かくれんぼチビナマコ|Hide-and-Seek Baby Namako|N|cards/images/en/card_14.webp|
|15|おしゃべりナマコ|Chatty Namako|R|cards/images/en/card_15.webp|
|16|いたずらナマコ|Mischievous Namako|R|cards/images/en/card_16.webp|
|17|はりきりナマコ|Eager Namako|R|cards/images/en/card_17.webp|
|18|やさしいナマコ|Gentle Namako|SR|cards/images/en/card_18.webp|
|19|たんけんナマコ|Explorer Namako|SR|cards/images/en/card_19.webp|
|20|おまつりナマコ|Festival Namako|SSR|cards/images/en/card_20.webp|
|21|やったね！ ナマコ全員集合|Hooray! All Namako Together|COMPLETE|cards/images/en/card_complete.webp|

## 生成プロンプト方針・表記セット

各カードの元画像を編集対象として指定。以下の共通方針に、上表の厳密な英語名とカード固有の外観保持条件を添えて1枚ずつ生成。

```text
Use case: text-localization.
Edit ONLY the Japanese bottom title to the exact English name listed above.
Preserve the sea cucumber appearance, pose, face, environment, lighting,
color palette, ornate frame, rarity badge, composition and full uncropped 2:3 card.
Center legible serif English lettering inside the existing nameplate
with generous margins. No other changes.
```

全員集合カードの文字指定:

```text
Replace top ribbon Japanese text with exact English "Hooray!"
in joyful shiny gold rainbow embossed lettering.
Replace bottom Japanese title with exact English "All Namako Together",
centered readable shiny gold lettering; use two balanced lines if necessary.
Keep existing "COMPLETE" top badge unchanged.
Preserve all twenty characters, faces, colors, costumes, positions,
aquarium scenery, sparkles, fishes and ornate frame. No extra text.
```

AI編集のため微細な描画の完全なピクセル一致は保証しない。外観・構図・ランクと文字の綴りを目視確認済み。

## 確認結果

- node tests/test_card_art_locale.js: PASS。ja-JP/en-US/fr-FR、21枚の登録・パス・選択を確認。
- node tests/test_i18n.js: PASS。既存のロケール/UI/100話の翻訳検証。
- node tests/test_card_art_browser.js: PASS。Edge headless、432×960、ja/en/frの各21枚を実際にデコード。図鑑21枚・拡大・全員集合報酬の画像ソースを確認、JavaScriptエラーなし。
- tests/english_card_zoom.png、tests/english_complete_reward.png: 英語版実画面キャプチャを目視確認。
- Godot --headless --editor --path . --import: 終了コード0。
- Godot --headless --path . --script res://tests/test_card_art_locale.gd: ja/en/frすべて failures=0。各21枚をTexture2Dとして読み込み、1024×1536を確認。
- 新規テストは収集状況をメモリ内で設定し、プレイヤーのセーブデータは変更していない。

## 残る範囲

- Godot側はヘッドレスで画像選択・読み込みを検証。今回Godotの実ウィンドウ画面確認は未実施。
- Android実機確認、APK作成は今回未実施。
