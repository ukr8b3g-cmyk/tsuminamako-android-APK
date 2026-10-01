extends Control
## Visual-only softness. Native CanvasItem drawing, Tween and CPUParticles2D.
const Rules = preload("res://scripts/rules.gd")
const CELL: float = 46.0
var cell_size: float = CELL
const COLORS: Array[Color] = [Color("f7869b"), Color("58c9c7"), Color("f6ce6e"), Color("92c980"), Color("b398e6"), Color("f5aa74")]
var rotation_from: Array[Vector2] = []
var rotation_time: float = 1.0
var dark_mode: bool = false
var lcd_mode: bool = false
var model: Rules
var next_preview: Dictionary = {}
var active: Array[Vector2i] = []
var origin: Vector2i = Vector2i.ZERO
var visual_origin: Vector2 = Vector2.ZERO
var active_color: int = 0
var show_active: bool = true
var show_ghost: bool = true
var show_guide: bool = false
var guide_origin: Vector2i = Vector2i(-1, -1)
var clock: float = 0.0
var frozen: bool = false
var impact_id: int = 0
var impact: float = 0.0
var vanish_cells: Array[Vector2i] = []
var vanish_color: int = 0
var vanish_progress: float = 1.0
var impact_tween: Tween
var vanish_tween: Tween
var bubble_texture: ImageTexture
var celebration_active: bool = false
var celebration_clock: float = 0.0

func _ready() -> void:
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var image: Image = Image.create(12, 12, false, Image.FORMAT_RGBA8)
	for y in range(12):
		for x in range(12):
			var distance: float = Vector2(float(x) - 5.5, float(y) - 5.5).length()
			image.set_pixel(x, y, Color(1, 1, 1, clampf(6.0 - distance, 0.0, 1.0)))
	bubble_texture = ImageTexture.create_from_image(image)

func _process(delta: float) -> void:
	if not frozen:
		clock += delta
		rotation_time = minf(1.0, rotation_time + delta / 0.28)
		if celebration_active:
			celebration_clock += delta
		visual_origin = visual_origin.lerp(Vector2(origin), 1.0 - exp(-delta * 18.0))
	queue_redraw()

func reset_visuals() -> void:
	if impact_tween != null and impact_tween.is_valid():
		impact_tween.kill()
	if vanish_tween != null and vanish_tween.is_valid():
		vanish_tween.kill()
	rotation_from.clear()
	rotation_time = 1.0
	impact = 0.0
	impact_id = 0
	vanish_progress = 1.0
	vanish_cells.clear()
	active.clear()
	for child in get_children():
		child.queue_free()
	frozen = false
	celebration_active = false
	celebration_clock = 0.0

func start_celebration() -> void:
	celebration_active = true
	celebration_clock = 0.0
	burst(Vector2(64, 110), Color("f6ce6e"), false, true)
	burst(Vector2(168, 245), Color("f7869b"), false, true)
	burst(Vector2(272, 130), Color("58c9c7"), false, true)

func stop_celebration() -> void:
	celebration_active = false
	celebration_clock = 0.0

func bounce(id_value: int, center: Vector2, color_id: int) -> void:
	if impact_tween != null and impact_tween.is_valid():
		impact_tween.kill()
	impact_id = id_value
	impact = 1.0
	impact_tween = create_tween()
	impact_tween.tween_property(self, "impact", 0.0, 0.55).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	burst(center, COLORS[color_id], false)

func dissolve(cells: Array[Vector2i], color_id: int) -> void:
	if vanish_tween != null and vanish_tween.is_valid():
		vanish_tween.kill()
	vanish_cells = cells.duplicate()
	vanish_color = color_id
	vanish_progress = 0.0
	vanish_tween = create_tween()
	vanish_tween.tween_property(self, "vanish_progress", 1.0, 0.62).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
	vanish_tween.tween_callback(clear_vanish)
	if not cells.is_empty():
		burst((Vector2(cells[0]) + Vector2(0.5, 0.5)) * cell_size, COLORS[color_id], true)

func clear_vanish() -> void:
	vanish_cells.clear()

