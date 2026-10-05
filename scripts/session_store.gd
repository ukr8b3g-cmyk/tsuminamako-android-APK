extends RefCounted
const Rules = preload("res://scripts/rules.gd")

static func read(path: String) -> Dictionary:
	var config: ConfigFile = ConfigFile.new()
	if config.load(path) != OK: return {}
	var raw: Variant = config.get_value("session", "state", {})
	if not raw is Dictionary: return {}
	var s: Dictionary = raw
	if s.get("version", 0) not in [1, 2, 3] or not s.get("round", null) is String or str(s["round"]).is_empty(): return {}
	if not s.get("model", null) is Dictionary: return {}
	var data: Dictionary = s["model"]
	for key in ["next_id", "kept", "slipped", "turns", "random_state"]:
		if not data.get(key, null) is int or data[key] < 0: return {}
	if not data.get("board", null) is PackedInt32Array or data["board"].size() != 96: return {}
	for id in data["board"]:
		if id < 0: return {}
	if not data.get("pieces", null) is Dictionary or data["pieces"].size() > 48: return {}
	if not data.get("bag", null) is Array or data["bag"].size() > 6: return {}
	for index in data["bag"]:
		if not index is int or index < 0 or index > 5: return {}
	for id in data["pieces"]:
		var piece: Variant = data["pieces"][id]
		if not id is int or id <= 0 or id >= data["next_id"] or not piece is Dictionary: return {}
		if not piece.get("units", 1) is int or piece.get("units", 1) not in [1, 3]: return {}
		if s["version"] == 1 and piece.get("units", 1) != 1: return {}
		if not piece.get("cells", null) is Array or piece["cells"].size() > (12 if piece.get("units", 1) == 3 else 4): return {}
		if not piece.get("color", null) is int or piece["color"] < 0 or piece["color"] > 5: return {}
		for cell in piece["cells"]:
			if not cell is Vector2i: return {}
	if not data.get("cleared", 0) is int or data.get("cleared", 0) < 0: return {}
	var model = Rules.new()
	model.cleared = int(data.get("cleared", 0))
	model.board = data["board"]
	model.pieces = data["pieces"]
	for key in ["next_id", "kept", "slipped", "turns", "random_state"]: model.set(key, data[key])
	model.bag.assign(data["bag"])
	if not model.verify_invariants(): return {}
	if not s.get("active", null) is Array or s["active"].size() < 2 or s["active"].size() > 4: return {}
	var active: Array[Vector2i] = []
	for cell in s["active"]:
		if not cell is Vector2i: return {}
		active.append(cell)
	if not s.get("origin", null) is Vector2i or not s.get("color", null) is int or s["color"] < 0 or s["color"] > 5: return {}
	if not s.get("phase", -1) in [0, 1] or not s.get("next", null) is Dictionary: return {}
	for key in ["shape", "color"]:
		if not s["next"].get(key, null) is int or s["next"][key] < 0 or s["next"][key] > 5: return {}
	if s["phase"] == 0 and not model.is_clear() and not model.can_place(active, s["origin"]): return {}
	if str(s.get("mode", "")) == "trivia" and (not s.get("trivia_id", null) is int or s["trivia_id"] < 1 or s["trivia_id"] > 200): return {}
	if s.has("difficulty") and (not s["difficulty"] is int or s["difficulty"] < 0 or s["difficulty"] > 2): return {}
	if s.has("target_ratio") and not float(s["target_ratio"]) in [0.7, 0.8, 0.85, 0.9, 0.95]: return {}
	s["restored_model"] = model
	return s

static func write(game: Node, path: String) -> void:
	if game.round_id.is_empty() or game.reward_from_demo or game.mode in [game.Mode.DEMO, game.Mode.CLEAR]: return
	var model = game.model
	var data: Dictionary = {"board": model.board, "pieces": model.pieces, "bag": model.bag, "cleared": model.cleared}
	for key in ["next_id", "kept", "slipped", "turns", "random_state"]: data[key] = model.get(key)
	if game.lore_return_mode >= 0: return
	var state: Dictionary = {"version": 3, "round": game.round_id, "model": data, "active": game.active, "origin": game.origin, "color": game.active_color, "next": game.next_piece, "phase": 1 if game.phase == 1 else 0, "mode": "trivia" if game.mode == game.Mode.TRIVIA else "game", "trivia_id": int(game.trivia_episode.get("id", 0)), "difficulty": game.difficulty_index, "target_ratio": game.target_ratio()}
	var config: ConfigFile = ConfigFile.new()
	config.set_value("session", "state", state)
	if config.save(path) != OK: push_warning("Session could not be saved.")

static func clear(path: String) -> void:
	if FileAccess.file_exists(path): DirAccess.remove_absolute(ProjectSettings.globalize_path(path))

