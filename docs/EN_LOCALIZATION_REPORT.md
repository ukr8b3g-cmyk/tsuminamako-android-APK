# English localization — HTML edition (2026-09-30)

Browser primary locale ja, ja-JP or ja_JP selects Japanese. Every other locale, including an unavailable locale, selects English. The automatic selection uses navigator.language (then the primary entry in navigator.languages).

Localized: all visible HTML UI text, tooltips, accessible labels, dynamic status/reward/collection text, all 21 collectible card names, four music-track names, 100 lore titles/bodies/categories. Save keys, round IDs, episode IDs and collection IDs remain language-independent. The three character-card images switch to English assets. Other reward artwork remains unchanged as requested.

Verification: tests/test_i18n.js checks eight locale settings, source-literal and HTML-text coverage, seven application modes, 100 unique translated titles with matching IDs, no Japanese in English text, character-card open/close, standalone script and English image embedding. Existing lore and demo-card policy tests also pass. The English lore is an idiomatic condensed translation of the supplied fictional stories, including their twenty recurring closing passages.

Limits: rendered browser layout and Android hardware were not checked in this run. This change applies to the HTML edition; native Godot localization remains pending the user's scope selection. No Google Play submission or Android build was made.

Assets: browser/assets/trivia_professor_en.png, trivia_corinpre_en.png, trivia_korisuke_en.png.

Image tool: built-in image_gen. Prompt set: use case text-localization; preserve the existing portrait character artwork, pose, scenery, ornate gold border and parchment panel; replace the Japanese title and description with accurately spelled English; no rarity rank; maintain portrait 2:3. The exact English copy is transcribed below.

Professor: Dr. Gabojoyick Behesoner
A member of Kalu Arawiin University's first class—graduated last. Self-sufficient on a remote island, with the occasional fishing trip. Sixty years studying Tsumi Namako. He never eats his research subjects. Even he has forgotten his age.

Dolphin: Corinne Pre
The doctor's partner at sea. Following the scent of rare Tsumi Namako, this dolphin guides him to new discoveries.

Dog: Ninepo Yamada Korisuke
The doctor's assistant. Demands a walk every day at 5 p.m. Loves eating Tsumi Namako, much to the doctor's alarm—his research specimens are never quite safe.

The professor's first sentence was corrected after inspection to describe the first graduating cohort rather than the first individual graduate.

## OS locale support (Windows / Android)
Native Godot uses OS.get_locale_language(): ja selects Japanese; every other language selects English. UI, music labels, card names and the native factual 100-story dataset are localized. Native story IDs/source references remain identical; the HTML fictional dataset is kept separate. PLAY_BROWSER.cmd passes the Windows user OS locale into HTML, taking priority over browser language. Directly opening HTML without a native bridge or launcher uses browser language, because browser JavaScript does not expose a separate OS locale. Existing Android APKs are unchanged; these changes apply on the next build.

OS-locale verification passed: Godot 4.7.2 loaded all changed native scripts without parse/compile errors; 8 locale branches, all native UI literals, 100 factual stories and 20 reward card names passed. The current Windows OS reports ja. HTML bridge/launcher OS locale wins over conflicting browser languages in both directions. Android launcher label uses an English default and a Japanese localized application name, effective on the next build.
References: https://docs.godotengine.org/en/4.3/classes/class_os.html and https://docs.godotengine.org/en/4.3/classes/class_projectsettings.html
