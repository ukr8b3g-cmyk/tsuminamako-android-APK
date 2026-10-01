extends Control
const Locale = preload("res://scripts/locale_text.gd")
## Card reveal and collection overlay. The board model remains untouched.

signal reward_dismissed
signal collection_dismissed
signal reveal_peak(rank: String)

var dark_mode: bool = false
var collection_title: Label
var regular_font: SystemFont
var bold_font: SystemFont
var reward_panel: Panel
var collection_panel: Panel
var reward_slot: Control
var reward_back: Panel
var reward_front: TextureRect
var reduced_motion: bool = false
var reward_next: Button
var reward_title: Label
var reward_note: Label
var reward_aura: Panel
var collection_progress: Label
var zoom_button: Button
var overlay_shade: ColorRect
var zoom_image: TextureRect
var collection_grid: GridContainer
var stars: Array[Label] = []
var reveal_elapsed: float = 0.0
var reveal_duration: float = 1.0
var reveal_swapped: bool = false
var current_rank: String = "N"

func _ready() -> void:
	set_meta("night_palette_managed", true)
	z_index = 10
	position = Vector2.ZERO
	size = Vector2(540, 860)
	mouse_filter = Control.MOUSE_FILTER_STOP
	regular_font = SystemFont.new()
	regular_font.font_names = PackedStringArray(["Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", "sans-serif"])
	bold_font = SystemFont.new()
	bold_font.font_names = regular_font.font_names
	bold_font.font_weight = 700
	overlay_shade = ColorRect.new()
	overlay_shade.size = size
	overlay_shade.color = Color(0.06, 0.16, 0.22, 0.68)
	add_child(overlay_shade)
	build_reward()
	build_collection()
	build_zoom()
	visible = false

func set_layout_height(height: float) -> void:
	size.y = height
	overlay_shade.size.y = height
	var shift: float = (height - 860.0) * 0.5
	reward_panel.position = Vector2(20, 16)
	reward_panel.size = Vector2(500, height - 32.0)
	var panel_height := reward_panel.size.y
	var area_height := panel_height - 300.0
	var art_height := minf(area_height, 660.0)
	var art_width := art_height * 2.0 / 3.0
	reward_slot.size = Vector2(art_width, art_height)
	reward_slot.position = Vector2((500.0-art_width)*0.5, 78.0+(area_height-art_height)*0.5)
	reward_slot.pivot_offset = reward_slot.size * 0.5
	reward_front.size = reward_slot.size
	reward_back.size = reward_slot.size
	reward_back.get_child(0).position = Vector2(10,art_height*0.22)
	reward_back.get_child(0).size = Vector2(art_width-20,art_height*0.56)
	reward_aura.position = reward_slot.position - Vector2(20,20)
	reward_aura.size = reward_slot.size + Vector2(40,40)
	reward_title.size.x = 460
	reward_note.position = Vector2(25,panel_height-210)
	reward_note.size = Vector2(450,125)
	reward_next.position = Vector2(80,panel_height-75)
	reward_next.size = Vector2(340,55)
	collection_panel.position.y = 35.0 + shift
	zoom_button.position.y = 35.0 + shift

func panel_style(fill: Color, border: Color = Color.TRANSPARENT, radius: int = 18) -> StyleBoxFlat:
	var box: StyleBoxFlat = StyleBoxFlat.new()
	box.bg_color = fill
	box.border_color = border
	box.set_border_width_all(2 if border.a > 0.0 else 0)
	box.set_corner_radius_all(radius)
	return box

func label_at(parent: Node, value: String, rect: Rect2, font_size: int, ink: Color, bold: bool = false, wrap: bool = false) -> Label:
	var item: Label = Label.new()
	if wrap: item.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	item.add_theme_font_override("font", bold_font if bold else regular_font)
	item.add_theme_font_size_override("font_size", font_size)
	item.text = Locale.t(value)
	item.position = rect.position
	item.size = rect.size
	item.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	item.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	item.mouse_filter = Control.MOUSE_FILTER_IGNORE
	item.add_theme_font_override("font", bold_font if bold else regular_font)
	item.add_theme_font_size_override("font_size", font_size)
	item.add_theme_color_override("font_color", ink)
	parent.add_child(item)
	return item

