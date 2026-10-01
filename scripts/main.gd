extends Node2D
const Locale = preload("res://scripts/locale_text.gd")
## Controller: no await-based gameplay callbacks, so restart cancels a round atomically.
const Rules = preload("res://scripts/rules.gd")
const BoardView = preload("res://scripts/board_view.gd")
const Sound = preload("res://scripts/audio.gd")
const CardCatalog = preload("res://scripts/card_catalog.gd")
const CardUI = preload("res://scripts/card_ui.gd")
const TriviaCatalog = preload("res://scripts/trivia_catalog.gd")
const TriviaUI = preload("res://scripts/trivia_ui.gd")
const BOARD_POS: Vector2 = Vector2(86, 180)
const BOARD_SIZE: Vector2 = Vector2(368, 552)
const INK: Color = Color("254b50")
const MUTED: Color = Color("668783")
const MINT: Color = Color("348d7d")
const TIPS: Array[String] = [
	"ルールはかんたん。床に着いたナマコは、そのまま残る。",
	"床より上では、別のナマコ２匹に触れると残る。",
	"触れるのが１匹以下なら、ぬるっと消える。",
	"緑の影＝残る場所。茶色の影＝消える場所。",
	"水槽が80%埋まったら、仲間集合！\nみんなでくねくね、お祝いタイム。"
]
const SPEED_VALUES: Array[float] = [1.0, 1.5, 2.0, 3.0, 6.0]
const SPEED_LABELS: Array[String] = ["×1.0", "×1.5", "×2.0", "×3.0", "マッハ"]
const DIFFICULTY_NAMES: Array[String] = ["かんたん", "ふつう", "むずかしい"]
const DIFFICULTY_TARGETS: Array[float] = [0.7, 0.8, 0.9]
const CELEBRATION_MESSAGES: Array[String] = [
	"やったね！ 仲間が増えたよ。",
	"ぎゅうぎゅう。みんなでぬるぬる暮らそう。",
	"新しい仲間、無事に合流しました。",
	"ナマコの仲間たちのできあがり。",
	"今日も水槽がにぎやかです。",
	"ぬるっと集まって、めでたい。",
	"みんな一緒。いい感じに詰まりました。",
	"仲間写真には、ちょっと多すぎるかも。",
	"ぎっしりだけど、みんなごきげん。",
	"ひとりじゃない。ナマコだもの。",
	"おとなりさんが、また増えました。",
	"ぴたっ、ぬるっ、そして仲間たち。",
	"水槽いっぱいのしあわせ。",
	"いい詰まりっぷりです。",
	"みんな来た。みんな残った。",
	"ナマコ会議、参加者多数。",
	"今日の水槽も平和です。",
	"ぬるぬる指数、たいへん良好。",
	"ここが今日から、みんなのおうち。",
	"またひとつ、にぎやかになりました。"
]
const CELEBRATION_SECONDS: float = 2.8
enum Mode { DEMO, PLAY, PAUSED, CELEBRATE, REVEAL, CLEAR, TRIVIA }
const SessionStore = preload("res://scripts/session_store.gd")
var session_path: String = "user://namako_session.cfg"
var round_id: String = ""
var save_clock: float = 0.0
var showing_complete: bool = false
var resume_button: Button
var track_button: Button
var mode: int = Mode.DEMO
var model: Rules = Rules.new(73)
var board_view: BoardView
var sound: Sound
var cards: RefCounted
var card_ui
var trivia
var trivia_ui
var trivia_episode: Dictionary = {}
var reward_from_demo: bool = false
var demo_overlay_time: float = 0.0
var reward_rng: RandomNumberGenerator = RandomNumberGenerator.new()
var last_reward: Dictionary = {}
var collection_open: bool = false
var speed_index: int = 0
var difficulty_index: int = 1
var lore_button: Button
var lore_return_mode: int = -1
var difficulty_button: Button
var font: SystemFont
var heavy_font: SystemFont
var active: Array[Vector2i] = []
var origin: Vector2i = Vector2i.ZERO
var active_color: int = 0
var next_piece: Dictionary = {}
var phase: int = 0 # 0 = falling, 1 = resolving, 2 = demo reset delay
var phase_time: float = 0.0
var fall_time: float = 0.0
var clock: float = 0.0
var demo_clock: float = 0.0
var demo_wait: float = 0.0
var demo_target: int = 0
var status_time: float = 0.0
var celebration_time: float = 0.0
var celebration_message: String = ""
var pointer_down: bool = false
var pointer_start: Vector2 = Vector2.ZERO
var pointer_origin_x: int = 0
var ui_tip: Label
var ui_title: Label
var ui_kicker: Label
var ui_mode: Label
var fill_label: Label
var target_label: Label
var next_label: Label
var layout_height: float = 860.0
var layout_t: float = 0.0
var settings_y: float = 55.0
var settings_h: float = 38.0
var tip_y: float = 97.0
var tip_h: float = 45.0
var hud_y: float = 147.0
var hud_h: float = 23.0
var control_y: float = 768.0
var control_h: float = 74.0
var ui_fill: Label
var ui_status: Label
var ui_footer: Label
var ui_count: Label
var music_button: Button
const NightPalette = preload("res://scripts/night_palette.gd")
var dark_mode: bool = true
var lcd_mode: bool = false
var lcd_metal: Texture2D = preload("res://assets/lcd_metal.png")
var theme_button: Button
var sfx_button: Button
var speed_button: Button
var collection_button: Button
var menu_button: Button
var start_button: Button
var play_buttons: Array[Button] = []
var modal: Panel
var modal_title: Label
var modal_note: Label
var modal_primary: Button
var modal_secondary: Button
var modal_shade: ColorRect
var celebration_panel: Panel
var celebration_title: Label
var celebration_note: Label

func _ready() -> void:
	DisplayServer.window_set_title(Locale.t("つみなまこ"))
	# Changing the displayed project name must not strand existing collections.
	if session_path.begins_with("user://"):
		var old_dir: String = OS.get_user_data_dir().get_base_dir().path_join("ナマコ積み v0.4")
		for filename in ["namako_cards.cfg", "namako_settings.cfg", "namako_session.cfg"]:
			var destination: String = "user://" + filename
			if not FileAccess.file_exists(destination) and FileAccess.file_exists(old_dir.path_join(filename)):
				DirAccess.copy_absolute(old_dir.path_join(filename), ProjectSettings.globalize_path(destination))
	font = SystemFont.new()
	font.font_names = PackedStringArray(["Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", "Hiragino Sans", "sans-serif"])
	heavy_font = SystemFont.new()
	heavy_font.font_names = font.font_names
	heavy_font.font_weight = 700
	sound = Sound.new()
	add_child(sound)
	cards = CardCatalog.new()
	trivia = TriviaCatalog.new()
	reward_rng.randomize()
	load_speed_setting()
	var appearance: ConfigFile = ConfigFile.new()
	if appearance.load("user://namako_settings.cfg") == OK:
		dark_mode = bool(appearance.get_value("appearance", "dark", true))
		lcd_mode = bool(appearance.get_value("appearance", "lcd", false))
	board_view = BoardView.new()
	board_view.position = BOARD_POS
	board_view.size = BOARD_SIZE
	board_view.model = model
	add_child(board_view)
	build_ui()
	card_ui = CardUI.new()
	add_child(card_ui)
	card_ui.reward_dismissed.connect(finish_reward)
	card_ui.collection_dismissed.connect(close_collection)
	card_ui.reveal_peak.connect(on_reveal_peak)
	trivia_ui = TriviaUI.new()
	add_child(trivia_ui)
	trivia_ui.next_pressed.connect(finish_trivia)
	trivia_ui.more_pressed.connect(func(): trivia_ui.show_episode(trivia.pick(reward_rng), trivia.episodes.size()))
	get_viewport().size_changed.connect(refresh_layout)
	refresh_layout()
	begin_demo()

