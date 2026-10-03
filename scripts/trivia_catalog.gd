extends RefCounted
const Locale = preload("res://scripts/locale_text.gd")
## The supplied 100-episode dataset, shared by native and browser builds.

const DATA_PATH: String = "res://data/namako_episodes_100.json"
const HISTORY_PATH: String = "user://namako_trivia.cfg"
var episodes: Array = []
var sources: Dictionary = {}
var last_id: int = 0
var remaining: Array[int] = []

func _init() -> void:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(DATA_PATH if Locale.is_japanese() else "res://data/namako_episodes_100_en.json"))
	if parsed is Dictionary:
		episodes = parsed.get("episodes", [])
		sources = parsed.get("sources", {})
	var history: ConfigFile = ConfigFile.new()
	if history.load(HISTORY_PATH) == OK:
		last_id = int(history.get_value("history", "last_id", 0))
		var ids: Variant = history.get_value("history", "remaining", [])
		if ids is Array:
			for id in ids:
				if id is int and not by_id(id).is_empty() and not remaining.has(id): remaining.append(id)

func by_id(id: int) -> Dictionary:
	for raw in episodes:
		if raw is Dictionary and int(raw.get("id", 0)) == id:
			return raw
	return {}

func pick(rng: RandomNumberGenerator) -> Dictionary:
	if episodes.is_empty(): return {}
	if remaining.is_empty():
		for episode in episodes: remaining.append(int(episode["id"]))
		for i in range(remaining.size()-1, 0, -1):
			var j: int = rng.randi_range(0, i)
			var temp: int = remaining[i]
			remaining[i] = remaining[j]
			remaining[j] = temp
		if remaining.size() > 1 and remaining[-1] == last_id:
			var temp: int = remaining[-1]
			remaining[-1] = remaining[0]
			remaining[0] = temp
	last_id = remaining.pop_back()
	var history: ConfigFile = ConfigFile.new()
	history.set_value("history", "last_id", last_id)
	history.set_value("history", "remaining", remaining)
	history.save(HISTORY_PATH)
	return by_id(last_id)
