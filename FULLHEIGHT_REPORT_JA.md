# 0.4.4 縦長画面の活用

## 修正
- 曲名を『ぽにゅ散歩』へ短縮。英語はSquishy Stroll。
- 設定列の外枠をx12〜528、ボタンをx18〜520へ配置し、左右のはみ出しを解消。文字サイズと高さは維持。
- HTML/Godotの博士画面を、取得した利用可能な画面高さに合わせて上下16の余白まで拡張。追加の高さは研究手帖へ割り当て、本文サイズを維持したままスクロールを減らす。下部ボタンはパネルの下端に追従。
- カード獲得画面も高さに追従。画像は2:3を維持し、最大440×660の論理サイズで表示。タイトル・名前・次ボタンの領域を確保。
- 博士の画像カード拡大も高さに追従。タイトルがオーバーレイの前面に残る重なりを修正。
- Godotのカード獲得画面のダーク配色を明示的に適用。
- Androidの安全領域処理は0.4.3の実装を維持。

## 確認
- tests/test_fullheight.js: 実Edge、日英・ライト/ダーク、360×640、390×844、412×915、1440×3200、PC1280×800の20ケースPASS。設定列枠内、文字幅、パネル高さ、カード比率と重なり、ボタン収まり、ポーズ・閲覧復帰、スクロールを確認。
- tests/test_mobile_readability.gd: failures=0。最長設定表示・3倍速・ポーズ・閲覧から復帰。
- tests/test_fullheight.gd: 日英4サイズ・100話の表示・伸縮・カード比率を確認、failures=0。
- 同GodotテストをOpenGL/NVIDIA実描画で実行、failures=0。日英ライト/ダークの博士・カード画面をキャプチャし、重なりと視認性を目視確認。
- tests/test_i18n.js / tests/test_os_locale.gd: PASS。
- Godotインポート・APK出力完了。署名v2/v3とZIP整合性PASS。

## 成果物
- START.html / browser/START.html
- builds/tsuminamako-0.4.4-fullheight-debug.apk
- 0.4.4 / versionCode5 / com.namakotsumi.prototype / ARM64 / Android7以上
- APK:159,346,679 bytes
- SHA256:E54262ED5BC1627B166D12FED4CCA73F220BE65957EFB00401E16F69AA95CD52

## 未確認
Android実機のインストール、カメラ安全領域、OSフォントによる最終の文字幅、タッチ操作は未確認。

## スナップショット
D:/Codex/_snapshots/NamakoTsumi/20261001-001703-fullheight-panels
変更前16ファイル、コピー時ハッシュ確認済み。
