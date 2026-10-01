extends SceneTree
const Locale = preload("res://scripts/locale_text.gd")
var failures := 0
func check(ok: bool, message: String) -> void:
	if not ok:
		failures += 1
		print("FAIL ",message)
func _initialize() -> void: call_deferred("run")
func run() -> void:
	for language in ["ja","en"]:
		Locale.test_language = language
		var game = load("res://Main.tscn").instantiate()
		game.session_path = "user://lcd_test_session.cfg"
		root.add_child(game)
		game.set_process(false)
		game.sound.music_enabled = false
		game.sound.sfx_enabled = false
		game.sound.music.stop()
		for resolution in [Vector2i(320,568),Vector2i(360,640),Vector2i(390,844),Vector2i(412,915),Vector2i(480,960),Vector2i(1080,2400),Vector2i(1440,3200),Vector2i(1280,800)]:
			game.apply_layout_for_size(resolution)
			for theme in [0,1,2]:
				game.dark_mode = theme==0
				game.lcd_mode = theme==2
				game.sync_ui()
				await process_frame
				check(game.board_view.lcd_mode==game.lcd_mode,"LCD flags")
				check(game.ui_count.position.y+game.ui_count.size.y+6<game.board_view.position.y-13,"count/frame gap")
				check(game.ui_fill.position.y+32<game.board_view.position.y-13,"percent/frame gap")
				check(game.board_view.position.y+game.board_view.size.y+13<game.ui_status.position.y,"tank/status gap")
				check(game.ui_footer.position.y+game.ui_footer.size.y<=game.layout_height-5+0.1,"footer margin "+str(resolution)+" "+str(game.ui_footer.position)+" "+str(game.ui_footer.size)+" / "+str(game.layout_height))
				for button in [game.theme_button,game.track_button,game.speed_button,game.music_button,game.sfx_button]:
					check(button.position.x>=18 and button.position.x+button.size.x<=522,"button margin")
					var font: Font = button.get_theme_font("font")
					check(font.get_string_size(button.text,HORIZONTAL_ALIGNMENT_LEFT,-1,button.get_theme_font_size("font_size")).x+4<=button.size.x,"label width "+button.text)
			game.lcd_mode=true
			game.sync_ui()
		game.begin_play()
		check(not game.ui_mode.visible,"demo title hidden in play")
		game.pause_game()
		check(game.mode==game.Mode.PAUSED,"pause")
		game.open_lore()
		check(game.mode==game.Mode.TRIVIA,"trivia")
		game.finish_trivia()
		check(game.mode==game.Mode.PAUSED,"trivia returns to pause")
		game.begin_demo()
		check(game.ui_mode.visible,"demo title shown")
		if DisplayServer.get_name()!="headless":
			DisplayServer.window_set_size(Vector2i(390,844))
			game.refresh_layout()
			await process_frame
			await process_frame
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png("res://tests/lcd_native_"+language+".png")
		game.queue_free()
		await process_frame
	if FileAccess.file_exists("user://lcd_test_session.cfg"):
		DirAccess.remove_absolute("user://lcd_test_session.cfg")
	print("LCD NATIVE ", "PASS" if failures==0 else "FAIL", ": 48 locale/size/theme cases; HUD margin, labels, mode, pause/trivia")
	quit(0 if failures==0 else 1)