func refresh_layout() -> void:
	var window_size := DisplayServer.window_get_size()
	position = Vector2.ZERO
	if OS.get_name() == "Android":
		var safe := DisplayServer.get_display_safe_area()
		var win_pos := DisplayServer.window_get_position()
		var top := maxi(0, safe.position.y - win_pos.y)
		var bottom := maxi(0, window_size.y - (safe.end.y - win_pos.y))
		var left := maxi(0, safe.position.x - win_pos.x)
		var right := maxi(0, window_size.x - (safe.end.x - win_pos.x))
		var usable := Vector2i(maxi(1, window_size.x-left-right), maxi(1,window_size.y-top-bottom))
		var units := 540.0 / maxf(1.0, window_size.x)
		var fit := minf(float(usable.x)/window_size.x, usable.y*units/860.0)
		scale = Vector2.ONE * fit
		position = Vector2(left*units+(usable.x*units-540.0*fit)*0.5,top*units)
		window_size = Vector2i(usable.x, int(usable.y / minf(1.0, 540.0*usable.y/usable.x/860.0)))
	apply_layout_for_size(window_size)

func apply_layout_for_size(window_size: Vector2i) -> void:
	if board_view == null or ui_status == null:
		return
	if window_size.x <= 0 or window_size.y <= 0:
		return
	layout_height = maxf(860.0, 540.0 * float(window_size.y) / float(window_size.x))
	layout_t = minf((layout_height - 860.0) / 280.0, 1.0)
	var extra_height: float = layout_height - 860.0 - 280.0 * layout_t
	control_h = 74.0 + 18.0 * layout_t
	control_y = layout_height - control_h - 32.0
	var status_y: float = control_y - 30.0
	settings_y = 55.0 + 45.0 * layout_t
	settings_h = 38.0 + 34.0 * layout_t
	tip_y = 97.0 + 79.0 * layout_t
	tip_h = 45.0 + 9.0 * layout_t
	hud_y = 147.0 + 92.0 * layout_t
	hud_h = 23.0 + 20.0 * layout_t
	board_view.cell_size = 45.0 + 14.0 * layout_t + minf(3.0, extra_height / 60.0)
	board_view.cell_size = minf(board_view.cell_size, (status_y - 18.0 - (hud_y + 46.0)) / 12.0)
	board_view.size = Vector2(board_view.cell_size * 8.0, board_view.cell_size * 12.0)
	board_view.position = Vector2((540.0 - board_view.size.x) * 0.5, maxf(hud_y + 46.0, minf(180.0 + 103.0 * layout_t + extra_height * 0.35, status_y - 18.0 - board_view.size.y)))
	ui_title.position = board_view.position + Vector2(75, 18)
	ui_title.size = Vector2(board_view.size.x - 150, 46)
	ui_title.add_theme_font_size_override("font_size", 24)
	ui_title.z_index = 1
	ui_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ui_kicker.position = Vector2(22, 43.0 + 29.0 * layout_t)
	ui_kicker.visible = false
	difficulty_button.position = Vector2(20, 8.0 + 12.0 * layout_t)
	difficulty_button.size = Vector2(116, 42.0 + 22.0 * layout_t)
	menu_button.position = Vector2(144, 8.0 + 12.0 * layout_t)
	menu_button.size = Vector2(116, 42.0 + 22.0 * layout_t)
	collection_button.position = Vector2(392, 8.0 + 12.0 * layout_t)
	collection_button.size = Vector2(128, 42.0 + 22.0 * layout_t)
	lore_button.position = Vector2(268, 8.0 + 12.0 * layout_t)
	lore_button.size = Vector2(116, 42.0 + 22.0 * layout_t)
	var settings_buttons: Array[Button] = [theme_button, track_button, speed_button, music_button, sfx_button]
	var settings_x: Array[int] = [18, 102, 244, 348, 446]
	var settings_w: Array[int] = [80, 138, 100, 94, 74]
	for i in range(settings_buttons.size()):
		settings_buttons[i].position = Vector2(settings_x[i], settings_y + 5.0)
		settings_buttons[i].size = Vector2(settings_w[i], settings_h - 10.0)
	ui_tip.position = Vector2(32, tip_y)
	ui_tip.size = Vector2(476, tip_h)
	ui_status.position = Vector2(75, status_y)
	ui_status.size = Vector2(390, 24)
	if not Locale.is_japanese():
		ui_status.add_theme_font_size_override("font_size", 16)
		ui_tip.add_theme_font_size_override("font_size", 17)
	var play_x: Array[int] = [27, 127, 227, 353]
	var play_w: Array[int] = [92, 92, 118, 160]
	for i in range(play_buttons.size()):
		play_buttons[i].position = Vector2(play_x[i], control_y + 8.0)
		play_buttons[i].size = Vector2(play_w[i], control_h - 16.0)
	for button in [start_button, resume_button]:
		button.position.y = control_y + 8.0
		button.size.y = control_h - 16.0
	ui_footer.position = Vector2(18, layout_height - 29.0)
	ui_footer.size = Vector2(504, 24)
	fill_label.visible = false
	ui_fill.position = Vector2(20, hud_y)
	ui_fill.size = Vector2(65, hud_h)
	ui_fill.add_theme_font_size_override("font_size", 26)
	target_label.position = Vector2(90, hud_y + 9.0)
	target_label.size = Vector2(76, 18)
	ui_mode.position = board_view.position + Vector2(65, 76)
	ui_mode.size = Vector2(board_view.size.x - 130, 36)
	ui_mode.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ui_mode.add_theme_font_size_override("font_size", 25)
	ui_count.position = Vector2(395, hud_y)
	ui_count.size = Vector2(125, 20)
	next_label.position = Vector2(board_view.position.x + board_view.size.x - 145.0, board_view.position.y + 7.0)
	modal_shade.size.y = layout_height
	modal.position.y = 302.0 + (layout_height - 860.0) * 0.5
	celebration_panel.position.y = 332.0 + (layout_height - 860.0) * 0.5
	card_ui.set_layout_height(layout_height)
	trivia_ui.set_layout_height(layout_height)
	queue_redraw()

