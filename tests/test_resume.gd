extends SceneTree
const Catalog = preload("res://scripts/card_catalog.gd")
const Session = preload("res://scripts/session_store.gd")
const Rules = preload("res://scripts/rules.gd")
const BoardView = preload("res://scripts/board_view.gd")
const SAVE = "res://tests/_resume_roundtrip.cfg"
const CARDS = "res://tests/_resume_cards.cfg"
var failures: int = 0
func check(ok: bool, label: String) -> void:
	print("PASS: " if ok else "FAIL: ", label)
	if not ok: failures += 1
func _initialize() -> void:
	call_deferred("run")
func make_game() -> Node:
	var game: Node = load("res://Main.tscn").instantiate()
	game.session_path = SAVE
	root.add_child(game)
	game.cards = Catalog.new(CARDS)
	game.sound.settings_path = "res://tests/_resume_settings.cfg"
	return game
func run() -> void:
	Session.clear(SAVE)
	Session.clear(CARDS)
	var legacy_path: String = "res://tests/_legacy_cards.cfg"
	var legacy_save: ConfigFile = ConfigFile.new()
	legacy_save.set_value("progress", "completion_seen", true)
	for old_card in Catalog.new(CARDS).enabled_cards().slice(0, 12):
		legacy_save.set_value("cards", str(old_card["id"]), 1)
	legacy_save.save(legacy_path)
	var migrated: RefCounted = Catalog.new(legacy_path)
	check(migrated.owned_unique_count() == 12 and not migrated.completion_seen, "legacy twelve-card save retains cards and reopens completion")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(legacy_path))
	var game: Node = make_game()
	game.apply_layout_for_size(Vector2i(540,860))
	var settings: Array = [game.theme_button, game.track_button, game.speed_button, game.music_button, game.sfx_button]
	var settings_aligned: bool = true
	for i in range(1, settings.size()):
		settings_aligned = settings_aligned and settings[i].position.x == settings[0].position.x and settings[i - 1].position.y + settings[i - 1].size.y < settings[i].position.y
	check(settings_aligned, "settings panel has non-overlapping touch controls")
	check(game.board_view.size.is_equal_approx(Vector2(game.board_view.cell_size * Rules.COLS, game.board_view.cell_size * Rules.ROWS)), "native board has square aligned cells")
	check(game.ui_title.position.y + game.ui_title.size.y <= game.ui_mode.position.y, "native title and demo caption are separated")
	check(game.board_view.position.y + game.board_view.size.y < game.ui_status.position.y and game.ui_status.position.y + game.ui_status.size.y < game.start_button.position.y, "native board, message and buttons are separated")
	game.begin_play()
	game.hard_drop()
	game.spawn_piece()
	game.pause_game()
	var expected: Dictionary = Session.read(SAVE)
	check(not expected.is_empty(), "valid native checkpoint")
	var resumed: Node = make_game()
	resumed.resume_saved()
	check(resumed.mode == resumed.Mode.PAUSED, "resume waits for user")
	check(resumed.model.board == game.model.board and resumed.active == game.active and resumed.origin == game.origin and resumed.next_piece == game.next_piece and resumed.model.random_state == game.model.random_state and resumed.model.bag == game.model.bag, "board, active, next and RNG roundtrip")
	resumed.speed_index = 4
	check(resumed.speed_multiplier() == 3.0, "Mach capped during play")
	resumed.mode = resumed.Mode.DEMO
	check(resumed.speed_multiplier() == 6.0, "Mach enabled in demo")
	resumed.mode = resumed.Mode.PLAY
	resumed.sound.music_enabled = false
	resumed.sound.cycle_track()
	check(not resumed.sound.music.playing and resumed.sound.track_index == 1, "track change preserves music OFF")
	for card in resumed.cards.enabled_cards():
		if str(card["id"]) != "card_12": resumed.cards.add_to_collection(card["id"])
	for rank in resumed.cards.catalog["ranks"]: rank["weight"] = 100 if rank["id"] == "SECRET" else 0
	resumed.model.reset(123)
	for i in range(120):
		if resumed.model.is_clear(): break
		var spec: Dictionary = resumed.model.next_spec()
		var plan: Dictionary = resumed.model.demo_choice(resumed.model.shape(spec["shape"]))
		resumed.model.commit(plan["cells"], plan["origin"], spec["color"])
	resumed.show_clear()
	resumed.finish_celebration()
	check(resumed.cards.total_owned_count() == 20 and resumed.cards.complete(), "twentieth card completes collection")
	var reloaded: Node = make_game()
	reloaded.resume_saved()
	check(reloaded.mode == reloaded.Mode.REVEAL and reloaded.cards.total_owned_count() == 20, "reload after reward does not grant twice")
	reloaded.finish_reward()
	check(reloaded.showing_complete and reloaded.card_ui.current_rank == "COMPLETE" and reloaded.card_ui.reward_front.texture != null, "all-together completion card displayed")
	reloaded.finish_reward()
	check(reloaded.cards.completion_seen and reloaded.mode == reloaded.Mode.TRIVIA and not Session.read(SAVE).is_empty(), "completion leads to saved professor episode")
	var episode_id: int = int(reloaded.trivia_episode["id"])
	var notebook: Node = make_game()
	notebook.resume_saved()
	check(notebook.mode == notebook.Mode.TRIVIA and int(notebook.trivia_episode.get("id", 0)) == episode_id, "same episode survives reload")
	notebook.queue_free()
	await process_frame
	reloaded.finish_trivia()
	check(reloaded.mode == reloaded.Mode.PLAY and reloaded.round_id != str(expected["round"]), "next stage starts a fresh round")
	reloaded.open_collection()
	check(reloaded.card_ui.collection_grid.get_child_count() == 21, "bonus in collection outside twenty slots")
	var bad: ConfigFile = ConfigFile.new()
	bad.set_value("session", "state", {"version": 1, "round": "broken"})
	bad.save(SAVE)
	check(Session.read(SAVE).is_empty(), "invalid checkpoint safely ignored")
	for node in [game, resumed, reloaded]: node.queue_free()
	await process_frame
	Session.clear(SAVE)
	Session.clear(CARDS)
	Session.clear("res://tests/_resume_settings.cfg")
	print("RESUME_FAILURES=", failures)
	quit(1 if failures else 0)