func button_at(parent: Node, value: String, rect: Rect2, callback: Callable) -> Button:
	var item: Button = Button.new()
	item.text = Locale.t(value)
	item.position = rect.position
	item.size = rect.size
	item.add_theme_font_override("font", bold_font)
	item.add_theme_font_size_override("font_size", 19)
	item.add_theme_stylebox_override("normal", panel_style(Color("348d7d"), Color.TRANSPARENT, 14))
	item.add_theme_stylebox_override("hover", panel_style(Color("49a393"), Color.TRANSPARENT, 14))
	item.add_theme_stylebox_override("pressed", panel_style(Color("287869"), Color.TRANSPARENT, 14))
	item.add_theme_color_override("font_color", Color.WHITE)
	item.add_theme_color_override("font_hover_color", Color.WHITE)
	item.add_theme_color_override("font_pressed_color", Color.WHITE)
	item.pressed.connect(callback)
	parent.add_child(item)
	return item

func build_reward() -> void:
	reward_panel = Panel.new()
	reward_panel.position = Vector2(35, 50)
	reward_panel.size = Vector2(470, 750)
	reward_panel.add_theme_stylebox_override("panel", panel_style(Color("f9fcf8"), Color("a9b6b2"), 26))
	add_child(reward_panel)
	reward_title = label_at(reward_panel, Locale.t("カードをゲット！"), Rect2(20, 18, 430, 46), 29, Color("254b50"), true)
	reward_aura = Panel.new()
	reward_aura.position = Vector2(39, 103)
	reward_aura.size = Vector2(392, 480)
	reward_aura.mouse_filter = Control.MOUSE_FILTER_IGNORE
	reward_aura.add_theme_stylebox_override("panel", panel_style(Color(0.7, 0.9, 0.85, 0.25), Color.TRANSPARENT, 220))
	reward_panel.add_child(reward_aura)
	for index in range(12):
		var star: Label = label_at(reward_panel, "✦", Rect2(0, 0, 35, 35), 26, Color("f5c65c"), true)
		star.visible = false
		stars.append(star)
	reward_slot = Control.new()
	reward_slot.position = Vector2(95, 116)
	reward_slot.size = Vector2(280, 420)
	reward_slot.pivot_offset = reward_slot.size / 2.0
	reward_slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	reward_panel.add_child(reward_slot)
	reward_back = Panel.new()
	reward_back.size = reward_slot.size
	reward_back.mouse_filter = Control.MOUSE_FILTER_IGNORE
	reward_back.add_theme_stylebox_override("panel", panel_style(Color("d8eae4"), Color("81a8c4"), 12))
	reward_slot.add_child(reward_back)
	label_at(reward_back, "✦\nNAMAKO\n✦", Rect2(10, 90, 260, 240), 28, Color("5f9689"), true)
	reward_front = TextureRect.new()
	reward_front.size = reward_slot.size
	reward_front.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	reward_front.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	reward_front.mouse_filter = Control.MOUSE_FILTER_IGNORE
	reward_slot.add_child(reward_front)
	reward_note = label_at(reward_panel, "", Rect2(25, 552, 420, 91), 17, Color("254b50"), true)
	reward_note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	reward_next = button_at(reward_panel, Locale.t("博士のうんちくへ ▶"), Rect2(75, 663, 320, 55), func() -> void: reward_dismissed.emit())
	reward_panel.visible = false

func build_collection() -> void:
	collection_panel = Panel.new()
	collection_panel.position = Vector2(20, 35)
	collection_panel.size = Vector2(500, 790)
	collection_panel.add_theme_stylebox_override("panel", panel_style(Color("fffdf6"), Color("c9d8d2"), 24))
	add_child(collection_panel)
	collection_title = label_at(collection_panel, Locale.t("ナマコ図鑑"), Rect2(110, 16, 280, 42), 28, Color("254b50"), true)
	var close_button: Button = button_at(collection_panel, Locale.t("閉じる"), Rect2(398, 18, 78, 36), func() -> void: collection_dismissed.emit())
	close_button.add_theme_font_size_override("font_size", 14)
	collection_progress = label_at(collection_panel, "", Rect2(20, 60, 460, 52), 14, Color("476b68"))
	collection_progress.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var scroll: ScrollContainer = ScrollContainer.new()
	scroll.position = Vector2(25, 120)
	scroll.size = Vector2(450, 640)
	collection_panel.add_child(scroll)
	collection_grid = GridContainer.new()
	collection_grid.columns = 3
	collection_grid.add_theme_constant_override("h_separation", 8)
	collection_grid.add_theme_constant_override("v_separation", 8)
	scroll.add_child(collection_grid)
	collection_panel.visible = false

