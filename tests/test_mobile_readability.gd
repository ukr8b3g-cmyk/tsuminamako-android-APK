extends SceneTree
const Locale = preload("res://scripts/locale_text.gd")
var failures := 0
func check(ok: bool, message: String) -> void:
	if not ok:
		failures += 1
		print("FAIL ", message)
func _initialize() -> void:
	call_deferred("run")
func run() -> void:
	for language in ["ja", "en"]:
		Locale.test_language = language
		var game = load("res://Main.tscn").instantiate()
		game.session_path = "res://tests/_mobile_readability.cfg"
		root.add_child(game)
		game.set_process(false)
		game.sound.music.stop()
		game.sound.music_enabled = false
		game.sound.sfx_enabled = false
		game.cards.save_path = "res://tests/_mobile_readability_cards.cfg"
		await process_frame
		for resolution in [Vector2i(360,640), Vector2i(390,844), Vector2i(412,915), Vector2i(1440,3200)]:
			game.apply_layout_for_size(resolution)
			for dark in [false,true]:
				game.dark_mode = dark
				for track in range(4):
					game.sound.track_index = track
					for speed in range(5):
						game.speed_index = speed
						game.sync_ui()
						await process_frame
						for b in [game.difficulty_button,game.menu_button,game.lore_button,game.collection_button,game.theme_button,game.track_button,game.speed_button,game.music_button,game.sfx_button]:
							var width = b.get_theme_font("font").get_string_size(b.text,HORIZONTAL_ALIGNMENT_LEFT,-1,b.get_theme_font_size("font_size")).x
							check(width+8<=b.size.x,language+" text "+b.text+" width="+str(width)+" box="+str(b.size.x))
		game.begin_play()
		game.speed_index = 3
		check(is_equal_approx(game.speed_multiplier(),3.0),"3x gameplay")
		game.pause_game()
		check(game.mode==game.Mode.PAUSED and game.board_view.frozen,"pause")
		game.modal_continue()
		check(game.mode==game.Mode.PLAY,"resume")
		var origin = game.origin
		game.open_lore()
		check(game.mode==game.Mode.TRIVIA and game.trivia_ui.more_button.visible,"reader opens")
		check(game.trivia.episodes.size()==100,"100 stories")
		await process_frame
		check(game.trivia_ui.body_label.get_combined_minimum_size().y>0,"scrollable body")
		game.finish_trivia()
		check(game.mode==game.Mode.PLAY and game.origin==origin and not game.board_view.frozen,"reader restores exact play")
		game.begin_demo()
		game.open_lore()
		game.finish_trivia()
		check(game.mode==game.Mode.DEMO,"reader restores demo")
		if DisplayServer.get_name() != "headless":
			game.apply_layout_for_size(Vector2i(390,844))
			game.begin_play()
			await process_frame
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png("res://tests/native_readable_"+language+"_play.png")
			game.open_lore()
			await process_frame
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png("res://tests/native_readable_"+language+"_notes.png")
			game.finish_trivia()
		game.queue_free()
		await process_frame
	print("Mobile readability failures=",failures)
	quit(0 if failures==0 else 1)

