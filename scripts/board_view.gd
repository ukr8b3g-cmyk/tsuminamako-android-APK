extends Control
## Visual-only softness. Native CanvasItem drawing, Tween and CPUParticles2D.
const Rules = preload("res://scripts/rules.gd")
const CELL: float = 46.0
var cell_size: float = CELL
const COLORS: Array[Color] = [Color("ff668b"), Color("22c6c5"), Color("ffc44c"), Color("85ce47"), Color("9a79e8"), Color("ffa35c")]
var rotation_from: Array[Vector2] = []
var rotation_time: float = 1.0
var reduced_motion: bool = false
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
var frozen: bool = false:
	set(value):
		if frozen == value:
			return
		frozen = value
		if frozen:
			for tween in [impact_tween, vanish_tween]:
				if tween != null and tween.is_valid() and tween.is_running():
					tween.pause()
					frozen_tweens.append(tween)
		else:
			for tween in frozen_tweens:
				if tween.is_valid():
					tween.play()
			frozen_tweens.clear()
		for child in get_children():
			if child is CPUParticles2D:
				child.speed_scale = 0.0 if frozen else 1.0
var frozen_tweens: Array[Tween] = []
var impact_id: int = 0
var impact: float = 0.0
var vanish_cells: Array[Vector2i] = []
var vanish_color: int = 0
var vanish_progress: float = 1.0
var impact_tween: Tween
var vanish_tween: Tween
var bubble_texture: ImageTexture
var goal_ratio: float = 0.9
var near_goal: bool = false
var celebration_active: bool = false
var celebration_clock: float = 0.0
var match_effect: Dictionary = {}

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
		if not match_effect.is_empty():
			match_effect["time"] += delta
			if float(match_effect["time"]) >= (0.35 if reduced_motion else 0.9): match_effect.clear()
		if not reduced_motion: clock += delta
		rotation_time = minf(1.0, rotation_time + delta / 0.28)
		if celebration_active:
			celebration_clock += delta
		visual_origin = Vector2(origin) if reduced_motion else visual_origin.lerp(Vector2(origin), 1.0 - exp(-delta * 18.0))
	queue_redraw()

func reset_visuals() -> void:
	match_effect.clear()
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

func start_celebration(with_burst: bool = true) -> void:
	celebration_active = true
	celebration_clock = 0.0
	if with_burst: celebration_burst()

func celebration_burst() -> void:
	burst(Vector2(64, 110), Color("ffc44c"), false, true)
	burst(Vector2(168, 245), Color("ff668b"), false, true)
	burst(Vector2(272, 130), Color("22c6c5"), false, true)

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

func start_match(event: Dictionary) -> void:
	match_effect = event.duplicate(true)
	match_effect["time"] = 0.0
	var cells: Array[Vector2i] = []
	var owners: Dictionary = {}
	var centers: Array[Vector2] = []
	for i in range(event["sources"].size()):
		var middle: Vector2 = Vector2.ZERO
		for cell in event["sources"][i]["cells"]:
			cells.append(cell)
			owners[cell] = i
			middle += (Vector2(cell)+Vector2(0.5,0.5))*cell_size
		centers.append(middle/float(event["sources"][i]["cells"].size()))
	var center: Vector2 = Vector2.ZERO
	var necks: Array = []
	for cell in cells:
		var point: Vector2 = (Vector2(cell)+Vector2(0.5,0.5))*cell_size
		center += point
		for direction in [Vector2i.RIGHT,Vector2i.DOWN]:
			if owners.has(cell+direction) and owners[cell+direction] != owners[cell]: necks.append([point,point+Vector2(direction)*cell_size])
	match_effect["all_cells"] = cells
	match_effect["center"] = center/float(cells.size())
	match_effect["centers"] = centers
	match_effect["necks"] = necks

func match_pose() -> Dictionary:
	var elapsed: float = float(match_effect.get("time",0.0))
	if reduced_motion: return {"join":0.0,"fused":0.0,"fade":clampf(elapsed/0.35,0.0,1.0),"bubbles":0.0,"jelly":0.0}
	var join: float = clampf(elapsed/0.18,0.0,1.0)
	return {"join":join*join*(3.0-2.0*join),"fused":smoothstep(0.18,0.32,elapsed),"fade":smoothstep(0.52,0.9,elapsed),"bubbles":clampf((elapsed-0.45)/0.45,0.0,1.0),"jelly":sin(elapsed*27.0)*exp(-maxf(0.0,elapsed-0.2)*5.0)*0.28+sin(join*PI)*0.28}

