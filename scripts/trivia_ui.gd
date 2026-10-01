extends Control
const Locale = preload("res://scripts/locale_text.gd")
## Research-note interstitial after the card reveal.

signal next_pressed
signal more_pressed
var more_button: Button
var reader_scroll: ScrollContainer
var art_viewer: Button
var source_note: Label

var outer: Panel
var lab: Panel
var paper: Panel
var heading_label: Label
var title_label: Label
var body_label: Label
var number_label: Label
var speech: Panel
var speech_label: Label
var next_button: Button

func style(fill: Color, border: Color, radius: int = 18, width: int = 2) -> StyleBoxFlat:
	var s: StyleBoxFlat = StyleBoxFlat.new()
	s.bg_color = fill
	s.border_color = border
	s.set_border_width_all(width)
	s.set_corner_radius_all(radius)
	return s

func label(parent: Node, words: String, rect: Rect2, size_px: int, color: Color, bold: bool = false) -> Label:
	var item: Label = Label.new()
	item.text = Locale.t(words)
	item.position = rect.position
	item.size = rect.size
	item.add_theme_font_size_override("font_size", size_px)
	item.add_theme_color_override("font_color", color)
	var face: SystemFont = SystemFont.new()
	face.font_names = PackedStringArray(["Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", "sans-serif"])
	face.font_weight = 700 if bold else 400
	item.add_theme_font_override("font", face)
	item.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	item.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(item)
	return item

func _ready() -> void:
	set_meta("night_palette_managed", true)
	z_index = 10
	position = Vector2.ZERO
	size = Vector2(540, 860)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var shade: ColorRect = ColorRect.new()
	shade.color = Color(0.03, 0.12, 0.20, 0.84)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(shade)
	outer = Panel.new()
	outer.position = Vector2(25, 25)
	outer.size = Vector2(490, 810)
	add_child(outer)
	heading_label = label(outer, Locale.t("✦ １面クリア ✦"), Rect2(25, 15, 440, 47), 31, Color("ffdc79"), true)
	heading_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lab = Panel.new()
	lab.position = Vector2(18, 73)
	lab.size = Vector2(454, 352)
	outer.add_child(lab)
	var portrait: TextureRect = TextureRect.new()
	portrait.position = Vector2(4, 1)
	portrait.size = Vector2(314, 348)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.texture = load("res://assets/professor_gabo.webp") as Texture2D
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	lab.add_child(portrait)
	speech = Panel.new()
	speech.position = Vector2(254, 38)
	speech.size = Vector2(187, 131)
	lab.add_child(speech)
	speech_label = label(speech, Locale.t("わしは\n『つみなまこ』研究の\n博士である。"), Rect2(10, 13, 167, 108), 18, Color("173948"), true)
	speech_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	speech_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	var name: Label = label(outer, Locale.t("ガボジョイック・ベヘソナー博士"), Rect2(34, 432, 422, 32), 18, Color("fff2d3"), true)
	name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	paper = Panel.new()
	paper.position = Vector2(18, 473)
	paper.size = Vector2(454, 246)
	outer.add_child(paper)
	number_label = label(paper, Locale.t("研究手帖 001 / 100"), Rect2(20, 12, 414, 30), 17, Color("74563a"), true)
	reader_scroll = ScrollContainer.new()
	reader_scroll.position = Vector2(20, 48)
	reader_scroll.size = Vector2(414, 182)
	reader_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	paper.add_child(reader_scroll)
	var words := VBoxContainer.new()
	words.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	words.add_theme_constant_override("separation", 12)
	reader_scroll.add_child(words)
	title_label = label(words, "", Rect2(0, 0, 390, 0), 24, Color("173948"), true)
	body_label = label(words, "", Rect2(0, 0, 390, 0), 21, Color("274550"))
	for item in [title_label, body_label]:
		item.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		item.custom_minimum_size.x = 360
		item.mouse_filter = Control.MOUSE_FILTER_PASS
	source_note = label(outer, Locale.t("ツミナマコは架空の生き物です。"), Rect2(30, 721, 430, 22), 12, Color("e4d5b4"))
	source_note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	next_button = Button.new()
	next_button.text = Locale.t("次の面へ ▶")
	next_button.position = Vector2(45, 750)
	next_button.size = Vector2(400, 52)
	next_button.add_theme_font_size_override("font_size", 23)
	next_button.add_theme_color_override("font_color", Color.WHITE)
	next_button.add_theme_color_override("font_hover_color", Color.WHITE)
	next_button.add_theme_stylebox_override("normal", style(Color("e9785d"), Color("b84747"), 16))
	next_button.add_theme_stylebox_override("hover", style(Color("f58b6e"), Color("b84747"), 16))
	next_button.pressed.connect(func() -> void: next_pressed.emit())
	more_button = Button.new()
	more_button.text = Locale.t("もう１話")
	more_button.position = Vector2(45, 750)
	more_button.size = Vector2(195, 52)
	more_button.add_theme_font_size_override("font_size", 21)
	more_button.pressed.connect(func(): more_pressed.emit())
	outer.add_child(more_button)
	more_button.visible = false
	var companion_names := ["博士", "コリ助", "プレ号"]
	var companion_files := ["trivia_professor", "trivia_korisuke", "trivia_corinpre"]
	for i in range(3):
		var tile := Button.new()
		tile.position = Vector2(322, 182 + i * 53)
		tile.size = Vector2(124, 48)
		tile.text = Locale.t(companion_names[i])
		tile.add_theme_font_size_override("font_size", 18)
		var path: String = "res://browser/assets/" + companion_files[i] + ("" if Locale.is_japanese() else "_en") + ".png"
		# Assets are copied to the native tree because browser/ is excluded from APK.
		path = path.replace("browser/assets/", "assets/trivia/")
		tile.pressed.connect(func(): show_art(path))
		lab.add_child(tile)
	outer.add_child(next_button)
	apply_theme(false)
	visible = false

