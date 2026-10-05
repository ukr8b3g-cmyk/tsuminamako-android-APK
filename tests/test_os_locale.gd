extends SceneTree
const Locale = preload("res://scripts/locale_text.gd")
const Main = preload("res://scripts/main.gd")
const Cards = preload("res://scripts/card_catalog.gd")
const Trivia = preload("res://scripts/trivia_catalog.gd")

func _initialize() -> void:
	var cases: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://tests/native_translation_cases.json"))
	var japanese: RegEx = RegEx.new()
	japanese.compile("[ぁ-んァ-ヶ一-龯]")
	for language in ["ja", "ja_JP", "ja-JP", "en", "en_US", "fr", "zh_CN", "de"]:
		Locale.test_language = language
		var expected: bool = language.begins_with("ja")
		assert(Locale.is_japanese() == expected)
		for value in cases:
			var result: String = Locale.t(str(value))
			assert(result == value if expected else japanese.search(result) == null, str(value) + " => " + result)
		var lore: RefCounted = Trivia.new()
		assert(lore.episodes.size() == 200)
		for episode in lore.episodes:
			assert(int(episode.id) > 0)
			assert(expected or japanese.search(str(episode.title) + str(episode.body)) == null)
		var cards: RefCounted = Cards.new("user://_locale_test_unused.cfg")
		for card in cards.enabled_cards():
			assert(expected or japanese.search(str(card.name)) == null)
	assert(Locale.missing.is_empty())
	Locale.test_language = ""
	Locale.selected_language = "ja"
	assert(Locale.is_japanese(), "default is Japanese regardless of OS locale")
	print("PASS native translation fixtures: 8 language branches, all UI literals, 200 stories, collectible names; initial language Japanese")
	quit(0)
