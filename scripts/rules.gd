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
	slipped = 0
	turns = 0
	random_state = seed_value & 0xffffffff
	bag.clear()

func random_int(limit: int) -> int:
	random_state = (random_state * 1664525 + 1013904223) & 0xffffffff
	return int(random_state % maxi(limit, 1))

func next_spec() -> Dictionary:
	if bag.is_empty():
		for i in range(SHAPES.size()):
			bag.append(i)
		for i in range(bag.size() - 1, 0, -1):
			var j: int = random_int(i + 1)
			var temp: int = bag[i]
			bag[i] = bag[j]
			bag[j] = temp
	var index: int = bag.pop_back()
	return {"shape": index, "color": random_int(6)}

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

func preview(cells: Array[Vector2i], origin: Vector2i) -> Dictionary:
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
	var stays: bool = floor_touch or contacts.size() >= 2
	var why: String = "floor" if floor_touch else ("friends" if stays else "slip")
	return {"keep": stays, "reason": why, "contacts": contacts, "floor": floor_touch}

func commit(cells: Array[Vector2i], origin: Vector2i, color_id: int) -> Dictionary:
	var result: Dictionary = preview(cells, origin)
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
	return result

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

func demo_choice(cells: Array[Vector2i], prefer_slip: bool = false) -> Dictionary:
	# Attract mode obeys exactly the player's rule. It occasionally demonstrates a slip.
	var best: Dictionary = {}
	var best_score: float = -INF
	var rotated: Array[Vector2i] = cells.duplicate()
	for rotation in range(4):
		for x in range(COLS - width(rotated) + 1):
			var pos: Vector2i = landing(rotated, Vector2i(x, -TOP_BUFFER))
			var check: Dictionary = preview(rotated, pos)
			if str(check["reason"]) in ["blocked", "overflow"]:
				continue
			var score: float = float(pos.y) * 8.0
			if bool(check["keep"]):
				score += 1000.0
				var previous: Dictionary = pieces.duplicate(true)
				var old_board: PackedInt32Array = board.duplicate()
				var old_id: int = next_id
				var old_kept: int = kept
				var old_turns: int = turns
				commit(rotated, pos, 0)
				score -= float(holes()) * 35.0
				board = old_board
				pieces = previous
				next_id = old_id
				kept = old_kept
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
	for key in pieces:
		var id_value: int = int(key)
		var piece: Dictionary = pieces[key]
		for value in piece["cells"]:
			var p: Vector2i = value
			if p.x < 0 or p.x >= COLS or p.y < 0 or p.y >= ROWS or at(p) != id_value:
				return false
			total += 1
	for id_value in board:
		if id_value > 0 and not pieces.has(id_value):
			return false
	return total == fill_count() and kept == pieces.size() and turns == kept + slipped