func set_layout_height(height: float) -> void:
	size.y = height
	outer.position.y = 16.0
	outer.size.y = height - 32.0
	var panel_height := outer.size.y
	paper.size.y = panel_height - paper.position.y - 92.0
	reader_scroll.size.y = paper.size.y - 64.0
	source_note.position.y = panel_height - 88.0
	next_button.position.y = panel_height - 70.0
	more_button.position.y = panel_height - 70.0
	if art_viewer != null:
		art_viewer.position.y = outer.position.y
		art_viewer.size.y = outer.size.y
		art_viewer.get_child(0).size.y = outer.size.y - 100.0
		art_viewer.get_child(1).position.y = outer.size.y - 55.0

func apply_theme(dark: bool) -> void:
	if outer == null:
		return
	outer.add_theme_stylebox_override("panel", style(Color("193547") if dark else Color("2a5262"), Color("65c9d9"), 25, 4))
	lab.add_theme_stylebox_override("panel", style(Color("253d47") if dark else Color("728d89"), Color("ba9c68"), 18, 3))
	speech.add_theme_stylebox_override("panel", style(Color("f4f0de"), Color("4b7380"), 20, 3))
	paper.add_theme_stylebox_override("panel", style(Color("eee2c8") if dark else Color("fff1d1"), Color("b58e5c"), 13, 3))

func show_episode(episode: Dictionary, total: int) -> void:
	if episode.is_empty():
		return
	number_label.text = Locale.t("研究手帖 %03d / %03d") % [int(episode.get("id", 0)), total]
	title_label.text = str(episode.get("title", ""))
	body_label.text = str(episode.get("body", ""))
	reader_scroll.scroll_vertical = 0
	visible = true

func set_reader_mode(reader: bool) -> void:
	heading_label.text = Locale.t("✦ 博士のうんちく ✦") if reader else Locale.t("✦ １面クリア ✦")
	more_button.visible = reader
	next_button.position.x = 250 if reader else 45
	next_button.size.x = 195 if reader else 400
	next_button.text = Locale.t("閉じる") if reader else Locale.t("次の面へ ▶")

func show_art(path: String) -> void:
	if art_viewer != null: art_viewer.queue_free()
	art_viewer = Button.new()
	art_viewer.position = Vector2(25, outer.position.y)
	art_viewer.size = outer.size
	art_viewer.text = ""
	add_child(art_viewer)
	var picture := TextureRect.new()
	picture.position = Vector2(25, 30)
	picture.size = Vector2(440, outer.size.y - 100.0)
	picture.texture = load(path)
	picture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	art_viewer.add_child(picture)
	label(art_viewer, Locale.t("閉じる"), Rect2(25, outer.size.y - 55.0, 440, 40), 23, Color("274550"), true)
	art_viewer.pressed.connect(func(): art_viewer.queue_free(); art_viewer = null)