func settled_creature(cells: Array[Vector2i], piece: Dictionary, id_value: int, deformation: float) -> void:
	creature(cells, Vector2.ZERO, COLORS[int(piece["color"])], 1.0, id_value, deformation)

func draw_match_effect() -> void:
	if match_effect.is_empty(): return
	var pose: Dictionary = match_pose()
	var center: Vector2 = match_effect["center"]
	var alpha: float = 1.0-float(pose["fade"])
	var fused: float = float(pose["fused"])
	var color: Color = COLORS[int(match_effect["color"])]
	var ink: Color = Color("4b5544") if lcd_mode else color
	if not reduced_motion and fused<1.0:
		for neck in match_effect["necks"]:
			var opacity: float = float(pose["join"])*(1.0-fused)
			var width: float = cell_size*(0.12+float(pose["join"])*0.66)
			draw_line(neck[0],neck[1],Color(ink,opacity),width,true)
			draw_circle((neck[0]+neck[1])*0.5,width*0.5,Color(ink,opacity))
			if not lcd_mode: draw_line(neck[0]+Vector2(0,-3),neck[1]+Vector2(0,-3),Color(color.lightened(0.18),opacity*0.7),width*0.7,true)
	for i in range(match_effect["sources"].size()):
		if fused>=1.0: break
		var source: Dictionary = match_effect["sources"][i]
		var cells: Array[Vector2i] = []
		cells.assign(source["cells"])
		var shift: Vector2 = Vector2.ZERO if reduced_motion else (center-match_effect["centers"][i])*0.06*float(pose["join"])*(1.0-fused)
		creature(cells,shift,color,alpha*(1.0-fused),-2,float(pose["jelly"]))
	if fused>0.0:
		var cells: Array[Vector2i] = []
		cells.assign(match_effect["all_cells"])
		creature(cells,Vector2(0,-float(pose["fade"])*cell_size*0.12),color,alpha*fused,-2,float(pose["jelly"]))
	if reduced_motion: return
	var progress: float = float(pose["bubbles"])
	if progress<=0.0: return
	ink = Color("4b5544") if lcd_mode else Color("b6ffde")
	var ring: Color = Color(ink,(1.0-progress)*0.55)
	draw_circle(center,cell_size*(0.45+progress*1.55),ring,false,2.3,true)
	for i in range(12):
		var angle: float = float(i)*TAU/12.0+0.12
		var p: Vector2 = center+Vector2.from_angle(angle)*cell_size*(0.55+progress*1.45)
		p.y -= progress*progress*cell_size*0.45
		draw_circle(p,(1.0-progress)*3.2+0.6,Color(ink,(1.0-progress)*0.9),false,1.3,true)

