extends SceneTree
const Rules = preload("res://scripts/rules.gd")
const Session = preload("res://scripts/session_store.gd")
const Locale = preload("res://scripts/locale_text.gd")
var failures: int = 0
func check(ok: bool, message: String) -> void:
	print("PASS: " if ok else "FAIL: ", message)
	if not ok: failures += 1
func _initialize() -> void: call_deferred("run")
func drop(model, x: int, color_id: int = 0) -> Dictionary:
	return model.commit(model.shape(0), model.landing(model.shape(0), Vector2i(x,-4)), color_id)
func run() -> void:
	var model = Rules.new(1)
	drop(model,0)
	drop(model,2)
	check(model.pieces.size()==2 and model.cleared==0, "two matching creatures remain")
	var forecast: Dictionary = model.preview(model.shape(0),Vector2i(4,11),0)
	check(forecast["will_clear"] and forecast["match_ids"].size()==2 and model.fill_count()==4, "colour-aware preview does not mutate")
	var third: Dictionary = drop(model,4)
	check(third["match"]["count"]==3 and model.pieces.is_empty() and model.fill_count()==0, "three touching same-colour creatures disappear")
	check(model.kept==3 and model.cleared==3 and model.verify_invariants(), "erased placement count remains valid")
	model.reset()
	for x in [0,2,4]: drop(model,x,int(x/2))
	check(model.pieces.size()==3 and model.fill_count()==6 and model.cleared==0, "mixed-colour chain stays")
	model.reset()
	for x in [0,3,6]: drop(model,x)
	check(model.pieces.size()==3 and model.matching_ids([Vector2i.ZERO],Vector2i(2,10),0).is_empty(), "separated and diagonal creatures do not match")
	model.reset()
	for x in [0,2,6]: drop(model,x)
	var other: Dictionary = model.commit(model.shape(0),Vector2i(1,10),1)
	var fourth: Dictionary = drop(model,4)
	check(fourth["match"]["count"]==4 and model.pieces.size()==1 and model.pieces.has(other["id"]) and model.verify_invariants(), "connected group of four clears; another colour stays")
	model.reset()
	drop(model,0)
	drop(model,2)
	var safe: Dictionary = model.entry_plan(model.shape(0),true,0)
	forecast = model.preview(safe["cells"],model.landing(safe["cells"],safe["origin"]),0)
	check(forecast["keep"] and not forecast["will_clear"], "Easy chooses a surviving entry when possible")
	var triples: Array[int] = []
	for difficulty in range(3):
		model.reset(91)
		var colours: Array[int] = []
		var unique: Dictionary = {}
		var matching_triples: int = 0
		for i in range(6000):
			var colour: int = model.next_spec(difficulty)["color"]
			colours.append(colour)
			unique[colour] = true
			if i>=2 and colour==colours[i-1] and colour==colours[i-2]: matching_triples += 1
		check(unique.size()==[6,4,3][difficulty], "difficulty %d colour pool" % difficulty)
		triples.append(matching_triples)
	check(triples[0]<triples[1] and triples[1]<triples[2], "matching chance rises with difficulty: " + str(triples))
	for language in ["ja","en"]:
		Locale.test_language = language
		var game = load("res://Main.tscn").instantiate()
		game.session_path = "user://same_color_test_session.cfg"
		root.add_child(game)
		game.set_process(false)
		game.board_view.set_process(false)
		game.sound.music_enabled = false
		game.sound.sfx_enabled = false
		game.sound.music.stop()
		for theme in [0,1,2]:
			game.dark_mode = theme==1
			game.lcd_mode = theme==2
			game.begin_play()
			game.reduced_motion = false
			game.board_view.reduced_motion = false
			var owned: int = game.cards.total_owned_count()
			for x in [0,2,4]:
				game.active = game.model.shape(0)
				game.active_color = 0
				game.origin = Vector2i(x,11)
				game.board_view.visual_origin = Vector2(game.origin)
				game.phase = 0
				game.lock_piece()
			check(not game.board_view.match_effect.is_empty() and game.board_view.match_effect["sources"].size()==3 and game.model.pieces.is_empty(), "actual native lock starts disappearance " + language + str(theme))
			check(not game.goal_reached() and game.cards.total_owned_count()==owned, "erased group is not a clear or reward")
			check(game.sound.players.has("merge") and game.sound.players["merge"].stream!=null,"bubble sound available")
			game.board_view._process(0.32)
			if DisplayServer.get_name()!="headless":
				DisplayServer.window_set_size(Vector2i(412,915))
				game.refresh_layout()
				game.sync_ui()
				await process_frame
				await process_frame
				await RenderingServer.frame_post_draw
				root.get_texture().get_image().save_png("res://tests/same_color_native_"+language+"_"+str(theme)+"_mid.png")
			game.pause_game()
			var elapsed: float = game.board_view.match_effect["time"]
			game.board_view._process(0.2)
			check(game.board_view.match_effect["time"]==elapsed,"pause freezes disappearance")
			game.modal_continue()
			game.board_view._process(0.65)
			check(game.board_view.match_effect.is_empty(),"disappearance finishes")
			Session.write(game,game.session_path)
			var saved: Dictionary = Session.read(game.session_path)
			check(not saved.is_empty() and saved["version"]==3 and saved["restored_model"].cleared==3 and saved["restored_model"].verify_invariants(),"cleared v3 checkpoint resumes")
			if not saved.is_empty():
				saved.erase("restored_model")
				saved["model"]["cleared"] = 0
				var config = ConfigFile.new()
				config.set_value("session","state",saved)
				config.save(game.session_path)
				check(Session.read(game.session_path).is_empty(),"corrupt erased count rejected")
			game.begin_play()
			game.model.reset()
			var legacy_cells: Array[Vector2i] = []
			for x in range(6):
				legacy_cells.append(Vector2i(x,11))
				game.model.board[11*8+x] = 1
			game.model.pieces[1] = {"cells":legacy_cells,"color":2,"units":3}
			game.model.next_id = 2
			game.model.kept = 3
			game.model.turns = 3
			game.phase = 1
			Session.write(game,game.session_path)
			saved = Session.read(game.session_path)
			saved.erase("restored_model")
			saved["version"] = 2
			saved["model"].erase("cleared")
			var legacy_config = ConfigFile.new()
			legacy_config.set_value("session","state",saved)
			legacy_config.save(game.session_path)
			saved = Session.read(game.session_path)
			check(not saved.is_empty() and saved["restored_model"].fill_count()==6 and saved["restored_model"].pieces[1]["units"]==3,"legacy v2 large creature stays at saved position")
			game.begin_demo()
			game.reduced_motion = true
			game.board_view.reduced_motion = true
			for x in [0,2,4]:
				game.active = game.model.shape(0)
				game.active_color = 0
				game.origin = Vector2i(x,11)
				game.phase = 0
				game.lock_piece()
			game.board_view._process(0.36)
			check(game.board_view.match_effect.is_empty() and game.cards.total_owned_count()==owned,"reduced motion and demo do not award cards")
			game.begin_play()
			for x in [0,2,4]:
				game.active = game.model.shape(0)
				game.active_color = int(x/2)
				game.origin = Vector2i(x,11)
				game.phase = 0
				game.lock_piece()
			check(game.board_view.match_effect.is_empty() and game.model.pieces.size()==3,"native mixed colours remain separate")
			if theme==2 and language=="ja" and DisplayServer.get_name()!="headless":
				await process_frame
				await RenderingServer.frame_post_draw
				root.get_texture().get_image().save_png("res://tests/same_color_native_lcd_patterns.png")
		game.queue_free()
		await process_frame
	Session.clear("user://same_color_test_session.cfg")
	check(Locale.missing.is_empty(), "all new messages translated")
	print("SAME_COLOR_FAILURES=", failures)
	quit(1 if failures else 0)
