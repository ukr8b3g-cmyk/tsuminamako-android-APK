extends SceneTree
const Rules = preload("res://scripts/rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")
const Session = preload("res://scripts/session_store.gd")
var failures: int = 0
func check(ok: bool, label: String) -> void:
	print("PASS: " if ok else "FAIL: ", label)
	if not ok: failures += 1
func _initialize() -> void:
	call_deferred("run")
func fill_fixture(model, roof: bool) -> void:
	model.reset(1)
	var id: int = 1
	for y in range(12):
		if roof and y in [1, 2, 3]: continue
		for x in range(0, 8 if roof else 7, 4 if roof else 2):
			var cells: Array[Vector2i] = []
			for offset in range(4 if roof else mini(2, 7-x)):
				cells.append(Vector2i(x+offset,y))
				model.board[y*8+x+offset] = id
			model.pieces[id] = {"cells": cells, "color": id%6}
			id += 1
	model.next_id = id
	model.kept = id-1
	model.turns = id-1
func run() -> void:
	load("res://scripts/locale_text.gd").test_language = "en"
	var model = Rules.new(1)
	for i in range(6): check(not model.retainable_landing(model.shape(i)).is_empty(), "empty board fits shape %d"%i)
	fill_fixture(model,true)
	check(model.verify_invariants() and model.fill_ratio() == 0.75,"valid sealed roof below normal target")
	var before: PackedInt32Array = model.board.duplicate()
	for i in range(6): check(model.retainable_landing(model.shape(i)).is_empty(), "sealed roof blocks shape %d"%i)
	check(model.board == before,"probe leaves board unchanged")
	fill_fixture(model,false)
	check(model.retainable_landing(model.shape(3)).is_empty() and not model.retainable_landing(model.shape(0)).is_empty(),"shaft requires narrow replacement")
	var game: Node = load("res://Main.tscn").instantiate()
	game.session_path = "res://tests/_clear_packed_session.cfg"
	Session.clear(game.session_path)
	root.add_child(game)
	game.set_process(false)
	game.board_view.set_process(false)
	game.cards = Catalog.new("res://tests/_clear_packed_cards.cfg")
	Session.clear(game.cards.save_path)
	game.cards.collection.clear()
	game.cards.last_grant.clear()
	game.begin_play()
	game.difficulty_index = 1
	fill_fixture(game.model,true)
	game.spawn_piece()
	check(game.mode == game.Mode.CELEBRATE and game.clear_packed,"packed tank completes below target")
	check(game.cards.total_owned_count()==1 and not game.celebration_panel.visible,"one reward saved while landing settles")
	game.update_celebration(0.51)
	check(game.celebration_stage==1 and game.board_view.celebration_active and not game.celebration_panel.visible,"one second board-view phase")
	game.update_celebration(1.0)
	check(game.celebration_stage==2 and game.celebration_panel.visible,"celebration follows board view")
	game.update_celebration(0.8)
	check(game.mode==game.Mode.REVEAL,"celebration leads to card")
	game.resume_saved()
	game.finish_celebration()
	check(game.mode==game.Mode.REVEAL and game.cards.total_owned_count()==1,"reload never duplicates reward")
	game.finish_reward()
	check(game.mode==game.Mode.PLAY and not game.trivia_ui.visible,"card leads directly to next tank")
	check(game.trivia.episodes.size()==200,"200 bilingual tales available")
	game.begin_demo()
	var owned: int = game.cards.total_owned_count()
	fill_fixture(game.model,true)
	game.spawn_piece()
	game.finish_celebration()
	check(game.mode==game.Mode.TRIVIA and game.cards.total_owned_count()==owned and game.trivia_ui.visible,"demo shows notes without granting cards")
	check(game.demo_overlay_time>=12 and game.demo_overlay_time<=40 and game.trivia_ui.next_button.text=="Continue Demo ▶","readable demo wait and English button")
	game.trivia_ui.show_art("res://assets/trivia/trivia_professor_en.png")
	var wait: float = game.demo_overlay_time
	game._process(0.05)
	check(game.demo_overlay_time==wait,"expanded art pauses demo timer")
	game.finish_trivia()
	check(game.mode==game.Mode.DEMO,"demo restarts after notes")
	game.open_lore()
	game._process(0.05)
	check(game.mode==game.Mode.TRIVIA and game.lore_return_mode==game.Mode.DEMO,"manual notebook stays open")
	game.finish_trivia()
	Session.clear(game.session_path)
	Session.clear(game.cards.save_path)
	game.queue_free()
	await process_frame
	print("CLEAR_PACKED_FAILURES=",failures)
	quit(1 if failures else 0)