func panel_style(fill: Color, radius: int = 16, border: Color = Color.TRANSPARENT) -> StyleBoxFlat:
	var style: StyleBoxFlat = StyleBoxFlat.new()
	style.bg_color = fill
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_left = radius
	style.corner_radius_bottom_right = radius
	style.border_color = border
	style.set_border_width_all(1 if border.a > 0.0 else 0)
	return style

func set_chip_skin(button: Button, fill: Color, border: Color, ink: Color) -> void:
	button.add_theme_stylebox_override("normal", panel_style(fill, 15, border))
	button.add_theme_stylebox_override("hover", panel_style(fill.lightened(0.08), 15, border))
	button.add_theme_stylebox_override("pressed", panel_style(fill.darkened(0.08), 15, border))
	for state in ["font_color", "font_hover_color", "font_pressed_color"]:
		button.add_theme_color_override(state, ink)

func label_at(text: String, pos: Vector2, dimensions: Vector2, font_size: int = 16, color: Color = INK, parent: Node = null) -> Label:
	var label: Label = Label.new()
	label.text = Locale.t(text)
	label.position = pos
	label.size = dimensions
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.add_theme_font_override("font", font)
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	if parent == null:
		add_child(label)
	else:
		parent.add_child(label)
	return label

func button_at(text: String, rect: Rect2, callback: Callable, primary: bool = false, parent: Node = null) -> Button:
	var button: Button = Button.new()
	button.text = Locale.t(text)
	button.position = rect.position
	button.size = rect.size
	button.focus_mode = Control.FOCUS_NONE
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.add_theme_font_override("font", heavy_font)
	button.add_theme_font_size_override("font_size", 21 if rect.size.y > 40 else 13)
	var base: Color = Color("e9785d") if primary else Color("f4fbf8")
	var text_color: Color = Color("ffffff") if primary else INK
	button.add_theme_stylebox_override("normal", panel_style(base, 17, Color("8bc9d9") if not primary else Color.TRANSPARENT))
	button.add_theme_stylebox_override("hover", panel_style(base.lightened(0.08), 17, MINT))
	button.add_theme_stylebox_override("pressed", panel_style(base.darkened(0.08), 17))
	button.add_theme_stylebox_override("disabled", panel_style(Color("d9e4df"), 17))
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	button.add_theme_color_override("font_pressed_color", text_color)
	button.add_theme_color_override("font_disabled_color", Color("92a5a0"))
	button.pressed.connect(callback)
	if parent == null:
		add_child(button)
	else:
		parent.add_child(button)
	return button

func build_ui() -> void:
	ui_title = label_at(Locale.t("つみなまこ"), Vector2(20, 13), Vector2(190, 43), 31)
	ui_title.add_theme_font_override("font", heavy_font)
	if not Locale.is_japanese():
		ui_title.add_theme_font_size_override("font_size", 23)
	ui_kicker = label_at("DEEP SEA STACK", Vector2(22, 43), Vector2(180, 20), 11, MUTED)
	track_button = button_at(Locale.t("♪ 潮の庭"), Rect2(266, 55, 142, 38), cycle_track)
	theme_button = button_at(Locale.t("夜モード"), Rect2(20, 55, 90, 38), toggle_theme)
	music_button = button_at("BGM", Rect2(114, 55, 76, 38), toggle_music)
	music_button.tooltip_text = Locale.t("BGMのオン／オフ（設定は保存されます）")
	sfx_button = button_at("SE", Rect2(194, 55, 68, 38), toggle_sfx)
	sfx_button.tooltip_text = Locale.t("効果音のオン／オフ")
	speed_button = button_at(Locale.t("速さ ×1.0"), Rect2(412, 55, 108, 38), cycle_speed)
	speed_button.tooltip_text = Locale.t("速さを切替。デモではマッハも選べます")
	difficulty_button = button_at(Locale.t("ふつう"), Rect2(210, 8, 84, 42), cycle_difficulty)
	difficulty_button.tooltip_text = Locale.t("難易度を切替。かんたんは着地ガイド付き、むずかしいは90%目標")
	menu_button = button_at(Locale.t("Ⅱ ポーズ"), Rect2(300, 8, 54, 42), pause_game)
	menu_button.tooltip_text = Locale.t("ポーズ")
	lore_button = button_at(Locale.t("うんちく"), Rect2(268, 8, 116, 42), open_lore)
	collection_button = button_at(Locale.t("図鑑 0/20"), Rect2(362, 8, 158, 42), open_collection)
	collection_button.tooltip_text = Locale.t("集めたナマコカードを見る")
	collection_button.z_index = 1
	collection_button.add_theme_font_size_override("font_size", 18)
	menu_button.add_theme_font_size_override("font_size", 18)
	lore_button.add_theme_font_size_override("font_size", 18)
	difficulty_button.add_theme_font_size_override("font_size", 17)
	track_button.add_theme_font_size_override("font_size", 17)
	for button in [theme_button, track_button, speed_button, music_button, sfx_button]:
		button.add_theme_stylebox_override("normal", panel_style(Color("e0f3fa"), 15))
		button.add_theme_stylebox_override("hover", panel_style(Color("caebf5"), 15))
		button.add_theme_stylebox_override("pressed", panel_style(Color("b3deeb"), 15))
	for button in [theme_button, music_button, sfx_button, speed_button]:
		button.add_theme_font_size_override("font_size", 18)
	track_button.add_theme_font_size_override("font_size", 16)
	speed_button.add_theme_font_size_override("font_size", 15)
	if not Locale.is_japanese():
		theme_button.add_theme_font_size_override("font_size", 18)
	ui_tip = label_at("", Vector2(32, 98), Vector2(476, 44), 16)
	ui_tip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ui_tip.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	ui_mode = label_at("AUTO DEMO", Vector2(86, 147), Vector2(200, 20), 14, MINT)
	ui_count = label_at("", Vector2(300, 147), Vector2(154, 20), 14, MUTED)
	ui_count.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	fill_label = label_at("FILL", Vector2(22, 190), Vector2(58, 24), 12, MUTED)
	ui_fill = label_at("0%", Vector2(19, 213), Vector2(64, 40), 25, MINT)
	target_label = label_at("/ 80%", Vector2(90, 156), Vector2(76, 22), 15, MUTED)
	next_label = label_at("NEXT", Vector2(466, 190), Vector2(60, 22), 13, MUTED)
	ui_status = label_at("", Vector2(20, 743), Vector2(500, 22), 15, MINT)
	ui_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	resume_button = button_at(Locale.t("つづきから"), Rect2(82, 770, 180, 60), resume_saved, true)
	start_button = button_at(Locale.t("スタート"), Rect2(82, 770, 376, 60), begin_play, true)
	start_button.tooltip_text = Locale.t("デモを終了し、空の水槽から遊びます（Enter / Space）")
	play_buttons.append(button_at("←", Rect2(20, 770, 86, 60), move_left))
	play_buttons.append(button_at("→", Rect2(112, 770, 86, 60), move_right))
	play_buttons.append(button_at(Locale.t("回す"), Rect2(204, 770, 112, 60), rotate_right))
	play_buttons.append(button_at(Locale.t("落とす ↓"), Rect2(322, 770, 198, 60), hard_drop, true))
	play_buttons[0].tooltip_text = Locale.t("左に移動（← / A）")
	play_buttons[1].tooltip_text = Locale.t("右に移動（→ / D）")
	play_buttons[2].tooltip_text = Locale.t("回転（Z / X / ↑ または水槽をクリック）")
	play_buttons[3].tooltip_text = Locale.t("一気に落とす（Space / 下スワイプ）")
	ui_footer = label_at("", Vector2(18, 837), Vector2(504, 24), 13, MUTED)
	ui_footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ui_footer.autowrap_mode = TextServer.AUTOWRAP_OFF
	ui_footer.clip_text = true
	celebration_panel = Panel.new()
	celebration_panel.position = Vector2(52, 332)
	celebration_panel.size = Vector2(436, 150)
	celebration_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	celebration_panel.add_theme_stylebox_override("panel", panel_style(Color(1.0, 0.98, 0.91, 0.94), 27, Color("f1c96e")))
	add_child(celebration_panel)
	celebration_title = label_at(Locale.t("やったね！ 仲間が増えたよ！"), Vector2(20, 20), Vector2(396, 48), 27, Color("b66d43"), celebration_panel)
	celebration_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	celebration_title.add_theme_font_override("font", heavy_font)
	celebration_note = label_at("", Vector2(20, 72), Vector2(396, 58), 17, Color("476b68"), celebration_panel)
	celebration_note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	celebration_note.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	modal_shade = ColorRect.new()
	modal_shade.position = Vector2.ZERO
	modal_shade.size = Vector2(540, 860)
	modal_shade.color = Color(0.10, 0.22, 0.23, 0.34)
	add_child(modal_shade)
	modal = Panel.new()
	modal.position = Vector2(58, 302)
	modal.size = Vector2(424, 340)
	modal.add_theme_stylebox_override("panel", panel_style(Color("fffdf5"), 24))
	add_child(modal)
	modal_title = label_at("", Vector2(22, 22), Vector2(380, 45), 29, INK, modal)
	modal_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	modal_note = label_at("", Vector2(22, 75), Vector2(380, 44), 15, MUTED, modal)
	modal_note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	modal_primary = button_at("", Rect2(52, 135, 320, 54), modal_continue, true, modal)
	button_at(Locale.t("はじめから"), Rect2(52, 199, 320, 54), begin_play, true, modal)
	modal_secondary = button_at(Locale.t("デモに戻る"), Rect2(52, 265, 320, 45), begin_demo, false, modal)
	sync_ui()

