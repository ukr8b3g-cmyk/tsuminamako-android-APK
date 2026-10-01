extends SceneTree
func _initialize() -> void:
	call_deferred("run")
func run() -> void:
	var game: Node = load("res://Main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	var ok: bool = true
	for resolution in [Vector2i(540,860), Vector2i(360,640), Vector2i(360,760), Vector2i(390,844), Vector2i(412,915), Vector2i(390,915)]:
		game.apply_layout_for_size(resolution)
		var board: Control = game.board_view
		var fits: bool = board.position.y + board.size.y + 17.0 < game.ui_status.position.y and game.ui_status.position.y + game.ui_status.size.y < game.start_button.position.y and game.ui_footer.position.y + game.ui_footer.size.y <= game.layout_height
		fits = fits and absf(board.size.x - board.cell_size * 8) < 0.01 and absf(board.size.y - board.cell_size * 12) < 0.01
		fits = fits and absf(game.card_ui.size.y - game.layout_height) < 0.01 and absf(game.card_ui.overlay_shade.size.y - game.layout_height) < 0.01
		if resolution.y * 1.0 / resolution.x >= 2.0:
			fits = fits and board.cell_size >= 56.0 and game.ui_count.position.y + game.ui_count.size.y < game.next_label.position.y
		ok = ok and fits
		print("responsive native ",resolution,": ",fits," cell=",board.cell_size," height=",game.layout_height)
	game.queue_free()
	await process_frame
	quit(0 if ok else 1)
