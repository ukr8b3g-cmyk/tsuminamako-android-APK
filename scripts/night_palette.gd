extends RefCounted

static func surface(color: Color, dark: bool) -> Color:
	# Keep the warm action button vivid against the cool night aquarium.
	if dark and color.r > 0.55 and color.r > color.g * 1.35 and color.r > color.b * 1.45:
		return color
	if dark and color.get_luminance() > 0.55:
		return Color(0.09, 0.23, 0.29, color.a)
	return color

static func apply(node: Node, dark: bool) -> void:
	# Illustrated overlays explicitly pair their paper/glass surfaces with readable ink.
	if node.has_meta("night_palette_managed"): return
	if node is Control:
		for key in ["font_color", "font_hover_color", "font_pressed_color", "font_disabled_color"]:
			if node.has_theme_color_override(key):
				var meta: String = "night_original_" + key
				if not node.has_meta(meta): node.set_meta(meta, node.get_theme_color(key))
				var original: Color = node.get_meta(meta)
				var night_text: Color = Color("77e4d1") if original.g > 0.45 and original.r < 0.45 else Color("d7f4ee")
				node.add_theme_color_override(key, night_text if dark and original.get_luminance() < 0.65 else original)
		for key in ["panel", "normal", "hover", "pressed", "disabled"]:
			if node.has_theme_stylebox_override(key):
				var box: StyleBoxFlat = node.get_theme_stylebox(key) as StyleBoxFlat
				if box != null:
					var meta: String = "night_background_" + key
					if not node.has_meta(meta): node.set_meta(meta, box.bg_color)
					box.bg_color = surface(node.get_meta(meta), dark)
	for child in node.get_children(): apply(child, dark)
