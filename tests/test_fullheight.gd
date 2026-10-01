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
		game.session_path = "res://tests/_fullheight_session.cfg"
		root.add_child(game)
		game.set_process(false)
		game.sound.music_enabled = false
		game.sound.sfx_enabled = false
		game.sound.music.stop()
		var old_height := 0.0
		for resolution in [Vector2i(360,640),Vector2i(390,844),Vector2i(412,915),Vector2i(1440,3200)]:
			game.apply_layout_for_size(resolution)
			await process_frame
			var ui = game.trivia_ui
			check(is_equal_approx(ui.outer.position.y,16.0),"reader top")
			check(is_equal_approx(ui.outer.position.y+ui.outer.size.y,game.layout_height-16),"reader bottom")
			check(ui.reader_scroll.size.y>=old_height,"paper grows with portrait height")
			old_height = ui.reader_scroll.size.y
			check(ui.paper.position.y+ui.paper.size.y<ui.next_button.position.y-12,"paper/button spacing")
			check(ui.next_button.position.y+ui.next_button.size.y<ui.outer.size.y,"reader button inside")
			var buttons=[game.theme_button,game.track_button,game.speed_button,game.music_button,game.sfx_button]
			for b in buttons:
				check(b.position.x>=18 and b.position.x+b.size.x<=522,"settings frame contains "+b.text)
			game.card_ui.show_reward(game.cards.completion_card(),1,false)
			var c = game.card_ui
			check(is_equal_approx(c.reward_panel.size.y,game.layout_height-32),"reward fills height")
			check(c.reward_slot.size.y>420,"card enlarged")
			check(is_equal_approx(c.reward_slot.size.x/c.reward_slot.size.y,2.0/3.0),"card aspect")
			check(c.reward_slot.position.y+c.reward_slot.size.y<c.reward_note.position.y,"card/note separation")
			check(c.reward_next.position.y+c.reward_next.size.y<c.reward_panel.size.y,"reward button inside")
			c.hide_reward()
		game.open_lore()
		for episode in game.trivia.episodes:
			game.trivia_ui.show_episode(episode,100)
			await process_frame
			check(not game.trivia_ui.body_label.text.is_empty(),"all episodes visible")
		game.trivia_ui.show_episode(game.trivia.episodes[0],100)
		if DisplayServer.get_name()!="headless":
			game.apply_layout_for_size(Vector2i(390,844))
			for dark in [false,true]:
				game.dark_mode=dark
				game.sync_ui()
				await process_frame
				await RenderingServer.frame_post_draw
				root.get_texture().get_image().save_png("res://tests/fullheight_"+language+"_"+str(dark)+"_notes.png")
				game.trivia_ui.hide()
				game.card_ui.show_reward(game.cards.completion_card(),1,false)
				game.card_ui.reveal_elapsed=4
				await process_frame
				await RenderingServer.frame_post_draw
				root.get_texture().get_image().save_png("res://tests/fullheight_"+language+"_"+str(dark)+"_reward.png")
				game.card_ui.hide_reward()
				game.trivia_ui.show()
		game.finish_trivia()
		game.queue_free()
		await process_frame
	print("Full-height native failures=",failures)
	quit(0 if failures==0 else 1)
