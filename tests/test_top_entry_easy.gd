extends SceneTree
const Rules = preload("res://scripts/rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")
const Session = preload("res://scripts/session_store.gd")
const Locale = preload("res://scripts/locale_text.gd")
var failures: int = 0
func check(ok: bool, label: String) -> void:
	print("PASS: " if ok else "FAIL: ", label)
	if not ok: failures += 1
func _initialize() -> void: call_deferred("run")
func fixture(model, kind: String) -> void:
	model.reset(1)
	var id: int = 1
	var wall: Array[Vector2i] = [Vector2i(1,6),Vector2i(1,7),Vector2i(1,8),Vector2i(0,8)]
	for y in range(12):
		if kind == "roof" and y in [1,2,3]: continue
		for x in range(0,8,2):
			var cells: Array[Vector2i] = []
			for column in [x,x+1]:
				var point: Vector2i = Vector2i(column,y)
				if kind == "shaft" and column == 7: continue
				if kind == "cave" and ((column == 0 and y < 8) or (column in [1,2,3] and y in [3,4]) or point in wall): continue
				cells.append(point)
			if cells.is_empty(): continue
			model.pieces[id] = {"cells":cells,"color":id%6}
			for point in cells: model.board[point.y*8+point.x] = id
			id += 1
	if kind == "cave":
		model.pieces[id] = {"cells":wall,"color":0}
		for point in wall: model.board[point.y*8+point.x] = id
		id += 1
	model.next_id = id
	model.kept = model.pieces.size()
	model.turns = model.kept
func run() -> void:
	for language in ["ja", "en"]:
		Locale.test_language = language
		var game = load("res://Main.tscn").instantiate()
		game.session_path = "user://top_entry_test_session.cfg"
		root.add_child(game)
		game.set_process(false)
		game.board_view.set_process(false)
		game.sound.music_enabled = false
		game.sound.sfx_enabled = false
		game.sound.music.stop()
		game.cards = Catalog.new("user://top_entry_test_cards.cfg")
		game.cards.collection.clear()
		game.cards.last_grant.clear()
		game.begin_play()
		game.difficulty_index = 1
		fixture(game.model, "shaft")
		check(game.model.verify_invariants(), "valid one-column entrance fixture")
		var before = game.model.board.duplicate()
		game.next_piece = {"shape":3,"color":2}
		game.spawn_piece()
		check(game.origin.x == 7 and game.model.width(game.active) == 1, "narrow rotated replacement spawns in open right entrance")
		check(game.model.board == before, "entry selection leaves stack unchanged")
		check(game.model.preview(game.active,game.model.landing(game.active,game.origin))["keep"], "actual chosen entry can land inside tank")
		game.origin = Vector2i(3,-1)
		game.lock_piece()
		check(game.origin.x == 7 and game.phase == 0 and game.model.board == before, "overflow recovers before commit; no stuck spawn loop")
		fixture(game.model, "roof")
		before = game.model.board.duplicate()
		var owned: int = game.cards.total_owned_count()
		game.next_piece = {"shape":0,"color":0}
		game.spawn_piece()
		check(game.mode == game.Mode.STUCK and game.modal.visible and game.modal_primary.text == Locale.t("はじめから"), "sealed roof shows touch retry button")
		check(game.model.board == before and game.cards.total_owned_count() == owned, "stuck is not clear; no cards or stack changes")
		check(not Session.read(game.session_path).is_empty(), "stuck checkpoint is readable, not just left in memory")
		game.resume_saved()
		check(game.mode == game.Mode.STUCK and game.modal.visible, "stuck checkpoint reload returns to retry screen")
		game.modal_primary.pressed.emit()
		check(game.mode == game.Mode.PLAY and game.model.fill_count() == 0 and not game.board_view.frozen, "retry button starts a fresh tank")
		game.origin = Vector2i(2,3)
		game.ensure_playable_tank()
		check(game.origin == Vector2i(2,3), "valid mid-fall checkpoint stays at its saved location")
		game.difficulty_index = 0
		game.speed_index = 0
		game.round_target = 0.85
		check(is_equal_approx(game.target_ratio(),0.7) and is_equal_approx(game.speed_multiplier(),0.75), "Easy relaxes old 85% checkpoint to 70% and slows fall")
		for i in range(68): game.model.board[i] = 1
		check(game.goal_reached(), "Easy clears at 68 occupied cells out of 96")
		game.show_clear()
		game.finish_celebration()
		check(game.mode == game.Mode.REVEAL and game.cards.total_owned_count() == owned+1, "real Easy clear still awards one card")
		game.begin_demo()
		fixture(game.model,"roof")
		game.spawn_piece()
		check(game.mode == game.Mode.DEMO and game.phase == 2, "blocked demo waits without a reward")
		for i in range(40): game._process(0.05)
		check(game.mode == game.Mode.DEMO and game.model.fill_count() < 72, "blocked demo restarts instead of looping above roof")
		game.begin_play()
		game.difficulty_index = 1
		fixture(game.model,"cave")
		game.next_piece = {"shape":0,"color":0}
		game.spawn_piece()
		check(not game.entry_route.is_empty() and game.mode == game.Mode.PLAY, "sideways reachable cave is rescued, not falsely ended")
		var kept: int = game.model.kept
		for i in range(200):
			if game.entry_route.is_empty(): break
			game._process(0.05)
		check(game.model.kept == kept+1 and game.model.verify_invariants(), "assisted cave route follows legal moves and retains namako")
		Session.clear(game.session_path)
		Session.clear(game.cards.save_path)
		game.queue_free()
		await process_frame
	check(Locale.missing.is_empty(), "all new native messages have English translations")
	print("TOP_ENTRY_FAILURES=", failures)
	quit(1 if failures else 0)
