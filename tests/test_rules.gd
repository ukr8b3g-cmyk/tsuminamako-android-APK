extends SceneTree
## Run: Godot --headless --path <project> --script res://tests/test_rules.gd
## This suite is INCLUDED, but was NOT executed in the build sandbox (no Godot binary).
const Rules = preload("res://scripts/rules.gd")
var passed: int = 0
var failed: int = 0

func _initialize() -> void:
	call_deferred("run_tests")

func check(condition: bool, description: String) -> void:
	if condition:
		passed += 1
		print("PASS: " + description)
	else:
		failed += 1
		push_error("FAIL: " + description)

func drop(rules: Rules, cells: Array[Vector2i], x: int, color_id: int = 0) -> Dictionary:
	return rules.commit(cells, rules.landing(cells, Vector2i(x, -3)), color_id)

func run_tests() -> void:
	var r: Rules = Rules.new(1)
	check(r.fill_count() == 0 and r.verify_invariants(), "empty board")
	var out: Dictionary = drop(r, r.shape(0), 0)
	check(bool(out["keep"]) and str(out["reason"]) == "floor", "floor retains a creature")
	out = drop(r, r.shape(0), 0)
	check(not bool(out["keep"]) and out["contacts"].size() == 1 and r.fill_count() == 2, "two cells of ONE neighbour do not qualify")
	r.reset()
	drop(r, r.shape(0), 0, 2)
	drop(r, r.shape(0), 2, 2)
	out = drop(r, r.shape(0), 1, 2)
	check(bool(out["keep"]) and out["contacts"].size() == 2 and r.fill_count() == 6, "TWO different neighbours retain a bridge; colour ignored")
	var before: PackedInt32Array = r.board.duplicate()
	out = r.preview(r.shape(0), Vector2i(5, 4))
	check(not bool(out["keep"]) and r.board == before, "preview has no side effects or self contacts")
	out = r.commit(r.shape(0), Vector2i(0, 11), 0)
	check(not bool(out["keep"]) and str(out["reason"]) == "blocked" and r.board == before, "overlap never overwrites")
	out = r.commit(r.shape(0), Vector2i(0, -1), 0)
	check(str(out["reason"]) == "overflow" and r.board == before and r.verify_invariants(), "overflow slips; no top-out")
	check(not r.can_place(r.shape(0), Vector2i(-1, 5)) and not r.can_place(r.shape(0), Vector2i(7, 5)), "horizontal bounds")
	check(not r.can_place(r.shape(0), Vector2i(0, 12)) and not r.can_place(r.shape(0), Vector2i(0, -5)), "vertical bounds")
	for index in range(Rules.SHAPES.size()):
		var cells: Array[Vector2i] = r.shape(index)
		var original: Array[Vector2i] = cells.duplicate()
		for _turn in range(4):
			cells = r.rotate(cells)
		check(cells == original, "four rotations preserve shape %d" % index)
	r.reset()
	for _turn in range(300):
		drop(r, r.shape(0), 3)
	check(r.fill_count() == 2 and r.slipped == 299 and r.verify_invariants(), "300 straight drops do not create a tower")
	r.reset()
	for x in range(0, Rules.COLS, 2):
		drop(r, r.shape(0), x)
	check(r.fill_count() == 8 and r.pieces.size() == 4, "full row remains without hardening")
	var cleared: int = 0
	for seed_value in range(1, 21):
		r.reset(seed_value)
		for _turn in range(100):
			var spec: Dictionary = r.next_spec()
			var choice: Dictionary = r.demo_choice(r.shape(int(spec["shape"])))
			if choice.is_empty():
				break
			var cells: Array[Vector2i] = []
			cells.assign(choice["cells"])
			var position: Vector2i = choice["origin"]
			r.commit(cells, position, int(spec["color"]))
			if r.is_clear():
				cleared += 1
				break
		check(r.verify_invariants(), "planned run invariants seed %d" % seed_value)
	check(cleared == 20, "20 seeded planned games clear")
	check_reference_fixtures()
	print("Native rule tests: %d PASS / %d FAIL" % [passed, failed])
	var report: Dictionary = {"engine": Engine.get_version_info(), "passed": passed, "failed": failed, "scope": "native rule suite, not visual or audio-device testing"}
	var file: FileAccess = FileAccess.open("res://tests/native_results.json", FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(report, "\t"))
	quit(1 if failed > 0 else 0)

func check_reference_fixtures() -> void:
	var text: String = FileAccess.get_file_as_string("res://tests/reference_fixtures.json")
	var parsed: Variant = JSON.parse_string(text)
	if not parsed is Dictionary:
		check(false, "reference fixture JSON loads")
		return
	var data: Dictionary = parsed
	var mismatches: int = 0
	var total: int = 0
	for case_value in data["cases"]:
		var case_data: Dictionary = case_value
		var r: Rules = Rules.new(int(case_data["seed"]))
		for step_value in case_data["steps"]:
			var step: Dictionary = step_value
			var spec: Dictionary = r.next_spec()
			var cells: Array[Vector2i] = r.shape(int(spec["shape"]))
			for _rotation in range(int(step["rotation"])):
				cells = r.rotate(cells)
			var position: Vector2i = r.landing(cells, Vector2i(int(step["x"]), -3))
			var result: Dictionary = r.commit(cells, position, int(spec["color"]))
			var ok: bool = int(spec["shape"]) == int(step["shape"]) and int(spec["color"]) == int(step["color"])
			ok = ok and position.y == int(step["y"]) and bool(result["keep"]) == bool(step["keep"])
			ok = ok and str(result["reason"]) == str(step["reason"]) and r.fill_count() == int(step["filled"])
			ok = ok and result["contacts"].size() == step["contacts"].size()
			if ok:
				for i in range(result["contacts"].size()):
					ok = ok and int(result["contacts"][i]) == int(step["contacts"][i])
			if not ok or not r.verify_invariants():
				mismatches += 1
			total += 1
	check(mismatches == 0 and total == 300, "300 recorded browser-reference placements match native rules")
