extends SceneTree
const Locale = preload("res://scripts/locale_text.gd")
var failures := 0
func check(ok: bool, message: String) -> void:
	if not ok:
		failures += 1
		push_error(message)
func _initialize() -> void: call_deferred("run")
func frozen_state(game) -> Dictionary:
	return {
		"board": game.model.board.duplicate(), "origin": game.origin,
		"fall_time": game.fall_time, "phase": game.phase, "phase_time": game.phase_time,
		"clock": game.clock, "visual_origin": game.board_view.visual_origin,
		"impact": game.board_view.impact, "vanish_progress": game.board_view.vanish_progress,
		"vanish_cells": game.board_view.vanish_cells.duplicate(),
	}
func run() -> void:
	Locale.test_language = "en"
	var game = load("res://Main.tscn").instantiate()
	game.session_path = "user://visual_refresh_test.cfg"
	root.add_child(game)
	game.sound.music_enabled = false
	game.sound.music.stop()
	game.set_process(false)
	for resolution in [Vector2i(320,568), Vector2i(390,844), Vector2i(412,915), Vector2i(1280,800)]:
		game.apply_layout_for_size(resolution)
		check(game.ui_title.position.y + game.ui_title.size.y <= game.ui_mode.position.y, "Title overlaps demo caption")
		game.open_settings()
		check(game.settings_layer.visible and game.board_view.frozen, "Settings must freeze board")
		for b in [game.theme_button, game.track_button, game.speed_button, game.music_button, game.sfx_button, game.motion_button]:
			check(b.get_parent() == game.settings_panel and b.size.y >= 46, "Settings controls must remain usable")
		game.close_settings()
		check(not game.settings_layer.visible and not game.board_view.frozen, "Demo resumes after settings")
	game.difficulty_index = 1
	game.begin_play()
	check(game.approximate_remaining() == 27, "Normal empty tank estimates 27 namako")
	check(not quit_on_go_back, "Android back must be routed to game UI")
	game._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	check(game.mode == game.Mode.PAUSED, "Back pauses gameplay")
	game._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	check(game.mode == game.Mode.PLAY, "Back returns from pause")
	game.set_process(true)
	game.fall_time = 0.70
	var before = frozen_state(game)
	game.open_settings()
	await create_timer(0.85).timeout
	check(frozen_state(game) == before, "Settings freeze active origin, clocks, phase and visual state across frames")
	game.close_settings()
	check(game.mode == game.Mode.PLAY, "Settings preserves mode")
	await create_timer(0.12).timeout
	check(game.origin != before.origin, "Falling piece resumes after closing settings")
	game.hard_drop()
	var cells: Array[Vector2i] = [Vector2i(0, 1), Vector2i(1, 1)]
	game.board_view.dissolve(cells, 0)
	game.board_view.bounce(1, Vector2(20, 20), 0)
	before = frozen_state(game)
	game.open_settings()
	await create_timer(0.85).timeout
	check(frozen_state(game) == before, "Settings freeze in-progress impact and dissolve tweens")
	for child in game.board_view.get_children():
		if child is CPUParticles2D:
			check(child.speed_scale == 0.0, "Settings freeze existing particles")
	game.pause_game()
	game.close_settings()
	await create_timer(0.15).timeout
	check(game.mode == game.Mode.PAUSED and game.board_view.frozen, "Closing settings preserves an existing pause")
	# The main decorative clock intentionally runs in the ordinary pause menu.
	var paused_state = frozen_state(game)
	paused_state.erase("clock")
	before.erase("clock")
	check(paused_state == before, "Effects stay frozen while gameplay remains paused")
	game.modal_continue()
	await create_timer(0.85).timeout
	check(game.board_view.vanish_cells.is_empty() and is_zero_approx(game.board_view.impact), "Effects finish after gameplay resumes")
	check(game.phase == 0, "Phase timer resumes after settings and pause")
	game.set_process(false)
	if DisplayServer.get_name() != "headless":
		DisplayServer.window_set_size(Vector2i(390,844))
		game.refresh_layout()
		for theme in ["light", "dark", "lcd"]:
			game.dark_mode = theme == "dark"
			game.lcd_mode = theme == "lcd"
			game.begin_demo()
			game.sync_ui()
			await process_frame
			await process_frame
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png("res://tests/refresh_" + theme + ".png")
		game.open_settings()
		await process_frame
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png("res://tests/refresh_settings.png")
	game.queue_free()
	await process_frame
	print("VISUAL REFRESH: ", failures, " failures")
	quit(0 if failures == 0 else 1)