func burst(center: Vector2, color: Color, downward: bool = false, celebration: bool = false) -> void:
	var particles: CPUParticles2D = CPUParticles2D.new()
	particles.position = center
	particles.texture = bubble_texture
	particles.one_shot = true
	particles.amount = 30 if celebration else 12
	particles.lifetime = 1.5 if celebration else 0.6
	particles.explosiveness = 1.0
	particles.direction = Vector2.DOWN if downward else Vector2.UP
	particles.spread = 160.0 if celebration else 70.0
	particles.gravity = Vector2(0.0, 120.0)
	particles.initial_velocity_min = 30.0
	particles.initial_velocity_max = 210.0 if celebration else 95.0
	particles.scale_amount_min = 0.12
	particles.scale_amount_max = 0.45
	var gradient: Gradient = Gradient.new()
	gradient.set_color(0, Color(color, 0.8))
	gradient.set_color(1, Color(color, 0.0))
	particles.color_ramp = gradient
	add_child(particles)
	particles.finished.connect(particles.queue_free)
	particles.emitting = true

func animate_rotation(previous: Array[Vector2i], old_origin: Vector2) -> void:
	rotation_from.clear()
	for cell in previous:
		rotation_from.append((Vector2(cell) + old_origin + Vector2(0.5, 0.5)) * cell_size)
	rotation_time = 0.0

func draw_aquarium() -> void:
	# Fixed small geometry budget: five plants, 68 stones, three air bubbles.
	draw_colored_polygon(PackedVector2Array([Vector2(0,size.y),Vector2(0,size.y-23),Vector2(size.x*0.5,size.y-34),Vector2(size.x,size.y-20),size]), Color("7b897633") if dark_mode else Color("b6bd9552"))
	for plant in range(5):
		var px: float = 14.0 + plant * 83.0
		var height: float = 42.0 + (plant * 37) % 74
		for leaf in range(3):
			var previous := Vector2(px, size.y-16)
			for step in range(1,9):
				var t: float = step / 8.0
				var point := Vector2(px + sin(t*4.0+leaf)*10.0*t+(leaf-1)*10.0*t, size.y-16-height*t)
				draw_line(previous,point,Color("55989226") if dark_mode else Color("528d7233"),5-leaf,true)
				previous=point
	for i in range(68):
		var p := Vector2(fmod(i*67.0+13,size.x),size.y-3-(i*13)%19)
		var shades: Array = [Color("82928d55"),Color("53696766"),Color("aaa89144")] if dark_mode else [Color("b9b69c77"),Color("8ea99c66"),Color("ded7b388")]
		draw_set_transform(p,0,Vector2(1.6,1))
		draw_circle(Vector2.ZERO,2.0+i%3,shades[i%3])
		draw_set_transform(Vector2.ZERO)
	for i in range(3):
		var y: float = size.y-24-fposmod(clock*19+i*71,size.y-35)
		draw_circle(Vector2(size.x-20+sin(y*.04+i)*3,y),1.4+i*.55,Color("b1e5df35") if dark_mode else Color("ffffff65"),false,.8,true)
	# Layered translucent cones suggest the overhead aquarium lamp.
	for i in range(4):
		var inset: float = i*15.0
		draw_colored_polygon(PackedVector2Array([Vector2(size.x*.27,0),Vector2(size.x*.73,0),Vector2(size.x-inset,size.y*.72),Vector2(inset,size.y*.72)]),Color(0.65,0.95,1.0,0.018 if dark_mode else 0.009))
	draw_line(Vector2(size.x*.27,3),Vector2(size.x*.73,3),Color("ccffff80") if dark_mode else Color("ffffff88"),2.0,true)
	draw_rect(Rect2(2,2,size.x-4,size.y-4),Color("a6f7ff32") if dark_mode else Color("ffffff69"),false,2.0)