func reset_round(seed_value: int) -> void:
	model.reset(seed_value)
	board_view.reset_visuals()
	phase = 0
	phase_time = 0.0
	fall_time = 0.0
	pointer_down = false
	status_time = 0.0
	celebration_time = 0.0
	celebration_message = ""
	last_reward = {}
	collection_open = false
	if card_ui != null:
		card_ui.hide_reward()
		card_ui.hide_collection()
	if trivia_ui != null:
		trivia_ui.visible = false
	trivia_episode.clear()
	board_view.stop_celebration()
	sound.set_celebration(false)
	next_piece = model.next_spec()
	spawn_piece()

func begin_demo() -> void:
	if mode in [Mode.PLAY, Mode.PAUSED]: SessionStore.write(self, session_path)
	mode = Mode.DEMO
	reward_from_demo = false
	demo_clock = 0.0
	reset_round(73)
	sound.set_demo(true)
	set_status(Locale.t("眺めるだけでも、のんびり。"), 2.0)
	sync_ui()

func begin_play() -> void:
	round_id = str(Time.get_unix_time_from_system()) + "-" + str(Time.get_ticks_usec())
	showing_complete = false
	reward_from_demo = false
	mode = Mode.PLAY
	reset_round(int(Time.get_ticks_usec()) & 0xffffffff)
	sound.set_demo(false)
	sound.play("start")
	set_status(Locale.t("床なら残る。床より上は２匹に触れれば残る。"), 3.2)
	sync_ui()

func resume_saved() -> void:
	var saved: Dictionary = SessionStore.read(session_path)
	if saved.is_empty():
		sync_ui()
		return
	reset_round(1)
	round_id = saved["round"]
	model = saved["restored_model"]
	board_view.model = model
	active.assign(saved["active"])
	origin = saved["origin"]
	active_color = saved["color"]
	next_piece = saved["next"]
	phase = saved["phase"]
	mode = Mode.PLAY
	difficulty_index = clampi(int(saved.get("difficulty", difficulty_index)), 0, 2)
	sound.set_demo(false)
	if str(saved.get("mode", "")) == "trivia":
		trivia_episode = trivia.by_id(int(saved["trivia_id"]))
		if not trivia_episode.is_empty():
			mode = Mode.TRIVIA
			trivia_ui.show_episode(trivia_episode, trivia.episodes.size())
			trivia_ui.set_reader_mode(false)
			sync_ui()
			return
	board_view.active = active.duplicate()
	board_view.origin = origin
	board_view.visual_origin = Vector2(origin)
	board_view.active_color = active_color
	board_view.show_ghost = difficulty_index != 2
	if goal_reached():
		show_clear()
		finish_celebration()
	else:
		if phase == 1: spawn_piece()
		pause_game()
	sync_ui()

func cycle_track() -> void:
	sound.cycle_track()
	sync_ui()

func spawn_piece() -> void:
	active = model.shape(int(next_piece["shape"]))
	active_color = int(next_piece["color"])
	next_piece = model.next_spec()
	origin = Vector2i(int(floor(float(Rules.COLS - model.width(active)) / 2.0)), -Rules.TOP_BUFFER)
	phase = 0
	fall_time = 0.0
	if mode == Mode.DEMO:
		var plan: Dictionary = model.demo_choice(active, model.turns > 2 and model.turns % 5 == 3)
		if not plan.is_empty():
			active.assign(plan["cells"])
			origin.x = clampi(origin.x, 0, Rules.COLS - model.width(active))
			var destination: Vector2i = plan["origin"]
			demo_target = destination.x
		else:
			demo_target = origin.x
		demo_wait = 0.45
	board_view.active = active.duplicate()
	board_view.origin = origin
	board_view.visual_origin = Vector2(origin)
	board_view.active_color = active_color
	board_view.show_active = true
	board_view.show_ghost = mode == Mode.PLAY and difficulty_index != 2
	update_prediction()
	sync_ui()
	queue_redraw()
	SessionStore.write(self, session_path)

