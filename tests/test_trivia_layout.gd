extends SceneTree

var failures: int = 0

func check(ok: bool, label: String) -> void:
	print("PASS: " if ok else "FAIL: ", label)
	if not ok: failures += 1

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var game: Node = load("res://Main.tscn").instantiate()
	game.session_path = "res://tests/_trivia_layout_session.cfg"
	root.add_child(game)
	game.begin_play()
	game.show_clear()
	game.finish_celebration()
	game.finish_reward()
	check(game.mode == game.Mode.TRIVIA, "professor panel follows card")
	check(game.trivia_ui.visible and game.trivia_ui.body_label.text.length() > 0, "episode visible")
	check(game.trivia_ui.get_node(".") != null and game.trivia_ui.lab.get_child(0).texture != null, "professor texture imported")
	var longest: Dictionary = game.trivia.episodes[22]
	game.trivia_ui.show_episode(longest, 100)
	check(game.trivia_ui.body_label.text == str(longest["body"]), "long episode text retained")
	for resolution in [Vector2i(540, 860), Vector2i(360, 640), Vector2i(390, 844), Vector2i(390, 915)]:
		game.apply_layout_for_size(resolution)
		var outer: Panel = game.trivia_ui.outer
		var ok: bool = outer.position.y >= 0.0 and outer.position.y + outer.size.y <= game.layout_height
		ok = ok and game.trivia_ui.next_button.position.y + game.trivia_ui.next_button.size.y <= outer.size.y
		ok = ok and game.difficulty_button.position.x + game.difficulty_button.size.x < game.menu_button.position.x
		ok = ok and game.menu_button.position.x + game.menu_button.size.x < game.collection_button.position.x
		ok = ok and game.collection_button.position.y + game.collection_button.size.y < game.theme_button.position.y
		check(ok, "trivia and difficulty fit " + str(resolution))
	game.queue_free()
	await process_frame
	var session = load("res://scripts/session_store.gd")
	session.clear("res://tests/_trivia_layout_session.cfg")
	print("TRIVIA_LAYOUT_FAILURES=", failures)
	quit(1 if failures else 0)
