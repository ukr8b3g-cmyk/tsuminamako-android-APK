extends SceneTree
const Locale = preload("res://scripts/locale_text.gd")
const Cards = preload("res://scripts/card_catalog.gd")
func _initialize() -> void:
	var failures: int = 0
	for language in ["ja","en","fr"]:
		Locale.test_language = language
		var cards = Cards.new("res://tests/_unused_english_art.cfg")
		for card in cards.enabled_cards()+[cards.completion_card()]:
			var path = str(card.image)
			if (language == "ja" and path.contains("/en/")) or (language != "ja" and not path.contains("/en/")): failures += 1
			var texture = load("res://"+path) as Texture2D
			if texture == null or texture.get_width()!=1024 or texture.get_height()!=1536: failures += 1
		print("Native card art locale ", language, " cumulative failures=", failures)
	quit(0 if failures==0 else 1)