func _process(raw_delta: float) -> void:
	var delta: float = minf(raw_delta, 0.05)
	clock += delta
	save_clock += delta
	if save_clock >= 1.0:
		save_clock = 0.0
		if lore_return_mode < 0: SessionStore.write(self, session_path)
	if mode == Mode.DEMO:
		demo_clock += delta
		ui_tip.text = Locale.t(TIPS[int(floor(demo_clock / 5.2)) % TIPS.size()]).replace("80%", "%d%%" % int(round(target_ratio() * 100.0)))
	if reward_from_demo and mode in [Mode.REVEAL, Mode.TRIVIA]:
		demo_overlay_time -= delta
		if demo_overlay_time <= 0.0:
			if mode == Mode.REVEAL: finish_reward()
			else: finish_trivia()
	if collection_open or mode in [Mode.PAUSED, Mode.CLEAR, Mode.REVEAL, Mode.TRIVIA]:
		queue_redraw()
		return
	if mode == Mode.CELEBRATE:
		celebration_time = maxf(0.0, celebration_time - delta)
		if celebration_time <= 0.0:
			finish_celebration()
		queue_redraw()
		return
	if status_time > 0.0:
		status_time = maxf(0.0, status_time - delta)
		if status_time == 0.0:
			update_prediction()
	if phase != 0:
		phase_time -= delta * (3.0 if mode == Mode.DEMO and speed_index == 4 else 1.0)
		if phase_time <= 0.0:
			if phase == 2:
				reset_round(73 + int(clock) % 97)
			elif goal_reached():
				if mode == Mode.DEMO:
					show_clear(true)
				else:
					show_clear()
			elif mode == Mode.DEMO and model.turns >= 50:
				phase = 2
				phase_time = 1.0
			else:
				spawn_piece()
	elif mode == Mode.DEMO:
		process_demo(delta * speed_multiplier())
	else:
		fall_time += delta * speed_multiplier()
		var interval: float = 0.055 if Input.is_key_pressed(KEY_DOWN) or Input.is_key_pressed(KEY_S) else 0.72
		if fall_time >= interval:
			fall_time = 0.0
			if not try_move(Vector2i.DOWN, false):
				lock_piece()
	queue_redraw()

func process_demo(delta: float) -> void:
	demo_wait -= delta
	if demo_wait > 0.0:
		return
	if origin.x != demo_target and origin.y < 0:
		try_move(Vector2i(1 if demo_target > origin.x else -1, 0), false)
		demo_wait = 0.13
	else:
		if not try_move(Vector2i.DOWN, false):
			lock_piece()
		demo_wait = 0.075

func try_move(change: Vector2i, audible: bool = true) -> bool:
	if phase != 0 or (mode != Mode.PLAY and mode != Mode.DEMO):
		return false
	var candidate: Vector2i = origin + change
	if not model.can_place(active, candidate):
		return false
	origin = candidate
	board_view.origin = origin
	if audible and change.x != 0:
		sound.play("move", mode == Mode.DEMO)
	update_prediction()
	return true

func move_left() -> void:
	try_move(Vector2i.LEFT)

func move_right() -> void:
	try_move(Vector2i.RIGHT)

func rotate_right() -> void:
	rotate_piece(1)

func rotate_piece(direction: int) -> void:
	if mode != Mode.PLAY or phase != 0:
		return
	var rotated: Array[Vector2i] = model.rotate(active, direction)
	for kick in [0, -1, 1, -2, 2, -3, 3]:
		var candidate: Vector2i = origin + Vector2i(int(kick), 0)
		if model.can_place(rotated, candidate):
			board_view.animate_rotation(active, board_view.visual_origin)
			active = rotated
			origin = candidate
			board_view.active = active.duplicate()
			board_view.origin = origin
			sound.play("rotate")
			update_prediction()
			return

func hard_drop() -> void:
	if mode != Mode.PLAY or phase != 0:
		return
	origin = model.landing(active, origin)
	board_view.origin = origin
	board_view.visual_origin = Vector2(origin)
	sound.play("drop")
	lock_piece()

func lock_piece() -> void:
	if phase != 0:
		return
	var result: Dictionary = model.commit(active, origin, active_color)
	phase = 1
	phase_time = 0.70
	board_view.show_active = false
	pointer_down = false
	var absolute: Array[Vector2i] = []
	var center: Vector2 = Vector2.ZERO
	for cell in active:
		absolute.append(origin + cell)
		center += (Vector2(origin + cell) + Vector2(0.5, 0.5)) * board_view.cell_size
	center /= float(maxi(1, active.size()))
	if bool(result["keep"]):
		board_view.bounce(int(result["id"]), center, active_color)
		sound.play("stick", mode == Mode.DEMO)
		set_status(Locale.t("ぴたっ！　床にくっついた。") if str(result["reason"]) == "floor" else Locale.t("ぴたっ！　２匹にくっついて残った。"), 1.35)
	else:
		board_view.dissolve(absolute, active_color)
		sound.play("slip", mode == Mode.DEMO)
		set_status(Locale.t("上はいっぱい。横にずらしてみよう。") if str(result["reason"]) == "overflow" else Locale.t("ぬるっ…　大丈夫、次を置こう。"), 1.35)
	sync_ui()
	SessionStore.write(self, session_path)

func update_prediction() -> void:
	board_view.guide_origin = recommend_origin()
	if mode != Mode.PLAY or phase != 0 or status_time > 0.0:
		return
	if difficulty_index == 2:
		ui_status.text = Locale.t("着地をよく見て、仲間をつなごう。")
		return
	var result: Dictionary = model.preview(active, model.landing(active, origin))
	if bool(result["keep"]):
		ui_status.text = Locale.t("ここなら残る！") if not bool(result["floor"]) else Locale.t("床にぴたっ。ここなら残る！")
		ui_status.add_theme_color_override("font_color", MINT)
	else:
		ui_status.text = Locale.t("ここだと消える → 横にずらす／回してみよう")
		ui_status.add_theme_color_override("font_color", Color("a07745"))

func set_status(text: String, duration: float) -> void:
	ui_status.text = Locale.t(text)
	ui_status.add_theme_color_override("font_color", MINT)
	status_time = duration

func pause_game() -> void:
	if mode != Mode.PLAY:
		return
	mode = Mode.PAUSED
	SessionStore.write(self, session_path)
	pointer_down = false
	board_view.frozen = true
	sound.play("click")
	sync_ui()

func modal_continue() -> void:
	if mode == Mode.CLEAR:
		begin_play()
	elif mode == Mode.PAUSED:
		mode = Mode.PLAY
		board_view.frozen = false
		sound.play("click")
		sync_ui()

func show_clear(from_demo: bool = false) -> void:
	reward_from_demo = from_demo
	if from_demo: round_id = "demo-" + str(Time.get_ticks_usec()) + "-" + str(randi())
	mode = Mode.CELEBRATE
	board_view.show_active = false
	celebration_time = CELEBRATION_SECONDS
	celebration_message = Locale.t(CELEBRATION_MESSAGES[randi_range(0, CELEBRATION_MESSAGES.size() - 1)])
	board_view.start_celebration()
	sound.set_celebration(true)
	sound.play("clear")
	sound.play("fanfare", from_demo)
	set_status(Locale.t("パンパカパーン！　みんなでくねくね。"), CELEBRATION_SECONDS)
	sync_ui()
	SessionStore.write(self, session_path)

