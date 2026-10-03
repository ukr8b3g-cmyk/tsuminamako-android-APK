extends SceneTree

const Catalog = preload("res://scripts/card_catalog.gd")
const TEST_SAVE: String = "res://tests/_reward_flow_test.cfg"
var failures: int = 0

func check(condition: bool, label: String) -> void:
	if not condition:
		failures += 1
		push_error("FAIL: " + label)
	else:
		print("PASS: " + label)

func _initialize() -> void:
	call_deferred("run_checks")

func run_checks() -> void:
	load("res://scripts/locale_text.gd").test_language = "ja"
	var main: Node = load("res://Main.tscn").instantiate()
	main.session_path = "res://tests/_resume_test.cfg"
	root.add_child(main)
	main.cards = Catalog.new(TEST_SAVE)
	main.cards.collection.clear()
	main.begin_play()
	main.difficulty_index = 1
	main.sync_ui()
	check(main.target_ratio() == 0.9, "normal ninety-percent target")
	main.difficulty_index = 2
	main.sync_ui()
	check(main.target_ratio() == 0.95 and not main.board_view.show_ghost and main.speed_multiplier() > 1.0, "hard target, speed and no ghost")
	main.difficulty_index = 0
	main.sync_ui()
	check(main.target_ratio() == 0.85 and main.board_view.show_guide, "easy target and landing guide")
	main.difficulty_index = 1
	main.sync_ui()
	main.dark_mode = true
	main.sync_ui()
	check(main.board_view.dark_mode and main.theme_button.text == "夜モード", "native dark theme applied")
	check(main.sound.players.has("card_pop") and main.sound.players.has("card_rare"), "new reward fanfares loaded")
	check(main.cards.rewards_enabled(), "20-card rewards enabled")
	check(main.cards.enabled_cards().size() == 20, "20 cards in catalog")
	main.show_clear()
	main.finish_celebration()
	check(main.mode == main.Mode.REVEAL, "celebration leads to reveal")
	check(main.cards.total_owned_count() == 1, "one reward saved per clear")
	check(not main.last_reward.is_empty(), "reward selected")
	check(main.card_ui.reward_front.texture != null, "WebP card texture loaded")
	if main.card_ui.reward_front.texture != null:
		check(main.card_ui.reward_front.texture.get_size() == Vector2(1024, 1536), "card texture dimensions")
	main.card_ui._process(3.0)
	check(main.card_ui.reward_front.visible, "front face appears after spin")
	main.finish_reward()
	check(main.mode == main.Mode.PLAY and not main.trivia_ui.visible, "reveal goes directly to next tank")
	main.open_lore()
	check(main.trivia.episodes.size() == 200 and not main.trivia_episode.is_empty(), "all 200 episodes available")
	main.finish_trivia()
	check(main.mode == main.Mode.PLAY, "next stage button begins another round")
	main.open_collection()
	check(main.collection_open and main.card_ui.collection_panel.visible, "collection opens")
	main.close_collection()
	check(not main.collection_open and not main.card_ui.collection_panel.visible, "collection closes")
	main.cards.collection.clear()
	for index in range(10):
		main.cards.add_to_collection(str(main.cards.enabled_cards()[index].get("id", "")))
	check(main.cards.milestone_unlocked(), "10 unique cards unlock friends title")
	main.sync_ui()
	check(main.ui_mode.text == "ナマコの仲間たち", "friends title appears in game")
	main.mode = main.Mode.DEMO
	main.show_clear(true)
	main.finish_celebration()
	check(main.mode == main.Mode.TRIVIA and main.reward_from_demo and not main.card_ui.reward_panel.visible, "demo clear skips collectible rewards")
	main.finish_reward()
	check(main.mode == main.Mode.TRIVIA and main.demo_overlay_time > 0.0, "demo continues to professor episode")
	main.finish_trivia()
	check(main.mode == main.Mode.DEMO, "demo returns after episode")
	main.queue_free()
	await process_frame
	main = null
	DirAccess.remove_absolute(ProjectSettings.globalize_path(TEST_SAVE))
	DirAccess.remove_absolute(ProjectSettings.globalize_path("res://tests/_resume_test.cfg"))
	print("REWARD_FLOW_FAILURES=", failures)
	quit(1 if failures > 0 else 0)