func rank_color(rank: String) -> Color:
	match rank:
		"R": return Color("81a8c4")
		"SR": return Color("9fdacb")
		"SSR": return Color("f5c65c")
		"SECRET": return Color("c5d9f6")
		"COMPLETE": return Color("efca72")
		_: return Color("a9b6b2")

func show_reward(card: Dictionary, count: int, milestone: bool) -> void:
	current_rank = str(card.get("rank", "N"))
	reward_title.text = Locale.t("やったね！ コンプリート！") if current_rank == "COMPLETE" else Locale.t("カードをゲット！")
	reward_title.add_theme_font_size_override("font_size", 25 if current_rank == "COMPLETE" else 29)
	var path: String = str(card.get("image", ""))
	reward_front.texture = load("res://" + path) as Texture2D
	reward_note.text = "%s %s%s%s" % [current_rank, str(card.get("name", "")), "　NEW!" if count == 1 else Locale.t("　%d枚目") % count, Locale.t("\n10種類達成！ ナマコの仲間たち・記念水槽を獲得！") if milestone else ""]
	var color: Color = rank_color(current_rank)
	reward_panel.add_theme_stylebox_override("panel", panel_style(Color("f9fcf8"), color, 26))
	reward_back.add_theme_stylebox_override("panel", panel_style(Color("d8eae4"), color, 12))
	var strength: float = 0.12 if current_rank == "N" else (0.22 if current_rank == "R" else 0.36)
	reward_aura.add_theme_stylebox_override("panel", panel_style(Color(color.r, color.g, color.b, strength), Color.TRANSPARENT, 220))
	for star in stars:
		star.visible = not reduced_motion and current_rank in ["SR", "SSR", "SECRET", "COMPLETE"]
		star.add_theme_color_override("font_color", color)
	reveal_duration = {"N": 1.1, "R": 1.35, "SR": 1.7, "SSR": 2.1, "SECRET": 2.5, "COMPLETE": 2.9}.get(current_rank, 1.35)
	reveal_elapsed = 0.0
	reveal_swapped = false
	reward_back.visible = true
	reward_front.visible = false
	reward_slot.rotation = -TAU * 2.0
	reward_slot.scale = Vector2(0.18, 0.18)
	apply_theme(dark_mode)
	reward_panel.visible = true
	collection_panel.visible = false
	visible = true

func hide_reward() -> void:
	reward_panel.visible = false
	visible = false

func build_zoom() -> void:
	zoom_button = Button.new()
	zoom_button.position = Vector2(20,35)
	zoom_button.size = Vector2(500,790)
	zoom_button.add_theme_stylebox_override("normal",panel_style(Color("102c35"),Color.TRANSPARENT,24))
	zoom_button.add_theme_stylebox_override("hover",panel_style(Color("102c35"),Color.TRANSPARENT,24))
	zoom_button.add_theme_stylebox_override("pressed",panel_style(Color("102c35"),Color.TRANSPARENT,24))
	add_child(zoom_button)
	zoom_image=TextureRect.new()
	zoom_image.position=Vector2(30,38)
	zoom_image.size=Vector2(440,660)
	zoom_image.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	zoom_image.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	zoom_image.mouse_filter=Control.MOUSE_FILTER_IGNORE
	zoom_button.add_child(zoom_image)
	label_at(zoom_button,Locale.t("もう一度タップで図鑑に戻る"),Rect2(30,716,440,40),16,Color("e8f6ef"))
	zoom_button.pressed.connect(func() -> void: zoom_button.hide())
	zoom_button.hide()

func show_zoom(texture: Texture2D) -> void:
	zoom_image.texture=texture
	zoom_button.show()

func show_card_zoom(path: String) -> void:
	show_zoom(load(path) as Texture2D)