func _draw() -> void:
	if lcd_mode:
		draw_lcd_board()
		return
	draw_rect(Rect2(Vector2.ZERO, size), Color("1a465a") if dark_mode else Color("d2f0f7"))
	draw_aquarium()
	for i in range(3):
		var ray_x: float = 20.0 + float(i) * 115.0 + sin(clock * 0.22 + float(i)) * 16.0
		draw_colored_polygon(PackedVector2Array([Vector2(ray_x, 0), Vector2(ray_x + 85, size.y), Vector2(ray_x + 135, size.y), Vector2(ray_x + 22, 0)]), Color(0.8, 1, 1, 0.035 if dark_mode else 0.08))
	for y in range(Rules.ROWS + 1):
		draw_line(Vector2(0, y * cell_size), Vector2(size.x, y * cell_size), Color(1, 1, 1, 0.18), 1.0)
	for x in range(Rules.COLS + 1):
		draw_line(Vector2(x * cell_size, 0), Vector2(x * cell_size, size.y), Color(1, 1, 1, 0.16), 1.0)
	# The next-piece bubble reads as a small game badge against the blue water.
	draw_circle(Vector2(size.x - 45, 40), 31, Color("ffda87") if dark_mode else Color("e4b756"))
	draw_circle(Vector2(size.x - 45, 40), 27, Color("3b5272") if dark_mode else Color("fbefc6"))
	for i in range(14):
		var by: float = fposmod(float(i) * 51.0 - clock * (7.0 + float(i % 3) * 4.0), size.y)
		var bx: float = fposmod(float(i * 83) + sin(clock * 0.8 + float(i)) * 7.0, size.x)
		draw_circle(Vector2(bx, by), float(2 + i % 3), Color(1, 1, 1, 0.35), false, 1.0, true)
	if model == null:
		return
	var contact_ids: Array = []
	if show_active and show_guide and guide_origin.x >= 0 and not active.is_empty():
		for cell in active:
			var p: Vector2 = (Vector2(guide_origin + cell) + Vector2(0.5, 0.5)) * cell_size
			draw_circle(p, cell_size * 0.45, Color("ffd87830"))
			draw_circle(p, cell_size * 0.45, Color("ffcd59"), false, 3.0, true)
	if show_active and show_ghost and not active.is_empty():
		var destination: Vector2i = model.landing(active, origin)
		var prediction: Dictionary = model.preview(active, destination)
		contact_ids = prediction["contacts"]
		var ghost_color: Color = Color("309c87") if bool(prediction["keep"]) else Color("cb9954")
		for cell in active:
			var p: Vector2 = (Vector2(destination + cell) + Vector2(0.5, 0.5)) * cell_size
			draw_circle(p, cell_size * 0.39, Color(ghost_color, 0.10))
			draw_circle(p, cell_size * 0.39, Color(ghost_color, 0.7), false, 1.7, true)
	for key in model.pieces:
		var id_value: int = int(key)
		var piece: Dictionary = model.pieces[key]
		var cells: Array[Vector2i] = []
		cells.assign(piece["cells"])
		var deformation: float = impact if id_value == impact_id else 0.0
		creature(cells, Vector2.ZERO, COLORS[int(piece["color"])], 1.0, id_value, deformation)
		if id_value == impact_id and impact > 0.01:
			draw_circle((Vector2(cells[0]) + Vector2(0.5, 0.5)) * cell_size, 22.0 + (1.0 - clampf(impact, 0, 1)) * 30.0, Color(1, 1, 1, clampf(impact, 0, 1) * 0.35), false, 1.8, true)
		if show_ghost and show_active and contact_ids.has(id_value):
			var head: Vector2 = (Vector2(cells[0]) + Vector2(0.5, 0.5)) * cell_size
			draw_circle(head + Vector2(11, -12), 4.0, Color("fffbed"))
	if show_active and not active.is_empty():
		creature(active, visual_origin * cell_size, COLORS[active_color], 1.0, 0, 0.0)
	if not vanish_cells.is_empty() and vanish_progress < 1.0:
		creature(vanish_cells, Vector2(sin(vanish_progress * 13.0) * 8.0, vanish_progress * 25.0), COLORS[vanish_color], 1.0 - vanish_progress, -1, -vanish_progress)
	if celebration_active:
		for i in range(12):
			var sx: float = fposmod(29.0 + float(i * 83) + sin(celebration_clock * 2.0 + float(i)) * 17.0, size.x)
			var sy: float = fposmod(41.0 + float(i * 61) + cos(celebration_clock * 2.4 + float(i)) * 19.0, size.y)
			var sr: float = 3.0 + float((i * 7) % 5)
			var sparkle: Color = Color("fff5b8")
			sparkle.a = 0.58
			draw_line(Vector2(sx - sr, sy), Vector2(sx + sr, sy), sparkle, 2.0, true)
			draw_line(Vector2(sx, sy - sr), Vector2(sx, sy + sr), sparkle, 2.0, true)
	# The sticky sand is a visual cue for the floor exception.
	draw_line(Vector2(0, size.y - 2), Vector2(size.x, size.y - 2), Color("edca8a"), 4.0)
	# Draw the next piece here so it stays above the aquarium's water layer.
	if not next_preview.is_empty():
		var preview_cells: Array[Vector2i] = model.shape(int(next_preview["shape"]))
		var preview_color: Color = COLORS[int(next_preview["color"])]
		var preview_origin: Vector2 = Vector2(size.x - 55.0, 40.0)
		for cell in preview_cells:
			var center: Vector2 = preview_origin + Vector2(cell) * 11.0
			for other in preview_cells:
				if other == cell + Vector2i.RIGHT or other == cell + Vector2i.DOWN:
					draw_line(center, preview_origin + Vector2(other) * 11.0, preview_color, 9.0, true)
			draw_circle(center, 5.5, preview_color)
	# The bright inner glass edge remains readable over the water and creatures.
	var glass_edge: Color = Color("a6f9ff") if dark_mode else Color("20a6ce")
	draw_rect(Rect2(2, 2, size.x - 4, size.y - 4), glass_edge, false, 2.0, true)
	draw_line(Vector2(19, 9), Vector2(size.x - 19, 9), Color("b9f6f8a8") if dark_mode else Color("ffffffbd"), 2.0, true)
	for rivet in [Vector2(12, 12), Vector2(size.x - 12, 12), Vector2(12, size.y - 12), Vector2(size.x - 12, size.y - 12)]:
		draw_circle(rivet, 3.5, Color("b3f5ef") if dark_mode else Color("2a98b6"))
		draw_circle(rivet, 3.5, Color("163b50") if dark_mode else Color.WHITE, false, 1.0, true)

