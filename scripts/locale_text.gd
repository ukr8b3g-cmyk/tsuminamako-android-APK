extends RefCounted
## Japanese on first launch; the explicit language selection is saved separately.
static var test_language: String = ""
static var selected_language: String = "ja"
static var preference_path: String = "user://namako_language.cfg"
static var dictionary: Dictionary = {}
static var ordered_keys: Array = []
static var missing: Array[String] = []

static func is_japanese() -> bool:
	var language: String = test_language if not test_language.is_empty() else selected_language
	return language.to_lower().replace("-", "_").split("_")[0] == "ja"

static func t(value: String) -> String:
	if is_japanese():
		return value
	load_dictionary()
	if dictionary.has(value):
		return str(dictionary[value])
	for key in ordered_keys:
		var formatted: String = number_format(value,str(key),str(dictionary[key]))
		if not formatted.is_empty(): return formatted
	var result: String = value
	for key in ordered_keys:
		result = result.replace(str(key), str(dictionary[key]))
	var japanese: RegEx = RegEx.new()
	japanese.compile("[ぁ-んァ-ヶ一-龯]")
	if japanese.search(result) != null and not missing.has(value):
		missing.append(value)
		push_warning("Missing English translation: " + value)
	return result

static func load_dictionary() -> void:
	if dictionary.is_empty():
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/english_ui.json"))
		if parsed is Dictionary:
			dictionary = parsed
		ordered_keys = dictionary.keys()
		ordered_keys.sort_custom(func(a: Variant, b: Variant) -> bool: return str(a).length() > str(b).length())

static func load_preference() -> void:
	var config := ConfigFile.new()
	selected_language = "ja"
	if config.load(preference_path) == OK:
		selected_language = "en" if str(config.get_value("ui", "language", "ja")) == "en" else "ja"

static func set_language(language: String, persist: bool = true) -> void:
	test_language = ""
	selected_language = "en" if language == "en" else "ja"
	if persist:
		var config := ConfigFile.new()
		config.set_value("ui", "language", selected_language)
		if config.save(preference_path) != OK: push_warning("Language preference could not be saved.")

static func source(value: String) -> String:
	load_dictionary()
	if value in dictionary.values(): return str(dictionary.find_key(value))
	var keys: Array = dictionary.keys()
	keys.sort_custom(func(a: Variant, b: Variant) -> bool: return str(dictionary[a]).length() > str(dictionary[b]).length())
	var result: String = value
	for key in keys:
		var formatted: String = number_format(value,str(dictionary[key]),str(key))
		if not formatted.is_empty(): return formatted
		if not str(dictionary[key]).is_empty(): result = result.replace(str(dictionary[key]), str(key))
	return result

static func number_format(value: String, from: String, to: String) -> String:
	var parts: PackedStringArray = from.split("%d")
	if parts.size()!=2 or not value.begins_with(parts[0]) or not value.ends_with(parts[1]): return ""
	var number: String = value.substr(parts[0].length(),value.length()-parts[0].length()-parts[1].length())
	return to.replace("%d",number) if number.is_valid_int() else ""

static func capture_tree(node: Node) -> void:
	if (node is Label or node is Button) and not node.has_meta("locale_source"):
		node.set_meta("locale_source", source(node.text) if not is_japanese() else node.text)
	if node is Control and not node.has_meta("locale_tooltip"):
		node.set_meta("locale_tooltip", source(node.tooltip_text) if not is_japanese() else node.tooltip_text)
	for child in node.get_children(): capture_tree(child)

static func translate_tree(node: Node) -> void:
	if node.has_meta("locale_source") and not node.get_meta("locale_dynamic",false): node.text = t(str(node.get_meta("locale_source")))
	if node.has_meta("locale_tooltip"): node.tooltip_text = t(str(node.get_meta("locale_tooltip")))
	for child in node.get_children(): translate_tree(child)
