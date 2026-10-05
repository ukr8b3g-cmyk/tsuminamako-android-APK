extends RefCounted
## Pure board rules. No rendering, audio, input, clocks, or scene-tree calls.
## Browser reference: browser/rules.js; deterministic fixtures: tests/reference_fixtures.json.
## Count OTHER CREATURE IDs, never cells of the active creature or boundary walls.

const COLS: int = 8
const ROWS: int = 12
const TARGET: float = 0.8
const TOP_BUFFER: int = 4
const DIRS: Array[Vector2i] = [Vector2i.RIGHT, Vector2i.LEFT, Vector2i.UP, Vector2i.DOWN]
const SHAPES: Array = [
	[Vector2i(0, 0), Vector2i(1, 0)],
	[Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 0)],
	[Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 0), Vector2i(3, 0)],
	[Vector2i(0, 0), Vector2i(1, 0), Vector2i(1, 1)],
	[Vector2i(0, 0), Vector2i(1, 0), Vector2i(1, 1), Vector2i(2, 1)],
	[Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 0), Vector2i(2, 1)]
]

var board: PackedInt32Array = PackedInt32Array()
var pieces: Dictionary = {}
var next_id: int = 1
var kept: int = 0
var cleared: int = 0
var slipped: int = 0
var turns: int = 0
var random_state: int = 1
var bag: Array[int] = []

func _init(seed_value: int = 1) -> void:
	reset(seed_value)

func reset(seed_value: int = 1) -> void:
	board.resize(COLS * ROWS)
	board.fill(0)
	pieces.clear()
	next_id = 1
	kept = 0
	cleared = 0
	slipped = 0
	turns = 0
	random_state = seed_value & 0xffffffff
	bag.clear()

func random_int(limit: int) -> int:
	random_state = (random_state * 1664525 + 1013904223) & 0xffffffff
	return int(random_state % maxi(limit, 1))

func next_spec(difficulty: int = 1) -> Dictionary:
	if bag.is_empty():
		for i in range(SHAPES.size()):
			bag.append(i)
		for i in range(bag.size() - 1, 0, -1):
			var j: int = random_int(i + 1)
			var temp: int = bag[i]
			bag[i] = bag[j]
			bag[j] = temp
	var index: int = bag.pop_back()
	# Drop low LCG bits so the four-colour mode does not repeat a fixed cycle.
	var color_count: int = [6, 4, 3][clampi(difficulty, 0, 2)]
	return {"shape": index, "color": (random_int(16777216) >> 8) % color_count}