func creature(cells: Array[Vector2i], offset: Vector2, color: Color, alpha: float, id_value: int, deformation: float) -> void:
	if cells.is_empty():
		return
	var points: Array[Vector2] = []
	var middle: Vector2 = Vector2.ZERO
	for cell in cells:
		middle += (Vector2(cell) + Vector2(0.5, 0.5)) * cell_size + offset
	middle /= float(cells.size())
	var party_wave: float = 0.0
	if celebration_active and id_value > 0:
		party_wave = sin(celebration_clock * 8.0 + float(id_value) * 1.71)
		deformation += party_wave * 0.18
	if id_value > 0:
		deformation += sin(clock * 1.9 + float(id_value) * 0.8) * 0.055
	for i in range(cells.size()):
		var point: Vector2 = (Vector2(cells[i]) + Vector2(0.5, 0.5)) * cell_size + offset
		point = middle + (point - middle) * Vector2(1.0 + deformation * 0.24, 1.0 - absf(deformation) * 0.42)
		point.y += sin(clock * 3.0 + float(i) * 1.1 + float(id_value)) * (1.2 if id_value == 0 else 0.45)
		if celebration_active and id_value > 0:
			point.x += sin(celebration_clock * 9.0 + float(i) * 0.9 + float(id_value)) * 4.2
			point.y += cos(celebration_clock * 10.0 + float(i) + float(id_value)) * 3.1
		if id_value == 0 and rotation_time < 1.0 and i < rotation_from.size():
			var old: Vector2 = rotation_from[i]
			var delta: Vector2 = point-old
			var t: float = rotation_time
			point = old.lerp(point,t*t*(3.0-2.0*t)) + Vector2(-delta.y,delta.x)*sin(t*PI)*0.18
		points.append(point)
	var radius: float = cell_size * 0.425 * (1.0 - maxf(-deformation, 0.0) * 0.7)
	if lcd_mode:
		var ink := Color(Color("263129"),alpha)
		for i in range(cells.size()):
			for j in range(i+1,cells.size()):
				var d: Vector2i = cells[i]-cells[j]
				if absi(d.x)+absi(d.y)==1:
					draw_line(points[i],points[j],ink,radius*1.88,true)
		for point in points:
			draw_circle(point,radius,ink)
		var head := points[0]
		var face := Color(Color("b9c3a6"),alpha)
		draw_circle(head+Vector2(-5,-3),2.6,face)
		draw_circle(head+Vector2(5,-3),2.6,face)
		draw_arc(head+Vector2(0,1),4,0.1,PI-0.1,10,face,1.3,true)
		return
	var shadow: Color = Color(color.darkened(0.25), alpha * 0.60)
	var body: Color = Color(color, alpha)
	for layer in range(3):
		var shift: Vector2 = Vector2(0, 2.5) if layer == 0 else Vector2.ZERO
		var ink: Color = shadow if layer == 0 else (Color(1, 1, 1, alpha * 0.12) if layer == 2 else body)
		var r: float = radius + 1.3 if layer == 0 else (radius * 0.72 if layer == 2 else radius)
		for i in range(cells.size()):
			for j in range(i + 1, cells.size()):
				var distance: Vector2i = cells[i] - cells[j]
				if absi(distance.x) + absi(distance.y) == 1:
					draw_line(points[i] + shift, points[j] + shift, ink, r * 1.88, true)
		for point in points:
			draw_circle(point + shift, r, ink)
	for point in points:
		draw_arc(point + Vector2(1,2),radius*0.87,0.15,1.95,9,Color(0.15,0.30,0.28,alpha*0.15),3.0,true)
	for i in range(points.size()):
		var point: Vector2 = points[i]
		draw_line(point + Vector2(-6, -radius * 0.5), point + Vector2(3, -radius * 0.56), Color(1, 1, 1, alpha * 0.38), 4.0, true)
		if i > 0:
			draw_circle(point + Vector2(3, 6), 2.0, Color(color.darkened(0.09), alpha * 0.65))
	var head: Vector2 = points[0]
	var eye: Color = Color(Color("254b50"), alpha)
	var blink: bool = fposmod(clock + float(id_value) * 0.31, 5.3) > 5.15
	for dx in [-5.0, 5.0]:
		if blink:
			draw_line(head + Vector2(dx - 1.8, -2), head + Vector2(dx + 1.8, -2), eye, 1.5, true)
		else:
			draw_circle(head + Vector2(dx, -2), 2.4, eye)
			draw_circle(head + Vector2(dx - 0.6, -2.8), 0.7, Color(1, 1, 1, alpha))
	draw_arc(head + Vector2(0, 1), 4.0, 0.1, PI - 0.1, 10, eye, 1.3, true)
	draw_circle(head + Vector2(-10, 3.5), 2.7, Color(1, 1, 1, alpha * 0.25))
	draw_circle(head + Vector2(10, 3.5), 2.7, Color(1, 1, 1, alpha * 0.25))

