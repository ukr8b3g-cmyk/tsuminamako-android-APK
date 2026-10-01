extends RefCounted
const Locale = preload("res://scripts/locale_text.gd")
## The supplied 100-episode dataset, shared by native and browser builds.

const DATA_PATH: String = "res://data/namako_episodes_100.json"
const HISTORY_PATH: String = "user://namako_trivia.cfg"
var episodes: Array = []
var sources: Dictionary = {}
var last_id: int = 0

func _init() -> void:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(DATA_PATH if Locale.is_japanese() else "res://data/namako_episodes_100_en.json"))
	if parsed is Dictionary:
		episodes = parsed.get("episodes", [])
		sources = parsed.get("sources", {})
	var history: ConfigFile = ConfigFile.new()
	if history.load(HISTORY_PATH) == OK:
		last_id = int(history.get_value("history", "last_id", 0))

func by_id(id: int) -> Dictionary:
	for raw in episodes:
		if raw is Dictionary and int(raw.get("id", 0)) == id:
			return raw
	return {}

func pick(rng: RandomNumberGenerator) -> Dictionary:
	if episodes.is_empty():
		return {}
	var index: int = rng.randi_range(0, episodes.size() - 1)
	if episodes.size() > 1 and int(episodes[index].get("id", 0)) == last_id:
		index = (index + 1 + rng.randi_range(0, episodes.size() - 2)) % episodes.size()
	var episode: Dictionary = episodes[index]
	last_id = int(episode.get("id", 0))
	var history: ConfigFile = ConfigFile.new()
	history.set_value("history", "last_id", last_id)
	history.save(HISTORY_PATH)
	return episode
