extends SceneTree
const Locale = preload("res://scripts/locale_text.gd")
const OUTPUT = "res://tests/english_layout_validation"
var failures: Array[String] = []
var checks: int = 0
func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures.append(message)
		print("FAIL ",message)
func text_width(item: Control) -> float:
	var face: Font = item.get_theme_font("font")
	var longest: float = 0.0
	for line in item.text.split("\n"):
		longest = maxf(longest,face.get_string_size(line,HORIZONTAL_ALIGNMENT_LEFT,-1,item.get_theme_font_size("font_size")).x)
	return longest
func _initialize() -> void:
	call_deferred("run")
func capture(name: String) -> void:
	if DisplayServer.get_name() == "headless": return
	await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(OUTPUT+"/godot_"+name+".png")
func run() -> void:
	DirAccess.make_dir_recursive_absolute(OUTPUT)
	for language in ["en","ja"]:
		Locale.test_language = language
		var game = load("res://Main.tscn").instantiate()
		game.session_path = "res://tests/_english_layout_session.cfg"
		root.add_child(game)
		game.set_process(false)
		game.sound.music_enabled = false
		game.sound.sfx_enabled = false
		game.sound.music.stop()
		game.cards.save_path = "res://tests/_english_layout_cards.cfg"
		for card in game.cards.enabled_cards(): game.cards.collection[card.id]=1
		game.begin_play()
		game.begin_demo() # Creates an isolated checkpoint so both bottom buttons appear.
		await process_frame
		for resolution in [Vector2i(540,860),Vector2i(360,640),Vector2i(360,800),Vector2i(390,844),Vector2i(412,915),Vector2i(480,960),Vector2i(635,1036),Vector2i(1440,3200)]:
			for dark in [false,true]:
				game.dark_mode = dark
				game.mode = game.Mode.DEMO
				game.speed_index = 3
				game.apply_layout_for_size(resolution)
				for track in range(4):
					game.sound.track_index = track
					game.sync_ui()
					await process_frame
					var buttons = [game.theme_button,game.track_button,game.speed_button,game.music_button,game.sfx_button]
					for i in range(buttons.size()):
						var button: Button = buttons[i]
						check(text_width(button)+4 <= button.size.x,language+" button text "+button.text)
						if i>0: check(buttons[i-1].position.y+buttons[i-1].size.y+3 <= button.position.y,language+" settings overlap "+str(resolution)+" "+button.text)
					for pair in [[game.ui_title,190],[game.ui_mode,125],[game.ui_count,125],[game.ui_status,390],[game.ui_tip,476],[game.ui_footer,504],[game.difficulty_button,84],[game.collection_button,158],[game.start_button,180],[game.resume_button,180]]:
						check(text_width(pair[0])<=pair[0].size.x,language+" text width "+pair[0].text)
				check(game.board_view.position.y+game.board_view.size.y+17<game.ui_status.position.y,language+" board/status spacing")
				game.mode = game.Mode.PLAY
				game.sync_ui()
				for item in game.play_buttons: check(text_width(item)+4<=item.size.x,language+" play "+item.text)
				check(game.ui_footer.position.y+game.ui_footer.size.y <= game.layout_height,language+" footer in viewport "+str(resolution))
		# Check all native lore titles/bodies, rather than one short example.
		for episode in game.trivia.episodes:
			game.trivia_ui.show_episode(episode,100)
			await process_frame
			var title = game.trivia_ui.title_label
			var body = game.trivia_ui.body_label
			check(title.position.y+title.size.y<=body.position.y-3,language+" lore title "+str(episode.id)+" height "+str(title.size.y))
			check(body.position.y+body.size.y<=game.trivia_ui.paper.size.y-10,language+" lore body "+str(episode.id)+" height "+str(body.size.y))
		game.trivia_ui.hide()
		game.card_ui.show_collection(game.cards)
		await process_frame
		for tile in game.card_ui.collection_grid.get_children():
			for child in tile.get_children():
				if child is Label: check(child.size.x<=132 and child.position.y+child.size.y<=tile.size.y,language+" collection caption "+child.text)
		for card in game.cards.enabled_cards()+[game.cards.completion_card()]:
			game.card_ui.show_reward(card,2,true)
			await process_frame
			check(text_width(game.card_ui.reward_title)<=430,language+" reward heading")
			check(game.card_ui.reward_note.position.y+game.card_ui.reward_note.size.y<game.card_ui.reward_next.position.y,language+" reward note "+card.name)
		game.card_ui.hide()
		if language=="en":
			DisplayServer.window_set_size(Vector2i(390,844))
			await process_frame
			game.apply_layout_for_size(Vector2i(390,844))
			for dark in [false,true]:
				game.dark_mode=dark
				game.mode=game.Mode.DEMO
				game.speed_index=3
				game.sync_ui()
				await capture("dark_demo" if dark else "light_demo")
				game.mode=game.Mode.PLAY
				game.sync_ui()
				await capture("dark_play" if dark else "light_play")
			game.trivia_ui.show_episode(game.trivia.episodes[0],100)
			await capture("lore")
			game.trivia_ui.hide()
			game.card_ui.show_collection(game.cards)
			await capture("collection")
			game.card_ui.show_reward(game.cards.completion_card(),1,true)
			game.card_ui._process(3.0)
			await capture("reward")
		game.queue_free()
		await process_frame
		load("res://scripts/session_store.gd").clear("res://tests/_english_layout_session.cfg")
	var file = FileAccess.open(OUTPUT+"/godot_results.json",FileAccess.WRITE)
	file.store_string(JSON.stringify({"checks":checks,"failures":failures},"\t"))
	file.close()
	print("NATIVE_LAYOUT_CHECKS=",checks," FAILURES=",failures.size())
	quit(0 if failures.is_empty() else 1)