func shape(index: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for value in SHAPES[clampi(index, 0, SHAPES.size() - 1)]:
		var cell: Vector2i = value
		result.append(cell)
	return result

func rotate(cells: Array[Vector2i], direction: int = 1) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	var minimum: Vector2i = Vector2i(999, 999)
	for cell in cells:
		var rotated: Vector2i = Vector2i(-cell.y, cell.x) if direction > 0 else Vector2i(cell.y, -cell.x)
		result.append(rotated)
		minimum.x = mini(minimum.x, rotated.x)
		minimum.y = mini(minimum.y, rotated.y)
	for i in range(result.size()):
		result[i] -= minimum
	return result

func width(cells: Array[Vector2i]) -> int:
	var result: int = 0
	for cell in cells:
		result = maxi(result, cell.x + 1)
	return result

func at(position: Vector2i) -> int:
	if position.x < 0 or position.x >= COLS or position.y < 0 or position.y >= ROWS:
		return 0
	return board[position.y * COLS + position.x]

func can_place(cells: Array[Vector2i], origin: Vector2i) -> bool:
	if cells.is_empty():
		return false
	var seen: Dictionary = {}
	for cell in cells:
		var p: Vector2i = origin + cell
		if p.x < 0 or p.x >= COLS or p.y < -TOP_BUFFER or p.y >= ROWS:
			return false
		if seen.has(p) or at(p) != 0:
			return false
		seen[p] = true
	return true

func landing(cells: Array[Vector2i], origin: Vector2i) -> Vector2i:
	var result: Vector2i = origin
	if not can_place(cells, result):
		return result
	# Bounded even if passed malformed data by a test or a future UI.
	for _step in range(ROWS + TOP_BUFFER + 1):
		if not can_place(cells, result + Vector2i.DOWN):
			break
		result += Vector2i.DOWN
	return result

func preview(cells: Array[Vector2i], origin: Vector2i, color_id: int = -1) -> Dictionary:
	var contacts: Array[int] = []
	var floor_touch: bool = false
	if not can_place(cells, origin):
		return {"keep": false, "reason": "blocked", "contacts": contacts, "floor": false}
	for cell in cells:
		var p: Vector2i = origin + cell
		if p.y < 0:
			return {"keep": false, "reason": "overflow", "contacts": contacts, "floor": false}
		floor_touch = floor_touch or p.y == ROWS - 1
		for direction in DIRS:
			var neighbour: int = at(p + direction)
			if neighbour > 0 and not contacts.has(neighbour):
				contacts.append(neighbour)
	contacts.sort()
	var big_support: bool = false
	for id_value in contacts:
		big_support = big_support or int(pieces.get(id_value, {}).get("units", 1)) == 3
	var stays: bool = floor_touch or contacts.size() >= 2 or big_support
	var why: String = "floor" if floor_touch else ("friends" if contacts.size() >= 2 else ("big" if big_support else "slip"))
	var same_color: Array[int] = []
	if stays and color_id >= 0:
		same_color = matching_ids(cells, origin, color_id)
	return {"keep": stays, "reason": why, "contacts": contacts, "floor": floor_touch, "will_clear": same_color.size() >= 2, "match_ids": same_color}

func commit(cells: Array[Vector2i], origin: Vector2i, color_id: int) -> Dictionary:
	var result: Dictionary = preview(cells, origin, color_id)
	result["id"] = 0
	turns += 1
	if not bool(result["keep"]):
		slipped += 1
		return result
	var absolute: Array[Vector2i] = []
	for cell in cells:
		var p: Vector2i = origin + cell
		board[p.y * COLS + p.x] = next_id
		absolute.append(p)
	pieces[next_id] = {"cells": absolute, "color": clampi(color_id, 0, 5)}
	result["id"] = next_id
	next_id += 1
	kept += 1
	result["match"] = clear_matching(int(result["id"]), result["match_ids"])
	return result

func matching_ids(cells: Array[Vector2i], origin: Vector2i, color_id: int) -> Array[int]:
	# Connected creatures, not cell segments. Diagonals and other colours stop a chain.
	var ids: Array[int] = []
	for cell in cells:
		for direction in DIRS:
			var neighbour: int = at(origin + cell + direction)
			if neighbour > 0 and pieces.has(neighbour) and int(pieces[neighbour]["color"]) == color_id and not ids.has(neighbour): ids.append(neighbour)
	var cursor: int = 0
	while cursor < ids.size():
		for cell in pieces[ids[cursor]]["cells"]:
			for direction in DIRS:
				var neighbour: int = at(cell + direction)
				if neighbour > 0 and pieces.has(neighbour) and int(pieces[neighbour]["color"]) == color_id and not ids.has(neighbour): ids.append(neighbour)
		cursor += 1
	ids.sort()
	return ids

func clear_matching(seed_id: int, neighbours: Array[int]) -> Dictionary:
	if neighbours.size() < 2: return {}
	var ids: Array[int] = [seed_id]
	ids.append_array(neighbours)
	var sources: Array = []
	var color_id: int = int(pieces[seed_id]["color"])
	for id_value in ids:
		var piece: Dictionary = pieces[id_value]
		sources.append(piece.duplicate(true))
		for cell in piece["cells"]: board[cell.y*COLS+cell.x] = 0
		cleared += int(piece.get("units", 1))
		pieces.erase(id_value)
	return {"id": seed_id, "sources": sources, "color": color_id, "count": ids.size()}

func fill_count() -> int:
	var count: int = 0
	for id_value in board:
		if id_value > 0:
			count += 1
	return count

func fill_ratio() -> float:
	return float(fill_count()) / float(COLS * ROWS)

func is_clear() -> bool:
	return fill_count() >= int(ceil(TARGET * float(COLS * ROWS)))

func holes() -> int:
	var count: int = 0
	for x in range(COLS):
		var covered: bool = false
		for y in range(ROWS):
			if at(Vector2i(x, y)) > 0:
				covered = true
			elif covered:
				count += 1
	return count

func demo_choice(cells: Array[Vector2i], prefer_slip: bool = false, color_id: int = 0) -> Dictionary:
	# Attract mode obeys exactly the player's rule. It occasionally demonstrates a slip.
	var best: Dictionary = {}
	var best_score: float = -INF
	var rotated: Array[Vector2i] = cells.duplicate()
	for rotation in range(4):
		for x in range(COLS - width(rotated) + 1):
			var pos: Vector2i = landing(rotated, Vector2i(x, -TOP_BUFFER))
			var check: Dictionary = preview(rotated, pos, color_id)
			if str(check["reason"]) in ["blocked", "overflow"]:
				continue
			var score: float = float(pos.y) * 8.0
			if bool(check["keep"]):
				score += 1000.0
				var previous: Dictionary = pieces.duplicate(true)
				var old_board: PackedInt32Array = board.duplicate()
				var old_id: int = next_id
				var old_kept: int = kept
				var old_cleared: int = cleared
				var old_turns: int = turns
				var old_fill: int = fill_count()
				commit(rotated, pos, color_id)
				score += float(fill_count()-old_fill)*75.0
				score -= float(holes()) * 35.0
				board = old_board
				pieces = previous
				next_id = old_id
				kept = old_kept
				cleared = old_cleared
				turns = old_turns
			elif prefer_slip and pos.y > 2:
				score += 2000.0
			score -= absf(float(x) - 3.0) * 0.01
			if score > best_score:
				best_score = score
				best = {"cells": rotated.duplicate(), "origin": pos, "rotation": rotation, "keep": check["keep"]}
		rotated = rotate(rotated)
	return best

func verify_invariants() -> bool:
	if board.size() != COLS * ROWS:
		return false
	var total: int = 0
	var placements: int = 0
	for key in pieces:
		var id_value: int = int(key)
		var piece: Dictionary = pieces[key]
		var units: int = int(piece.get("units", 1))
		if units not in [1, 3] or piece["cells"].is_empty() or piece["cells"].size() > (12 if units == 3 else 4): return false
		if units == 3 and piece["cells"].size() < 3: return false
		placements += units
		var seen: Dictionary = {}
		for value in piece["cells"]:
			var p: Vector2i = value
			if seen.has(p) or p.x < 0 or p.x >= COLS or p.y < 0 or p.y >= ROWS or at(p) != id_value:
				return false
			seen[p] = true
			total += 1
		if units == 3:
			var reached: Array = [piece["cells"][0]]
			var cursor: int = 0
			while cursor < reached.size():
				for direction in DIRS:
					var p: Vector2i = reached[cursor] + direction
					if seen.has(p) and not reached.has(p): reached.append(p)
				cursor += 1
			if reached.size() != seen.size(): return false
	for id_value in board:
		if id_value > 0 and not pieces.has(id_value):
			return false
	return total == fill_count() and cleared >= 0 and kept == placements + cleared and turns == kept + slipped

func retainable_landing(cells: Array[Vector2i], include_path: bool = false) -> Dictionary:
	var shapes: Array = [cells.duplicate()]
	for i in range(3): shapes.append(rotate(shapes[-1]))
	for rotated in shapes:
		for x in range(COLS - width(rotated) + 1):
			var spot: Vector2i = landing(rotated, Vector2i(x, -TOP_BUFFER))
			if bool(preview(rotated, spot)["keep"]): return {"cells": rotated, "origin": spot}
	var start: Vector3i = Vector3i(0, int(floor(float(COLS-width(cells))/2.0)), -TOP_BUFFER)
	var queue: Array[Vector3i] = [start]
	var seen: Dictionary = {start: true}
	var parents: Dictionary = {}
	var index: int = 0
	while index < queue.size():
		var state: Vector3i = queue[index]
		index += 1
		var shape_cells: Array[Vector2i] = []
		shape_cells.assign(shapes[state.x])
		var spot: Vector2i = Vector2i(state.y, state.z)
		if not can_place(shape_cells, spot + Vector2i.DOWN) and bool(preview(shape_cells, spot)["keep"]):
			var route: Array = []
			if include_path:
				var cursor: Vector3i = state
				while true:
					route.push_front({"cells": shapes[cursor.x].duplicate(), "origin": Vector2i(cursor.y, cursor.z)})
					if cursor == start: break
					cursor = parents[cursor]
			return {"cells": shape_cells, "origin": spot, "route": route}
		var candidates: Array[Vector3i] = []
		for move in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.DOWN]:
			if can_place(shape_cells, spot + move): candidates.append(Vector3i(state.x, state.y+move.x, state.z+move.y))
		for direction in [-1, 1]:
			var rotation: int = posmod(state.x + direction, 4)
			for kick in [0, -1, 1, -2, 2, -3, 3]:
				if can_place(shapes[rotation], spot + Vector2i(kick, 0)):
					candidates.append(Vector3i(rotation, state.y+kick, state.z))
					break
		for candidate in candidates:
			if not seen.has(candidate):
				seen[candidate] = true
				if include_path: parents[candidate] = state
				queue.append(candidate)
	return {}