func lcd_marks(center: Vector2, color_id: int, alpha: float, scale_value: float = 1.0, ink: Color = Color("b9c3a6")) -> void:
	var count: int = clampi(color_id,0,5)+1
	var columns: int = mini(count,3)
	var rows: int = int(ceil(float(count)/3.0))
	for i in range(count):
		var p: Vector2 = center+Vector2((float(i%3)-float(columns-1)*0.5)*8.0,(floorf(float(i)/3.0)-float(rows-1)*0.5)*8.0)*scale_value
		draw_circle(p,3.0*scale_value,Color(ink,alpha))

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
	if reduced_motion: return
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
	draw_goal_line()
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
		var prediction: Dictionary = model.preview(active, destination, active_color)
		contact_ids = prediction["contacts"]
		var ghost_color: Color = Color("ad7bea") if bool(prediction.get("will_clear",false)) else (Color("309c87") if bool(prediction["keep"]) else Color("cb9954"))
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
		settled_creature(cells, piece, id_value, deformation)
		if id_value == impact_id and impact > 0.01:
			draw_circle((Vector2(cells[0]) + Vector2(0.5, 0.5)) * cell_size, 22.0 + (1.0 - clampf(impact, 0, 1)) * 30.0, Color(1, 1, 1, clampf(impact, 0, 1) * 0.35), false, 1.8, true)
		if show_ghost and show_active and contact_ids.has(id_value):
			var head: Vector2 = (Vector2(cells[0]) + Vector2(0.5, 0.5)) * cell_size
			draw_circle(head + Vector2(11, -12), 4.0, Color("fffbed"))
	draw_match_effect()
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
	if reduced_motion: deformation = 0.0
	var points: Array[Vector2] = []
	var middle: Vector2 = Vector2.ZERO
	for cell in cells:
		middle += (Vector2(cell) + Vector2(0.5, 0.5)) * cell_size + offset
	middle /= float(cells.size())
	var party_wave: float = 0.0
	if celebration_active and id_value > 0 and not reduced_motion:
		party_wave = sin(clampf((celebration_clock-float(id_value % 12)*0.055)/0.65, 0.0, 1.0)*PI)*0.8
		deformation += party_wave * 0.18
	if id_value > 0 and not reduced_motion:
		deformation += sin(clock * 1.9 + float(id_value) * 0.8) * 0.055
	for i in range(cells.size()):
		var point: Vector2 = (Vector2(cells[i]) + Vector2(0.5, 0.5)) * cell_size + offset
		point = middle + (point - middle) * Vector2(1.0 + deformation * 0.24, 1.0 - absf(deformation) * 0.42)
		point.y += sin(clock * 3.0 + float(i) * 1.1 + float(id_value)) * (1.2 if id_value == 0 else 0.45)
		if celebration_active and id_value > 0 and not reduced_motion:
			point.x += sin(celebration_clock * 9.0 + float(i) * 0.9 + float(id_value)) * 4.2
			point.y += cos(celebration_clock * 10.0 + float(i) + float(id_value)) * 3.1
		if not reduced_motion and id_value == 0 and rotation_time < 1.0 and i < rotation_from.size():
			var old: Vector2 = rotation_from[i]
			var delta: Vector2 = point-old
			var t: float = rotation_time
			point = old.lerp(point,t*t*(3.0-2.0*t)) + Vector2(-delta.y,delta.x)*sin(t*PI)*0.18
		points.append(point)
	var is_big: bool = id_value > 0 and model != null and model.pieces.has(id_value) and int(model.pieces[id_value].get("units", 1)) == 3
	var radius: float = cell_size * (0.445 if is_big else 0.422) * (1.0 - maxf(-deformation, 0.0) * 0.7)
	if lcd_mode:
		var ink := Color(Color("4b5544"),alpha)
		for i in range(cells.size()):
			for j in range(i+1,cells.size()):
				var d: Vector2i = cells[i]-cells[j]
				if absi(d.x)+absi(d.y)==1:
					draw_line(points[i],points[j],ink,radius*1.88,true)
		for point in points:
			draw_circle(point,radius,ink)
		lcd_marks(points[-1],maxi(0,COLORS.find(color)),alpha)
		var head := points[0]
		var face := Color(Color("b9c3a6"),alpha)
		draw_circle(head+Vector2(-5,-3),2.6,face)
		draw_circle(head+Vector2(5,-3),2.6,face)
		draw_arc(head+Vector2(0,1),4,0.1,PI-0.1,10,face,1.3,true)
		return
	var shadow: Color = Color(color.darkened(0.46), alpha * 0.68)
	var body: Color = Color(color, alpha)
	for layer in range(3):
		var shift: Vector2 = Vector2(0, cell_size * 0.055) if layer == 0 else (Vector2(-0.5,-cell_size*0.05) if layer == 2 else Vector2.ZERO)
		var ink: Color = shadow if layer == 0 else (Color(color.lightened(0.13), alpha) if layer == 2 else Color(color.darkened(0.12), alpha))
		var r: float = radius + 1.0 if layer == 0 else (radius * 0.89 if layer == 2 else radius)
		for i in range(cells.size()):
			for j in range(i + 1, cells.size()):
				var distance: Vector2i = cells[i] - cells[j]
				if absi(distance.x) + absi(distance.y) == 1:
					draw_line(points[i] + shift, points[j] + shift, ink, r * 1.88, true)
		for point in points:
			draw_circle(point + shift, r, ink)
	# Tiny blunt papillae only on exposed skin, never between joined cells.
	var occupied: Dictionary = {}
	for cell in cells: occupied[cell] = true
	for i in range(points.size()):
		var point: Vector2 = points[i]
		for direction in [Vector2i.UP, Vector2i.LEFT, Vector2i.RIGHT]:
			if occupied.has(cells[i]+direction): continue
			for twist in [-0.4,0.35]:
				var normal: Vector2 = Vector2(direction).rotated(twist)
				var base: Vector2 = point+normal*radius*0.82
				draw_line(base,point+normal*(radius+cell_size*0.045),Color(color.darkened(0.13),alpha),cell_size*0.065,true)
				draw_circle(point+normal*(radius+cell_size*0.023),cell_size*0.02,Color(color.lightened(0.23),alpha))
		for spot in range(4):
			var angle: float = float((i*47+spot*79+id_value*13)%360)*PI/180.0
			var p: Vector2 = point+Vector2.from_angle(angle)*radius*(0.28+float(spot%3)*0.17)
			draw_circle(p,cell_size*(0.017+float(spot%2)*0.012),Color(color.darkened(0.24),alpha*0.42))
		if not occupied.has(cells[i]+Vector2i.DOWN):
			for dx in [-0.19,0.14]:
				draw_circle(point+Vector2(cell_size*dx,radius*0.72),cell_size*0.025,Color(color.darkened(0.28),alpha*0.65))
		draw_line(point+Vector2(-radius*0.3,-radius*0.47),point+Vector2(radius*0.15,-radius*0.54),Color(1,1,1,alpha*0.36),cell_size*0.045,true)
	var head: Vector2 = points[0]
	var face_scale: float = 1.12 if is_big else 1.0
	var eye: Color = Color(Color("254b50"), alpha)
	var blink: bool = fposmod(clock + float(id_value) * 0.31, 5.3) > 5.15
	for dx in [-5.0, 5.0]:
		if blink:
			draw_line(head + Vector2(dx - 1.8, -2), head + Vector2(dx + 1.8, -2), eye, 1.5, true)
		else:
			draw_circle(head + Vector2(dx, -2)*face_scale, 2.4*face_scale, eye)
			draw_circle(head + Vector2(dx - 0.6, -2.8), 0.7, Color(1, 1, 1, alpha))
	draw_arc(head + Vector2(0, 1), 4.0, 0.1, PI - 0.1, 10, eye, 1.3, true)
	draw_circle(head + Vector2(-10, 3.5), 2.7, Color(1, 1, 1, alpha * 0.25))
	draw_circle(head + Vector2(10, 3.5), 2.7, Color(1, 1, 1, alpha * 0.25))

