extends RefCounted
const Locale = preload("res://scripts/locale_text.gd")
## Shared card catalog and local collection for the 20-card reward set.

const MANIFEST_PATH: String = "res://data/card_manifest.json"
const SAVE_PATH: String = "user://namako_cards.cfg"

var catalog: Dictionary = {}
var collection: Dictionary = {}
var last_grant: Dictionary = {}
var completion_seen: bool = false
var save_path: String = SAVE_PATH

func _init(collection_path: String = SAVE_PATH) -> void:
	save_path = collection_path
	load_manifest()
	load_collection()

func load_manifest() -> bool:
	var text: String = FileAccess.get_file_as_string(MANIFEST_PATH)
	if text.is_empty():
		catalog = {}
		return false
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		catalog = {}
		return false
	catalog = parsed
	for card in catalog.get("cards", []) + [catalog.get("completion_card", {})]:
		card["name"] = Locale.t(str(card.get("name", "")))
		if not Locale.is_japanese() and card.has("image_en") and FileAccess.file_exists("res://" + str(card["image_en"])):
			card["image"] = card["image_en"]
	return true

func rewards_enabled() -> bool:
	if not bool(catalog.get("rewards_enabled", false)):
		return false
	return not enabled_cards().is_empty()

func enabled_cards() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	var cards: Array = catalog.get("cards", [])
	for raw_card in cards:
		if typeof(raw_card) == TYPE_DICTIONARY:
			var card: Dictionary = raw_card
			if bool(card.get("enabled", false)):
				result.append(card)
	return result

func rank_weights() -> Dictionary:
	var result: Dictionary = {}
	var ranks: Array = catalog.get("ranks", [])
	for raw_rank in ranks:
		if typeof(raw_rank) == TYPE_DICTIONARY:
			var rank_data: Dictionary = raw_rank
			result[str(rank_data.get("id", ""))] = maxi(0, int(rank_data.get("weight", 0)))
	return result

func pick_reward(rng: RandomNumberGenerator) -> Dictionary:
	var cards: Array[Dictionary] = enabled_cards()
	if cards.is_empty():
		return {}
	var by_rank: Dictionary = {}
	for card in cards:
		var rank_id: String = str(card.get("rank", "N"))
		if not by_rank.has(rank_id):
			by_rank[rank_id] = []
		var rank_pool: Array = by_rank[rank_id]
		rank_pool.append(card)
	var weights: Dictionary = rank_weights()
	var total: int = 0
	for rank_id in by_rank.keys():
		total += maxi(0, int(weights.get(rank_id, 1)))
	if total <= 0:
		return cards[rng.randi_range(0, cards.size() - 1)].duplicate(true)
	var roll: int = rng.randi_range(1, total)
	var chosen_rank: String = str(by_rank.keys()[0])
	for rank_id in by_rank.keys():
		roll -= maxi(0, int(weights.get(rank_id, 1)))
		if roll <= 0:
			chosen_rank = str(rank_id)
			break
	var pool: Array = by_rank[chosen_rank]
	if str(catalog.get("duplicate_policy", "allow")) == "prefer_unowned_in_rank":
		var unowned: Array = []
		for card in pool:
			if owned_count(str(card.get("id", ""))) == 0:
				unowned.append(card)
		if not unowned.is_empty():
			pool = unowned
	var selected: Dictionary = pool[rng.randi_range(0, pool.size() - 1)]
	return selected.duplicate(true)

func add_to_collection(card_id: String) -> void:
	collection[card_id] = int(collection.get(card_id, 0)) + 1
	save_collection()

func grant_for_round(round_id: String, rng: RandomNumberGenerator) -> Dictionary:
	if str(last_grant.get("round", "")) == round_id:
		for card in enabled_cards():
			if card["id"] == last_grant.get("card", ""): return card
	var card: Dictionary = pick_reward(rng)
	if not card.is_empty():
		last_grant = {"round": round_id, "card": card["id"]}
		add_to_collection(str(card["id"]))
	return card

func complete() -> bool:
	return not enabled_cards().is_empty() and owned_unique_count() == enabled_cards().size()

func completion_card() -> Dictionary:
	return catalog.get("completion_card", {})

func owned_count(card_id: String) -> int:
	return int(collection.get(card_id, 0))

func owned_unique_count() -> int:
	var result: int = 0
	for card in enabled_cards():
		if owned_count(str(card.get("id", ""))) > 0:
			result += 1
	return result

func total_owned_count() -> int:
	var result: int = 0
	for card in enabled_cards():
		result += owned_count(str(card.get("id", "")))
	return result

func milestone_unlocked() -> bool:
	return owned_unique_count() >= int(catalog.get("milestone_unique", 10))

func load_collection() -> void:
	collection = {}
	var config: ConfigFile = ConfigFile.new()
	if config.load(save_path) != OK:
		return
	last_grant = config.get_value("progress", "last_grant", {})
	completion_seen = bool(config.get_value("progress", "completion_seen", false))
	if int(config.get_value("progress", "completion_size", 12)) < enabled_cards().size():
		completion_seen = false
	if not config.has_section("cards"):
		return
	for key in config.get_section_keys("cards"):
		collection[str(key)] = maxi(0, int(config.get_value("cards", key, 0)))

func save_collection() -> void:
	var config: ConfigFile = ConfigFile.new()
	config.set_value("progress", "last_grant", last_grant)
	config.set_value("progress", "completion_seen", completion_seen)
	config.set_value("progress", "completion_size", enabled_cards().size())
	for card_id in collection.keys():
		config.set_value("cards", str(card_id), int(collection[card_id]))
	var error: Error = config.save(save_path)
	if error != OK:
		push_warning("Card collection could not be saved; gameplay is unaffected.")
