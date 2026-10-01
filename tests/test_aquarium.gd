extends SceneTree
const Catalog = preload("res://scripts/card_catalog.gd")
const Session = preload("res://scripts/session_store.gd")
var failures: int = 0
func check(ok: bool, message: String) -> void:
	print("PASS: " if ok else "FAIL: ", message)
	if not ok: failures += 1
func _initialize() -> void:
	call_deferred("run")
func run() -> void:
	var game: Node = load("res://Main.tscn").instantiate()
	game.session_path="res://tests/_aquarium_session.cfg"
	root.add_child(game)
	game.cards=Catalog.new("res://tests/_aquarium_cards.cfg")
	game.sound.settings_path="res://tests/_aquarium_settings.cfg"
	game.sound.music_enabled=false
	game.sound.track_index=2
	game.sound.cycle_track()
	check(game.sound.track_index==3 and absf(game.sound.music.stream.get_length()-32)<.1 and not game.sound.music.playing,"fourth track loads and preserves mute")
	game.begin_play()
	game.rotate_right()
	check(not game.board_view.rotation_from.is_empty(),"rotation starts fluid interpolation")
	game.cards.add_to_collection(game.cards.enabled_cards()[0]["id"])
	game.open_collection()
	var tile: Node=game.card_ui.collection_grid.get_child(0)
	var tap: Button=tile.get_child(1)
	tap.pressed.emit()
	check(game.card_ui.zoom_button.visible and game.card_ui.zoom_image.texture!=null,"collection tap enlarges owned card")
	game.card_ui.zoom_button.pressed.emit()
	check(not game.card_ui.zoom_button.visible and game.card_ui.collection_panel.visible,"second tap returns to collection")
	game.dark_mode=true
	game.sync_ui()
	await process_frame
	await process_frame
	game.queue_free()
	await process_frame
	for file in ["_aquarium_session.cfg","_aquarium_cards.cfg","_aquarium_settings.cfg"]: Session.clear("res://tests/"+file)
	print("AQUARIUM_FAILURES=",failures)
	quit(1 if failures else 0)