func show_collection(catalog: RefCounted) -> void:
	zoom_button.hide()
	for child in collection_grid.get_children():
		collection_grid.remove_child(child)
		child.queue_free()
	var all_cards: Array[Dictionary] = catalog.enabled_cards()
	var display_cards: Array[Dictionary] = all_cards.duplicate()
	if catalog.complete(): display_cards.append(catalog.completion_card())
	for card in display_cards:
		var count: int = 1 if card.get("id", "") == "complete" else catalog.owned_count(str(card.get("id", "")))
		var tile: Panel = Panel.new()
		tile.custom_minimum_size = Vector2(138, 212)
		tile.add_theme_stylebox_override("panel", panel_style(Color("eef4ef"), Color("c9d8d2"), 11))
		collection_grid.add_child(tile)
		if count > 0:
			var image: TextureRect = TextureRect.new()
			image.position = Vector2(19, 7)
			image.size = Vector2(100, 150)
			var full_path: String = "res://" + str(card.get("image", ""))
			var thumb_path: String = full_path.replace("cards/images/", "cards/thumbs/")
			image.texture = load(thumb_path if ResourceLoader.exists(thumb_path) else full_path) as Texture2D
			image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			tile.add_child(image)
			var tap: Button = Button.new()
			tap.position=image.position
			tap.size=image.size
			tap.flat=true
			tap.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
			tap.tooltip_text=Locale.t("タップで拡大")
			tap.pressed.connect(show_card_zoom.bind(full_path))
			tile.add_child(tap)
		else:
			var back: Panel = Panel.new()
			back.position = Vector2(19, 7)
			back.size = Vector2(100, 150)
			back.add_theme_stylebox_override("panel", panel_style(Color("d6e7e3"), Color("8eb4a8"), 6))
			tile.add_child(back)
			label_at(back, "？", Rect2(0, 0, 100, 150), 48, Color("749e91"), true)
		var caption: Label = label_at(tile, "%s ×%d" % [str(card.get("name", "")), count] if count > 0 else Locale.t("未発見"), Rect2(3, 160, 132, 44), 11, Color("254b50"), false, true)
	collection_progress.text = Locale.t("%d/%d種類　合計%d枚\n%s") % [catalog.owned_unique_count(), all_cards.size(), catalog.total_owned_count(), Locale.t("称号『ナマコの仲間たち』・記念水槽 解放") if catalog.milestone_unlocked() else Locale.t("10種類で記念水槽を解放")]
	reward_panel.visible = false
	collection_panel.visible = true
	apply_theme(dark_mode)
	visible = true

func apply_theme(dark: bool) -> void:
	dark_mode = dark
	if collection_panel == null: return
	reward_panel.add_theme_stylebox_override("panel", panel_style(Color("173947") if dark else Color("f9fcf8"), rank_color(current_rank), 26))
	reward_title.add_theme_color_override("font_color", Color("d7f4ee") if dark else Color("254b50"))
	reward_note.add_theme_color_override("font_color", Color("d7f4ee") if dark else Color("254b50"))
	collection_panel.add_theme_stylebox_override("panel", panel_style(Color("173947") if dark else Color("fffdf6"), Color("7197a4") if dark else Color("c9d8d2"), 24))
	collection_title.add_theme_color_override("font_color", Color("d7f4ee") if dark else Color("254b50"))
	collection_progress.add_theme_color_override("font_color", Color("b5d4d1") if dark else Color("476b68"))
	for tile in collection_grid.get_children():
		tile.add_theme_stylebox_override("panel", panel_style(Color("244650") if dark else Color("eef4ef"), Color("51747e") if dark else Color("c9d8d2"), 11))
		for child in tile.get_children():
			if child is Label: child.add_theme_color_override("font_color", Color("d7f4ee") if dark else Color("254b50"))

func hide_collection() -> void:
	zoom_button.hide()
	zoom_image.texture = null
	for tile in collection_grid.get_children():
		collection_grid.remove_child(tile)
		tile.queue_free()
	collection_panel.visible = false
	visible = false

func _process(delta: float) -> void:
	if not visible or not reward_panel.visible :
		return
	reveal_elapsed += delta
	var progress: float = 1.0 if reduced_motion else minf(1.0, reveal_elapsed / reveal_duration)
	var eased: float = 1.0 - pow(1.0 - progress, 3.0)
	reward_slot.rotation = -TAU * 2.0 * (1.0 - eased)
	var bounce: float = sin((progress - 0.62) * 30.0) * exp(-(progress - 0.62) * 9.0) * 0.13 if progress > 0.62 and progress < 1.0 else 0.0
	reward_slot.scale = Vector2.ONE * (lerpf(0.18, 1.0, eased) + bounce)
	if not reveal_swapped and progress >= 0.62:
		reveal_swapped = true
		reward_back.visible = false
		reward_front.visible = true
		reveal_peak.emit(current_rank)
	for index in range(stars.size()):
		if stars[index].visible:
			var angle: float = TAU * float(index) / float(stars.size()) + reveal_elapsed * 1.2
			stars[index].position = reward_slot.position + reward_slot.size * 0.5 - Vector2(17,17) + Vector2(cos(angle) * (reward_slot.size.x*0.5+18), sin(angle) * (reward_slot.size.y*0.5+18))
			stars[index].modulate.a = 0.45 + 0.45 * sin(reveal_elapsed * 7.0 + float(index))


