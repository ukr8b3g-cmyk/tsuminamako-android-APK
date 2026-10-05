extends SceneTree
const Locale = preload("res://scripts/locale_text.gd")
const Session = preload("res://scripts/session_store.gd")
var failures: int = 0
func _initialize() -> void: call_deferred("run")
func check(ok: bool, description: String) -> void:
	print("PASS: " if ok else "FAIL: ", description)
	if not ok: failures += 1
func run() -> void:
	var previous_path: String = Locale.preference_path
	Locale.preference_path = "user://language_jelly_test.cfg"
	Session.clear(Locale.preference_path)
	Locale.test_language = ""
	Locale.load_preference()
	check(Locale.is_japanese(), "first launch defaults to Japanese independently of OS")
	for theme in [0,1,2]:
		Locale.set_language("ja")
		var game = load("res://Main.tscn").instantiate()
		game.session_path = "user://language_jelly_session_test.cfg"
		root.add_child(game)
		game.set_process(false)
		game.board_view.set_process(false)
		game.sound.music_enabled = false
		game.sound.sfx_enabled = false
		game.sound.music.stop()
		game.dark_mode = theme==1
		game.lcd_mode = theme==2
		game.begin_play()
		game.model.commit(game.model.shape(0),Vector2i(0,11),1)
		game.trivia.remaining.assign([1,2,3])
		game.sync_ui()
		var before = game.model.board.duplicate()
		var position_before: Vector2i = game.origin
		var round_before: String = game.round_id
		game.open_settings()
		game.language_button.pressed.emit()
		check(not Locale.is_japanese() and game.ui_title.text=="Tsumi Namako" and game.settings_title.text=="Settings" and game.play_buttons[2].text=="Rotate", "actual language button switches static UI to English")
		check(game.model.board==before and game.origin==position_before and game.round_id==round_before and game.mode==game.Mode.PLAY, "switch preserves current round and active position")
		check(game.trivia.remaining==[1,2,3], "switch preserves reading cycle")
		var regex := RegEx.new()
		regex.compile("[ぁ-んァ-ヶ一-龯]")
		for card in game.cards.enabled_cards():
			check(str(card["image"]).contains("/en/") and regex.search(card["name"])==null, "English card data: " + str(card["id"]))
		check(regex.search(str(game.trivia.by_id(1)["body"]))==null, "English research notebook data")
		for resolution in [Vector2i(320,568),Vector2i(412,915),Vector2i(1440,3200)]:
			game.apply_layout_for_size(resolution)
			check(game.settings_title.position.x+game.settings_title.size.x<game.language_button.position.x and game.language_button.position.x+game.language_button.size.x<game.settings_panel.size.x, "language button and heading fit: " + str(resolution))
		Locale.selected_language = "ja"
		Locale.load_preference()
		check(not Locale.is_japanese(), "saved English preference survives relaunch")
		game.close_settings()
		game.trivia_ui.show_episode(game.trivia.by_id(1),200)
		var companions: Array = []
		for child in game.trivia_ui.lab.get_children():
			if child is Button: companions.append(child)
		companions[1].pressed.emit()
		check(game.trivia_ui.art_viewer.get_child(0).texture.resource_path.contains("_en"), "existing companion button loads English artwork after a switch")
		game.trivia_ui.art_viewer.pressed.emit()
		await process_frame
		game.trivia_ui.hide()
		game.open_settings()
		game.language_button.pressed.emit()
		check(Locale.is_japanese() and game.ui_title.text=="つみなまこ" and game.play_buttons[2].text=="回す", "Japanese text restores after English")
		check(not game.cards.enabled_cards()[0]["image"].contains("/en/") and regex.search(str(game.trivia.by_id(1)["body"]))!=null, "Japanese art and notebook restore")
		game.close_settings()
		game.reduced_motion = false
		game.board_view.reduced_motion = false
		game.begin_play()
		for x in [0,2,4]:
			game.active = game.model.shape(0)
			game.active_color = 0
			game.origin = Vector2i(x,11)
			game.board_view.visual_origin = Vector2(game.origin)
			game.phase = 0
			game.lock_piece()
		check(game.board_view.match_effect["all_cells"].size()==6 and game.board_view.match_effect["necks"].size()==2 and game.model.fill_count()==0, "cached connection geometry and unchanged matching rule")
		game.board_view._process(0.1)
		var pose: Dictionary = game.board_view.match_pose()
		check(pose["join"]>0.0 and pose["join"]<1.0 and pose["fused"]==0.0 and pose["fade"]==0.0, "first the boundaries softly join")
		await capture(game, "jelly_native_"+str(theme)+"_join")
		game.board_view._process(0.3)
		pose = game.board_view.match_pose()
		check(pose["fused"]==1.0 and pose["fade"]==0.0 and pose["jelly"]!=0.0 and pose["bubbles"]==0.0, "opaque joined jelly wobbles before bubbles")
		await capture(game, "jelly_native_"+str(theme)+"_fused")
		game.open_settings()
		game.language_button.pressed.emit()
		game.board_view._process(0.3)
		check(regex.search(game.ui_status.text)==null, "current numbered jelly status switches to English")
		check(is_equal_approx(game.board_view.match_effect["time"],0.4), "settings and language switch freeze rather than restart jelly")
		game.close_settings()
		game.board_view._process(0.28)
		pose = game.board_view.match_pose()
		check(pose["fade"]>0.0 and pose["fade"]<1.0 and pose["bubbles"]>0.0, "bubbles and fade start after the jelly pause")
		await capture(game, "jelly_native_"+str(theme)+"_bubbles")
		game.board_view._process(0.23)
		check(game.board_view.match_effect.is_empty() and game.model.verify_invariants(), "jelly disappears completely without changing board ownership")
		game.queue_free()
		await process_frame
	Session.clear(Locale.preference_path)
	Session.clear("user://language_jelly_session_test.cfg")
	Locale.preference_path = previous_path
	Locale.load_preference()
	check(Locale.missing.is_empty(), "all new UI messages translated")
	print("LANGUAGE_JELLY_FAILURES=",failures)
	quit(1 if failures else 0)
func capture(game, filename: String) -> void:
	if DisplayServer.get_name()=="headless": return
	DisplayServer.window_set_size(Vector2i(412,915))
	game.refresh_layout()
	game.sync_ui()
	game.board_view.queue_redraw()
	await process_frame
	await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://tests/"+filename+".png")