func finish_celebration() -> void:
	if mode != Mode.CELEBRATE:
		return
	board_view.stop_celebration()
	sound.set_celebration(false)
	if not reward_from_demo and cards.rewards_enabled():
		var was_unlocked: bool = cards.milestone_unlocked()
		var reward: Dictionary = cards.grant_for_round(round_id, reward_rng)
		if not reward.is_empty():
			last_reward = reward.duplicate(true)
			mode = Mode.REVEAL
			demo_overlay_time = 6.5 if reward_from_demo else 0.0
			card_ui.show_reward(reward, cards.owned_count(str(reward.get("id", ""))), not was_unlocked and cards.milestone_unlocked())
			sync_ui()
			return
	show_trivia()

func on_reveal_peak(rank: String) -> void:
	sound.play("card_rare" if rank in ["SR", "SSR", "SECRET", "COMPLETE"] else "card_pop")

func finish_reward() -> void:
	if mode != Mode.REVEAL:
		return
	if not showing_complete and cards.complete() and not cards.completion_seen:
		showing_complete = true
		demo_overlay_time = 6.5 if reward_from_demo else 0.0
		card_ui.show_reward(cards.completion_card(), 1, false)
		sync_ui()
		return
	if showing_complete:
		cards.completion_seen = true
		cards.save_collection()
		showing_complete = false
	card_ui.hide_reward()
	show_trivia()

func open_lore() -> void:
	if collection_open or mode not in [Mode.DEMO, Mode.PLAY, Mode.PAUSED]: return
	lore_return_mode = mode
	if mode == Mode.PLAY: SessionStore.write(self, session_path)
	board_view.frozen = true
	show_trivia()
	trivia_ui.set_reader_mode(true)

func show_trivia() -> void:
	trivia_episode = trivia.pick(reward_rng)
	if trivia_episode.is_empty():
		finish_trivia()
		return
	mode = Mode.TRIVIA
	demo_overlay_time = 18.0 if reward_from_demo else 0.0
	trivia_ui.show_episode(trivia_episode, trivia.episodes.size())
	trivia_ui.set_reader_mode(lore_return_mode >= 0)
	sync_ui()
	if lore_return_mode < 0: SessionStore.write(self, session_path)

func finish_trivia() -> void:
	if mode != Mode.TRIVIA and mode != Mode.CELEBRATE:
		return
	if lore_return_mode >= 0:
		mode = lore_return_mode
		lore_return_mode = -1
		trivia_ui.visible = false
		trivia_episode.clear()
		board_view.frozen = mode == Mode.PAUSED
		sync_ui()
		return
	var was_demo: bool = reward_from_demo
	trivia_ui.visible = false
	trivia_episode.clear()
	reward_from_demo = false
	demo_overlay_time = 0.0
	if not was_demo: SessionStore.clear(session_path)
	sound.play("click", was_demo)
	if was_demo: begin_demo()
	else: begin_play()

func open_collection() -> void:
	if not cards.rewards_enabled() or mode in [Mode.DEMO, Mode.CELEBRATE, Mode.REVEAL, Mode.TRIVIA]:
		return
	collection_open = true
	pointer_down = false
	board_view.frozen = true
	card_ui.show_collection(cards)
	sound.play("click")
	sync_ui()

func close_collection() -> void:
	if not collection_open:
		return
	collection_open = false
	card_ui.hide_collection()
	board_view.frozen = mode == Mode.PAUSED
	sound.play("click")
	sync_ui()

func target_ratio() -> float:
	return DIFFICULTY_TARGETS[difficulty_index]

func goal_reached() -> bool:
	return model.fill_ratio() >= target_ratio()

func recommend_origin() -> Vector2i:
	if mode != Mode.PLAY or difficulty_index != 0 or active.is_empty(): return Vector2i(-1, -1)
	var best: Vector2i = Vector2i(-1, -1)
	var best_score: float = -INF
	for x in range(Rules.COLS - model.width(active) + 1):
		var start: Vector2i = Vector2i(x, -Rules.TOP_BUFFER)
		if not model.can_place(active, start): continue
		var spot: Vector2i = model.landing(active, start)
		var result: Dictionary = model.preview(active, spot)
		if not bool(result.get("keep", false)): continue
		var score: float = float(spot.y * 10 + result["contacts"].size() * 2) - absf(float(x - 3)) * 0.1
		if score > best_score:
			best_score = score
			best = spot
	return best

func speed_multiplier() -> float:
	var base: float = SPEED_VALUES[3 if speed_index == 4 and mode != Mode.DEMO else clampi(speed_index, 0, SPEED_VALUES.size() - 1)]
	return base * (1.4 if difficulty_index == 2 and mode != Mode.DEMO else 1.0)

func load_speed_setting() -> void:
	var config: ConfigFile = ConfigFile.new()
	if config.load("user://namako_settings.cfg") == OK:
		speed_index = clampi(int(config.get_value("gameplay", "speed_index", 0)), 0, SPEED_VALUES.size() - 1)
		difficulty_index = clampi(int(config.get_value("gameplay", "difficulty_index", 1)), 0, 2)

func save_speed_setting() -> void:
	var config: ConfigFile = ConfigFile.new()
	config.load("user://namako_settings.cfg")
	config.set_value("gameplay", "speed_index", speed_index)
	config.set_value("gameplay", "difficulty_index", difficulty_index)
	var error: Error = config.save("user://namako_settings.cfg")
	if error != OK:
		push_warning("Speed preference could not be saved; gameplay is unaffected.")

func cycle_speed() -> void:
	speed_index = (speed_index + 1) % (SPEED_VALUES.size() if mode == Mode.DEMO else 4)
	save_speed_setting()
	sound.play("click")
	set_status(Locale.t("落下スピード %s") % Locale.t(SPEED_LABELS[3 if speed_index == 4 and mode != Mode.DEMO else speed_index]), 1.1)
	sync_ui()

func cycle_difficulty() -> void:
	difficulty_index = (difficulty_index + 1) % 3
	save_speed_setting()
	sound.play("click")
	update_prediction()
	sync_ui()
	SessionStore.write(self, session_path)

func toggle_music() -> void:
	sound.toggle_music()
	sync_ui()

func toggle_sfx() -> void:
	sound.toggle_sfx()
	sync_ui()

func toggle_theme() -> void:
	if lcd_mode:
		lcd_mode = false
		dark_mode = true
	elif dark_mode:
		dark_mode = false
	else:
		lcd_mode = true
	var config: ConfigFile = ConfigFile.new()
	config.load("user://namako_settings.cfg")
	config.set_value("appearance", "dark", dark_mode)
	config.set_value("appearance", "lcd", lcd_mode)
	config.save("user://namako_settings.cfg")
	sound.play("click")
	sync_ui()
	queue_redraw()

