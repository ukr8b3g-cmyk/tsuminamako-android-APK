extends RefCounted
## Native Windows/Android use the OS locale, independent of saved game settings.
static var test_language: String = ""
static var dictionary: Dictionary = {}
static var ordered_keys: Array = []
static var missing: Array[String] = []

static func is_japanese() -> bool:
	var language: String = test_language if not test_language.is_empty() else OS.get_locale_language()
	return language.to_lower().replace("-", "_").split("_")[0] == "ja"

static func t(value: String) -> String:
	if is_japanese():
		return value
	if dictionary.is_empty():
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/english_ui.json"))
		if parsed is Dictionary:
			dictionary = parsed
		ordered_keys = dictionary.keys()
		ordered_keys.sort_custom(func(a: Variant, b: Variant) -> bool: return str(a).length() > str(b).length())
	if dictionary.has(value):
		return str(dictionary[value])
	var result: String = value
	for key in ordered_keys:
		result = result.replace(str(key), str(dictionary[key]))
	var japanese: RegEx = RegEx.new()
	japanese.compile("[ぁ-んァ-ヶ一-龯]")
	if japanese.search(result) != null and not missing.has(value):
		missing.append(value)
		push_warning("Missing English translation: " + value)
	return result
