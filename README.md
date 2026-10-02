# つみなまこ / Tsumi Namako

Godot 4.7.2 / HTML edition. Japanese OS locale uses Japanese; other locales use English.

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