func sync_ui() -> void:
	if theme_button != null:
		theme_button.text = Locale.t("液晶") if lcd_mode else (Locale.t("夜モード") if dark_mode else Locale.t("昼モード"))
	board_view.dark_mode = dark_mode
	board_view.lcd_mode = lcd_mode
	NightPalette.apply(self, dark_mode)
	if trivia_ui != null: trivia_ui.apply_theme(dark_mode)
	if card_ui != null: card_ui.apply_theme(dark_mode)
	if ui_tip == null:
		return
	set_chip_skin(difficulty_button, Color("5a4639") if dark_mode else Color("ffe5ba"), Color("d3a16e") if dark_mode else Color("c79864"), Color("ffe7ba") if dark_mode else Color("755039"))
	set_chip_skin(theme_button, Color("514274") if dark_mode else Color("e5d8fa"), Color("b7a1ef") if dark_mode else Color("b89bda"), Color("f5eaff") if dark_mode else Color("523770"))
	set_chip_skin(speed_button, Color("6c5235") if dark_mode else Color("ffebb8"), Color("efc66a") if dark_mode else Color("e4bd59"), Color("fff0bf") if dark_mode else Color("765116"))
	set_chip_skin(collection_button, Color("124c63") if dark_mode else Color("d5f4f3"), Color("66d3e8") if dark_mode else Color("54afbe"), Color("e3fcff") if dark_mode else Color("0e6f80"))
	difficulty_button.text = Locale.t(DIFFICULTY_NAMES[difficulty_index])
	target_label.text = "/ %d%%" % int(round(target_ratio() * 100.0))
	board_view.show_ghost = mode == Mode.PLAY and difficulty_index != 2
	board_view.show_guide = mode == Mode.PLAY and difficulty_index == 0
	board_view.guide_origin = recommend_origin()
	var has_session: bool = not SessionStore.read(session_path).is_empty()
	resume_button.visible = mode == Mode.DEMO and has_session
	start_button.text = Locale.t("はじめから") if has_session else Locale.t("スタート")
	start_button.position.x = 278 if has_session else 82
	start_button.size.x = 180 if has_session else 376
	track_button.text = "♪ " + Locale.t(sound.TRACK_NAMES[sound.track_index])
	music_button.text = "BGM " + ("ON" if sound.music_enabled else "OFF")
	sfx_button.text = "SE " + ("ON" if sound.sfx_enabled else "OFF")
	speed_button.text = Locale.t("速さ ") + Locale.t(SPEED_LABELS[3 if speed_index == 4 and mode != Mode.DEMO else speed_index])
	collection_button.text = Locale.t("図鑑 %d/%d") % [cards.owned_unique_count(), cards.enabled_cards().size()]
	collection_button.visible = mode != Mode.DEMO and cards.rewards_enabled() and mode != Mode.CELEBRATE and mode != Mode.REVEAL and mode != Mode.TRIVIA and not collection_open
	ui_mode.visible = mode == Mode.DEMO
	ui_title.add_theme_font_size_override("font_size", 34 if mode == Mode.DEMO else 26)
	ui_title.modulate.a = 0.75
	if lcd_mode:
		for button in [theme_button,track_button,speed_button,music_button,sfx_button,difficulty_button,menu_button,lore_button,collection_button]:
			set_chip_skin(button,Color("28636c"),Color("184f56"),Color.WHITE)
		for button in play_buttons + [start_button,resume_button]:
			set_chip_skin(button,Color("df4d40"),Color("8d2c28"),Color.WHITE)
		for label in [ui_title,ui_mode,ui_fill,ui_count,target_label,next_label,ui_tip,ui_status,ui_footer]:
			label.add_theme_color_override("font_color",Color("263b39"))
	ui_fill.text = "%d%%" % int(floor(model.fill_ratio() * 100.0))
	board_view.next_preview = next_piece.duplicate()
	ui_count.text = Locale.t("残った %d匹") % model.kept
	ui_mode.text = "AUTO DEMO" if mode == Mode.DEMO else ("FRIENDS PARTY" if mode == Mode.CELEBRATE else ("CARD GET" if mode == Mode.REVEAL else (Locale.t("研究手帖") if mode == Mode.TRIVIA else (Locale.t("ナマコの仲間たち") if cards.milestone_unlocked() else Locale.t("のんびり積もう")))))
	menu_button.visible = mode == Mode.PLAY
	lore_button.visible = mode in [Mode.DEMO, Mode.PLAY, Mode.PAUSED] and not collection_open
	start_button.visible = mode == Mode.DEMO
	for button in play_buttons:
		button.visible = mode == Mode.PLAY
		button.disabled = phase != 0
	if mode == Mode.CELEBRATE:
		ui_tip.text = Locale.t("やったね！ 仲間が増えたよ！")
	elif mode != Mode.DEMO:
		ui_tip.text = Locale.t("床なら残る。床より上は別のナマコ２匹に触れれば残る。\n１匹以下なら、ぬるっと消える。")
	else:
		ui_tip.text = Locale.t(TIPS[int(floor(demo_clock / 5.2)) % TIPS.size()]).replace("80%", "%d%%" % int(round(target_ratio() * 100.0)))
	ui_footer.text = Locale.t("自動デモ中  ·  ルールを見たらスタート  ·  速さボタンで変更") if mode == Mode.DEMO else (Locale.t("お祝い中…　このあとカードをゲット！") if mode == Mode.CELEBRATE else Locale.t("← → 移動   Z / X 回転   Space 落下   Esc メニュー   R やり直す"))
	celebration_panel.visible = mode == Mode.CELEBRATE
	celebration_note.text = celebration_message
	modal.visible = (mode == Mode.PAUSED or mode == Mode.CLEAR) and not collection_open
	modal_shade.visible = modal.visible
	if mode == Mode.PAUSED:
		modal_title.text = Locale.t("ひと休み")
		modal_note.text = Locale.t("急がなくて大丈夫。\n「はじめから」で空の水槽からやり直せます。")
		modal_primary.text = Locale.t("つづける")
	elif mode == Mode.CLEAR:
		modal_title.text = Locale.t("仲間が増えたよ！")
		modal_note.text = Locale.t("%s\n水槽 %d%%  ·  残った %d匹") % [str(last_reward.get("name", "")) + Locale.t("を獲得！") if not last_reward.is_empty() else celebration_message, int(floor(model.fill_ratio() * 100.0)), model.kept]
		modal_primary.text = Locale.t("もう一回")
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	var local_pointer := Vector2.ZERO
	if event is InputEventMouseButton or event is InputEventMouseMotion:
		local_pointer = get_global_transform_with_canvas().affine_inverse() * event.position
	if event is InputEventKey and event.pressed:
		var key: int = event.keycode
		if collection_open:
			if not event.echo and key == KEY_ESCAPE:
				close_collection()
			return
		if mode == Mode.TRIVIA:
			if not event.echo and key in [KEY_ESCAPE, KEY_ENTER, KEY_KP_ENTER, KEY_SPACE]:
				finish_trivia()
			return
		if mode == Mode.REVEAL:
			if not event.echo and key in [KEY_ESCAPE, KEY_ENTER, KEY_KP_ENTER, KEY_SPACE]:
				finish_reward()
			return
		if mode == Mode.DEMO:
			if not event.echo and key in [KEY_ENTER, KEY_KP_ENTER, KEY_SPACE]:
				begin_play()
				get_viewport().set_input_as_handled()
			return
		if mode == Mode.CELEBRATE:
			return
		if not event.echo and key == KEY_R:
			begin_play()
			return
		if mode == Mode.PAUSED or mode == Mode.CLEAR:
			if not event.echo and key in [KEY_ESCAPE, KEY_ENTER, KEY_KP_ENTER, KEY_SPACE]:
				modal_continue()
			return
		match key:
			KEY_LEFT, KEY_A:
				move_left()
			KEY_RIGHT, KEY_D:
				move_right()
			KEY_Z:
				if not event.echo:
					rotate_piece(-1)
			KEY_X, KEY_UP:
				if not event.echo:
					rotate_piece(1)
			KEY_SPACE:
				if not event.echo:
					hard_drop()
			KEY_ESCAPE, KEY_P:
				if not event.echo:
					pause_game()
	if mode != Mode.PLAY or phase != 0:
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT and event.pressed and Rect2(board_view.position, board_view.size).has_point(local_pointer):
			hard_drop()
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed and Rect2(board_view.position, board_view.size).has_point(local_pointer):
				pointer_down = true
				pointer_start = local_pointer
				pointer_origin_x = origin.x
			elif not event.pressed and pointer_down:
				pointer_down = false
				var change: Vector2 = local_pointer - pointer_start
				if change.y > 52.0 and change.y > absf(change.x) * 0.8:
					hard_drop()
				elif change.length() < 12.0:
					rotate_right()
	elif event is InputEventMouseMotion and pointer_down:
		var target: int = pointer_origin_x + int(round((local_pointer.x - pointer_start.x) / board_view.cell_size))
		target = clampi(target, 0, Rules.COLS - model.width(active))
		for _step in range(Rules.COLS):
			if origin.x == target or not try_move(Vector2i(1 if target > origin.x else -1, 0)):
				break

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		SessionStore.write(self, session_path)
	if is_instance_valid(sound) and is_instance_valid(sound.music):
		if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
			sound.music.stream_paused = true
		elif what == NOTIFICATION_APPLICATION_FOCUS_IN:
			sound.music.stream_paused = false
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and mode == Mode.PLAY and is_instance_valid(board_view):
		pause_game()

