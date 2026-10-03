extends SceneTree
const Locale = preload("res://scripts/locale_text.gd")
func _initialize() -> void: call_deferred("run")
func run() -> void:
	for language in ["ja", "en"]:
		Locale.test_language = language
		var game = load("res://Main.tscn").instantiate()
		game.session_path = "user://demo_speed_test.cfg"
		root.add_child(game)
		game.set_process(false)
		game.sound.music_enabled = false
		game.sound.music.stop()
		for size in [Vector2i(320,568),Vector2i(390,844),Vector2i(1080,2400),Vector2i(1440,3200)]:
			for theme in [0,1,2]:
				game.lcd_mode = theme == 2
				game.dark_mode = theme == 0
				game.apply_layout_for_size(size)
				game.begin_demo()
				for index in range(5):
					game.speed_index = index
					game.sync_ui()
					assert(game.demo_speed_button.visible)
					assert(game.demo_speed_button.get_parent() == game)
					assert(not game.demo_speed_button.get_rect().intersects(game.lore_button.get_rect()))
					var font = game.demo_speed_button.get_theme_font("font")
					for line in game.demo_speed_button.text.split("\n"):
						assert(font.get_string_size(line,HORIZONTAL_ALIGNMENT_LEFT,-1,16).x + 4 <= 100)
					game.demo_speed_button.pressed.emit()
					assert(game.speed_index == (index + 1) % 5)
				assert(game.collection_button.visible)
				assert(not game.collection_button.get_rect().intersects(game.demo_speed_button.get_rect()))
				var card_position = game.collection_button.position
				var board = game.model.board.duplicate()
				var origin = game.origin
				var owned = game.cards.owned_unique_count()
				game.collection_button.pressed.emit()
				assert(game.collection_open and game.board_view.frozen)
				game._process(0.5)
				assert(game.model.board == board and game.origin == origin)
				game.close_collection()
				assert(game.mode == game.Mode.DEMO and not game.board_view.frozen)
				assert(game.cards.owned_unique_count() == owned)
				game.begin_play()
				assert(game.collection_button.position == card_position)
		game.begin_play()
		assert(not game.demo_speed_button.visible)
		game.queue_free()
		await process_frame
	DirAccess.remove_absolute("user://demo_speed_test.cfg")
	print("DEMO SPEED PASS: 24 locale/size/theme cases, five speeds, button click, hidden in play")
	quit()
