# つみなまこ / Tsumi Namako

## スマートフォンでテストプレイ

**[ブラウザーで遊ぶ](https://ukr8b3g-cmyk.github.io/tsuminamako-android-APK/)**

AndroidのChromeやiPhoneのSafariでリンクを開くと遊べます。初回は図解付きの遊び方が出るので、「デモを見る」または「遊ぶ」を選んでください。ゲーム中の「メニュー」から遊び方を再表示できます。設定の日英ボタンで切替できます。

スライドで移動、タップで回転、下へスワイプで落下。画面下のボタンでも操作できます。縦向きを推奨し、横向きでは画面を縦にスクロールして全ての操作へアクセスできます。

Web公開は `.github/workflows/pages.yml` が `main` 更新時に行います。`tools/build_web_site.py` がブラウザーに必要なファイルだけをまとめます。APK・Godotプロジェクト・デバッグ情報はWeb配布物に含みません。

Godot 4.7.2 / HTML edition. First launch uses Japanese. Settings has a Japanese/English button; the selected language is saved.

## v0.4.14 local build

Switch Japanese/English from the Settings header without restarting a round. Buttons, rules, current status, cards, companion artwork and the 200-story notebook change together; reading history and collected cards are preserved. On a same-colour match, the boundaries stretch together, the connected jelly briefly wobbles, then bubbles appear and the body fades. The sequence lasts 0.9s; reduced motion uses a 0.35s fade. The matching rule and difficulty are unchanged.

Local HTML: `START.html`. Local APK: `builds/tsuminamako-0.4.14-language-jelly-debug.apk` (versionCode 14, original debug key). See [implementation and verification](docs/LANGUAGE_JELLY_0.4.14_JA.md). Physical Android checks remain outstanding.

## v0.4.13 local build

Three or more touching namako of the same colour turn into bubbles and disappear. Keep colours apart to fill the tank. Easy has 6 colours, a 70% goal, slower falling and a guide that avoids matching groups; Normal has 4 colours with a 90% goal; Hard has 3 colours with a 95% goal. A matching group always disappears. LCD uses 1–6 dots to distinguish colours. The previous bubble sound and fancy skin are retained. Version 3 checkpoints record removed creatures and still read v1 ordinary and v2 large-creature saves.

Local HTML: `START.html`. Local APK: `builds/tsuminamako-0.4.13-same-color-debug.apk` (versionCode 13, original debug key). See [rules and verification](docs/SAME_COLOR_0.4.13_JA.md). Physical Android checks remain outstanding.

## v0.4.12 local build

Three touching ordinary namako merge into one larger namako, regardless of colour. Occupied cells and progress are preserved; one large namako can support a landing. A brief squash, bubble ring, sparkles and a newly synthesized pop sound accompany the merge. Pause and reduced motion are supported. Light/dark skins have wet shading, mottling and blunt papillae; LCD retains its monochrome look. Version 2 checkpoints include merged creatures and still read ordinary version 1 saves.

Local HTML: `START.html`. Local APK: `builds/tsuminamako-0.4.12-merge-debug.apk` (versionCode 12, original debug key). See [verification and rules](docs/MERGE_0.4.12_JA.md). This revision has not been pushed to GitHub; physical Android checks remain outstanding.

## v0.4.11 local build

Easy now uses a 70% target (68 of 96 cells) and 75% of the selected falling speed. A blocked central inlet moves to an open inlet, rotating or replacing the shape when necessary. Legal sideways routes under a roof are assisted using actual moves. When no retaining placement remains, gameplay shows Tank Full with New Game and Back to Demo; this does not award a clear card. A blocked demo waits briefly and restarts. Normal/Hard targets remain 90%/95%. Prior Easy checkpoints also use the relaxed 70% target; valid mid-fall positions are retained.

Local APK: `builds/tsuminamako-0.4.11-top-entry-easy-debug.apk` (versionCode 11, original local debug key). HTML: generate `START.html` with the existing build tool. This local revision has not been pushed to GitHub. See [verification](docs/TOP_ENTRY_EASY_0.4.11_JA.md).

## v0.4.10

[Latest corrected APK: demo cards and speed controls](https://github.com/ukr8b3g-cmyk/tsuminamako-android-APK/releases/download/v0.4.10/tsuminamako-0.4.10-demo-cards-debug.apk). This revision moves the LCD screws inside the housing, restores direct demo speed selection (including Mach), and lets you open the card collection manually during demo. The collection button stays in the same position as gameplay; opening it pauses the demo and closing it resumes. Demo does not award cards. See [patch verification](docs/DEMO_CARDS_PATCH_0.4.10_JA.md).

[Download APK v0.4.10](https://github.com/ukr8b3g-cmyk/tsuminamako-android-APK/releases/download/v0.4.10/tsuminamako-0.4.10-clear-debug.apk). ARM64, Android 7.0+, debug signed with the original local v0.4.8 key. The cloud-built v0.4.9 APK used another key; do not uninstall an existing app just to bypass a signature mismatch, as local saves may be lost.

Targets: Easy 85%, Normal 90%, Hard 95%. An unreachable shape is replaced by one that fits; a tank with no reachable retaining placement is completed without deleting creatures. Final landing (0.5s), board view (1s), then fanfare (0.8s) precede the collectible card and next tank. Gameplay does not automatically show the professor. Demo shows notes without awarding cards and waits 12-40s before restarting. Notes now contain 200 Japanese/English fictional tales; the original 100 are preserved. Settings, volume, reduced motion and optimized artwork from v0.4.9 are retained.

See [verification](docs/BUILD_VERIFICATION_0.4.10.json). Physical Android installation/touch checks remain outstanding. This is a test APK, not a Play Store release.

## v0.4.9 development source

[Download the complete v0.4.9 APK](builds/tsuminamako-0.4.9-polish-debug.apk?raw=true). The source in this branch matches the runtime-source hashes in [the build verification record](docs/BUILD_VERIFICATION_0.4.9.json).

**Keep your old app installed.** This test build uses a different debug signing key, so upgrading an existing installation may be rejected. Uninstalling may lose local saves. Use a test device without the old app. Physical Android testing remains outstanding.

This branch includes the visual refresh, consolidated settings, reduced motion, Android Back routing, asset import optimization, estimated remaining namako, and a persistent music-volume control. It is not yet a signed Play Store release. See TEST_REPORT_JA.md for the precise test coverage and remaining device checks.

Build the browser preview with `python tools/build_browser.py`, then refresh source/artifact hashes with `python tools/update_build_metadata.py`. `--check` verifies that metadata is current. Only artifacts actually present are hashed; no earlier APK is represented as a new build.

## Previous release download

[APK v0.4.8 and full source ZIP](https://github.com/ukr8b3g-cmyk/tsuminamako-android-APK/releases/tag/v0.4.8)

APK: ARM64, Android 7.0+, debug signed. Full source ZIP includes original English PNG card artwork. SHA-256 checksums are included in Releases.

main contains source code and runtime artwork/audio. Original English PNG working images are in the full-source ZIP; the game uses WebP images committed here.

Open project.godot with Godot. Generate standalone START.html with `python tools/build_browser.py`.

See ANDROID_INSTALL_JA.md and LCD_ANDROID_REPORT_JA.md for verification. Physical Android device installation, touch and camera safe areas have not yet been tested.
