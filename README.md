# つみなまこ / Tsumi Namako

Godot 4.7.2 / HTML edition. Japanese OS locale uses Japanese; other locales use English.

## v0.4.10

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