func _draw() -> void:
	if lcd_mode:
		draw_lcd_housing()
		return
	draw_rect(Rect2(0, 0, 540, layout_height), (Color("252b30") if dark_mode else Color("f9f5e4")) if cards != null and cards.milestone_unlocked() else (Color("071c29") if dark_mode else Color("eaf7fb")))
	# Soft decorative ocean shapes, not simulated collision geometry.
	draw_circle(Vector2(515, 557), 181.0, (Color("18323b") if dark_mode else Color("e0efdf")))
	draw_circle(Vector2(14, 740), 157.0, (Color("172e3c") if dark_mode else Color("dfefe9")))
	for i in range(8):
		var y: float = fposmod(float(i) * 137.0 - clock * 4.0, layout_height)
		var x: float = 46.0 if i % 2 == 0 else 487.0
		draw_circle(Vector2(x + sin(clock * 0.6 + float(i)) * 9.0, y), float(3 + i % 4), Color(1, 1, 1, 0.7), false, 1.3, true)
	draw_style_box(panel_style((Color("194b60") if dark_mode else Color("78bdd3")), 18), Rect2(12, settings_y - 2.0, 516, settings_h + 4.0))
	draw_style_box(panel_style((Color("193944") if dark_mode else Color("ffffff")), 18, Color("3c95ad") if dark_mode else Color("78bdd3")), Rect2(12, settings_y - 4.0, 516, settings_h + 3.0))
	draw_style_box(panel_style((Color("9c7741") if dark_mode else Color("e5bd6e")), 18), Rect2(20, tip_y + 2.0, 500, tip_h + 2.0))
	draw_style_box(panel_style((Color("24445b") if dark_mode else Color("fff7df")), 18), Rect2(20, tip_y, 500, tip_h))
	draw_style_box(panel_style((Color("174454") if dark_mode else Color("d9f1fa")), 12), Rect2(75, control_y - 30.0, 390, 24))
	draw_style_box(panel_style((Color("22566a") if dark_mode else Color("78bdd3")), 22), Rect2(20, control_y, 500, control_h))
	draw_style_box(panel_style((Color("173a4b") if dark_mode else Color("f8fdff")), 22, Color("3c95ad") if dark_mode else Color("78bdd3")), Rect2(20, control_y - 3.0, 500, control_h))
	draw_style_box(panel_style((Color("0c6b8c") if dark_mode else Color("229bc4")), 26), Rect2(board_view.position - Vector2(12, 3), board_view.size + Vector2(24, 20)))
	var aquarium_frame: StyleBoxFlat = panel_style((Color("285d70") if dark_mode else Color("f4fcff")), 24, Color("85f1f8") if dark_mode else Color("087ca6"))
	aquarium_frame.set_border_width_all(5)
	draw_style_box(aquarium_frame, Rect2(board_view.position - Vector2(10, 10), board_view.size + Vector2(20, 20)))
	# Sand/floor lip.
	draw_style_box(panel_style(Color("eac990"), 6), Rect2(board_view.position.x, board_view.position.y + board_view.size.y + 1.0, board_view.size.x, 4))
	var ratio: float = model.fill_ratio() if model != null else 0.0
	var progress_rect: Rect2 = Rect2(board_view.position.x + 14.0, board_view.position.y - 6.0, board_view.size.x - 28.0, 4)
	draw_style_box(panel_style((Color("29515b") if dark_mode else Color("d4e9e3")), 3), progress_rect)
	if ratio > 0.0:
		draw_style_box(panel_style((Color("76e4c8") if dark_mode else Color("168c7c")), 3), Rect2(progress_rect.position, Vector2(progress_rect.size.x * minf(ratio / target_ratio(), 1.0), 4)))






func draw_lcd_housing() -> void:
	draw_style_box(panel_style(Color("2d777e"),28),Rect2(0,0,540,layout_height))
	draw_texture_rect(lcd_metal,Rect2(9,9,522,layout_height-18),false,Color("89938f"))
	draw_style_box(panel_style(Color("203b3d"),18,Color("5a7575")),Rect2(board_view.position-Vector2(13,13),board_view.size+Vector2(26,26)))
	draw_style_box(panel_style(Color("bcc6bd"),12,Color("758a82")),Rect2(20,tip_y,500,tip_h))
	draw_style_box(panel_style(Color("bdc6bc"),10),Rect2(75,control_y-30,390,24))
	for point in [Vector2(16,16),Vector2(524,16),Vector2(16,layout_height-16),Vector2(524,layout_height-16)]:
		draw_circle(point,8.5,Color("667671"))
		draw_circle(point-Vector2(0,1),7.5,Color("c7ceca"))
		draw_line(point-Vector2(4,-2),point+Vector2(4,-2),Color("596965"),2,true)