func draw_lcd_board() -> void:
	# LCD polarizer: a subtle vertical tint and inset shadow, bounded draw cost.
	for band in range(24):
		var tint: Color = Color("c6cdb1").lerp(Color("aeb997"), float(band) / 23.0)
		draw_rect(Rect2(0, float(band) * size.y / 24.0, size.x, size.y / 24.0 + 1), tint)
	for edge in range(4):
		draw_rect(Rect2(edge, edge, size.x - edge * 2, size.y - edge * 2), Color(0.15, 0.20, 0.11, 0.08), false, 1)
	for y in range(Rules.ROWS+1):
		draw_dashed_line(Vector2(0,y*cell_size),Vector2(size.x,y*cell_size),Color("68785a36"),1,2,true,true)
	for x in range(Rules.COLS+1):
		draw_dashed_line(Vector2(x*cell_size,0),Vector2(x*cell_size,size.y),Color("68785a36"),1,2,true,true)
	if model == null: return
	for key in model.pieces:
		var piece: Dictionary = model.pieces[key]
		var cells: Array[Vector2i] = []
		cells.assign(piece["cells"])
		settled_creature(cells,piece,int(key),impact if int(key)==impact_id else 0)
	draw_match_effect()
	if show_active and not active.is_empty():
		if show_guide and guide_origin.x>=0:
			creature(active,Vector2(guide_origin)*cell_size,COLORS[active_color],0.28,0,0)
		if show_ghost:
			creature(active,Vector2(model.landing(active,origin))*cell_size,COLORS[active_color],0.16,0,0)
		creature(active,visual_origin*cell_size,COLORS[active_color],1,0,0)
	if not vanish_cells.is_empty() and vanish_progress<1:
		creature(vanish_cells,Vector2(0,vanish_progress*25),COLORS[vanish_color],1-vanish_progress,-1,-vanish_progress)
	if not next_preview.is_empty():
		var cells: Array[Vector2i] = model.shape(int(next_preview["shape"]))
		var center := Vector2(size.x-55,40)
		for cell in cells:
			for other in cells:
				if other==cell+Vector2i.RIGHT or other==cell+Vector2i.DOWN:
					draw_line(center+Vector2(cell)*11,center+Vector2(other)*11,Color("4b5544"),9,true)
			draw_circle(center+Vector2(cell)*11,5.5,Color("4b5544"))
		lcd_marks(center+Vector2(0,18),int(next_preview["color"]),1.0,0.75,Color("4b5544"))
	draw_line(Vector2(0,size.y-2),Vector2(size.x,size.y-2),Color("4b5544"),3)
	draw_rect(Rect2(1,1,size.x-2,size.y-2),Color("697660"),false,2)


func draw_goal_line() -> void:
	if not near_goal: return
	var y: float = size.y * (1.0-goal_ratio)
	var ink: Color = Color("263129") if lcd_mode else Color("ffd36d")
	ink.a = 0.8 if reduced_motion else 0.55+0.25*sin(clock*2.0)
	draw_line(Vector2(5,y),Vector2(size.x-5,y),ink,2.5,true)