func draw_lcd_board() -> void:
	draw_rect(Rect2(Vector2.ZERO,size),Color("b5c0a3"))
	for y in range(Rules.ROWS+1):
		draw_dashed_line(Vector2(0,y*cell_size),Vector2(size.x,y*cell_size),Color("68785a36"),1,2,true,true)
	for x in range(Rules.COLS+1):
		draw_dashed_line(Vector2(x*cell_size,0),Vector2(x*cell_size,size.y),Color("68785a36"),1,2,true,true)
	if model == null: return
	for key in model.pieces:
		var piece: Dictionary = model.pieces[key]
		var cells: Array[Vector2i] = []
		cells.assign(piece["cells"])
		creature(cells,Vector2.ZERO,Color.BLACK,1,int(key),impact if int(key)==impact_id else 0)
	if show_active and not active.is_empty():
		if show_guide and guide_origin.x>=0:
			creature(active,Vector2(guide_origin)*cell_size,Color.BLACK,0.28,0,0)
		if show_ghost:
			creature(active,Vector2(model.landing(active,origin))*cell_size,Color.BLACK,0.16,0,0)
		creature(active,visual_origin*cell_size,Color.BLACK,1,0,0)
	if not vanish_cells.is_empty() and vanish_progress<1:
		creature(vanish_cells,Vector2(0,vanish_progress*25),Color.BLACK,1-vanish_progress,-1,-vanish_progress)
	if not next_preview.is_empty():
		var cells: Array[Vector2i] = model.shape(int(next_preview["shape"]))
		var center := Vector2(size.x-55,40)
		for cell in cells:
			for other in cells:
				if other==cell+Vector2i.RIGHT or other==cell+Vector2i.DOWN:
					draw_line(center+Vector2(cell)*11,center+Vector2(other)*11,Color("263129"),9,true)
			draw_circle(center+Vector2(cell)*11,5.5,Color("263129"))
	draw_line(Vector2(0,size.y-2),Vector2(size.x,size.y-2),Color("263129"),3)
	draw_rect(Rect2(1,1,size.x-2,size.y-2),Color("697660"),false,2)