func entry_plan(cells: Array[Vector2i], prefer_best: bool = false, color_id: int = -1) -> Dictionary:
	var center: Vector2i = Vector2i(int(floor(float(COLS-width(cells))/2.0)), -TOP_BUFFER)
	if not prefer_best and str(preview(cells, landing(cells, center))["reason"]) not in ["blocked", "overflow"]:
		return {"cells": cells.duplicate(), "origin": center, "route": []}
	var best: Dictionary = {}
	var score: float = -INF
	var rotated: Array[Vector2i] = cells.duplicate()
	for rotation in range(4):
		for x in range(COLS-width(rotated)+1):
			var start: Vector2i = Vector2i(x, -TOP_BUFFER)
			var spot: Vector2i = landing(rotated, start)
			var forecast: Dictionary = preview(rotated, spot, color_id)
			if not bool(forecast["keep"]): continue
			var value: float = float(spot.y*10) - (10000.0 if prefer_best and bool(forecast.get("will_clear",false)) else 0.0) - absf(float(x)-float(COLS-width(rotated))/2.0)*0.1 - float(rotation)*0.01
			if value > score:
				score = value
				best = {"cells": rotated.duplicate(), "origin": start, "route": []}
		rotated = rotate(rotated)
	if not best.is_empty(): return best
	# A legal sideways route under a roof must remain playable too.
	var reachable: Dictionary = retainable_landing(cells, true)
	if reachable.is_empty(): return {}
	return {"cells": cells.duplicate(), "origin": center, "route": reachable.get("route", [])}
