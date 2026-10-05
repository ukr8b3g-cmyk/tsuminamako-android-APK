extends Node
const Locale = preload("res://scripts/locale_text.gd")
## Native Godot audio only. All WAVs are newly synthesized for this prototype.
## Separate Music/SFX buses; no microphone, networking, or third-party plugins.

const SFX_NAMES: Array[String] = ["move", "rotate", "drop", "stick", "slip", "click", "start", "clear", "fanfare", "card_pop", "card_rare", "merge"]
const TRACKS: Array[String] = ["tide_garden", "bubble_parade", "moon_pool", "aquarium_air", "drowse"]
# Measured PCM RMS trims; keep the five existing tracks at a similar level.
const TRACK_TRIMS_DB: Array[float] = [0.6, -1.0, -0.4, 2.7, 1.1]
const TRACK_NAMES: Array[String] = ["潮の庭", "ぽにゅ散歩", "月の水槽", "水槽の呼吸", "まどろみ"]
var track_index: int = 0
var music_level: float = 0.7
var music_enabled: bool = true
var sfx_enabled: bool = true
var music: AudioStreamPlayer
var players: Dictionary = {}
var settings_path: String = "user://namako_settings.cfg"
var demo_mode: bool = false
var celebration_mode: bool = false

func _ready() -> void:
	var config: ConfigFile = ConfigFile.new()
	if config.load(settings_path) == OK:
		track_index = clampi(int(config.get_value("audio", "track", 0)), 0, TRACKS.size() - 1)
		music_enabled = bool(config.get_value("audio", "music", true))
		music_level = clampf(float(config.get_value("audio", "level", 0.7)), 0.0, 1.0)
		if not is_finite(music_level): music_level = 0.7
		sfx_enabled = bool(config.get_value("audio", "sfx", true))
	music = AudioStreamPlayer.new()
	music.name = "Music"
	music.bus = "Music"
	var stream: AudioStreamWAV = load("res://assets/audio/" + TRACKS[track_index] + ".wav") as AudioStreamWAV
	if stream != null:
		var loop_stream: AudioStreamWAV = stream.duplicate() as AudioStreamWAV
		loop_stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		loop_stream.loop_begin = 0
		loop_stream.loop_end = int(round(loop_stream.get_length() * float(loop_stream.mix_rate)))
		music.stream = loop_stream
	add_child(music)
	for sound_name in SFX_NAMES:
		var player: AudioStreamPlayer = AudioStreamPlayer.new()
		player.name = sound_name
		player.bus = "SFX"
		player.max_polyphony = 3
		player.stream = load("res://assets/audio/" + sound_name + ".wav") as AudioStream
		add_child(player)
		players[sound_name] = player
	apply_settings()

func play(sound_name: String, in_demo: bool = false) -> void:
	if not sfx_enabled or not players.has(sound_name):
		return
	var player: AudioStreamPlayer = players[sound_name]
	player.volume_db = -9.0 if in_demo else 0.0
	player.play()

func set_demo(is_demo: bool) -> void:
	demo_mode = is_demo
	celebration_mode = false
	update_music_level()

func set_celebration(is_celebrating: bool) -> void:
	celebration_mode = is_celebrating
	update_music_level()

func update_music_level() -> void:
	if music == null:
		return
	var duck: float = 0.4 if celebration_mode else (0.65 if demo_mode else 1.0)
	var gain: float = music_level * 0.7 * duck * db_to_linear(TRACK_TRIMS_DB[track_index])
	music.volume_db = linear_to_db(gain) if gain > 0.0 else -80.0

func set_music_level(level: float) -> void:
	music_level = clampf(level, 0.0, 1.0) if is_finite(level) else 0.7
	update_music_level()
	save_settings()

func cycle_track() -> void:
	track_index = (track_index + 1) % TRACKS.size()
	var source: AudioStreamWAV = load("res://assets/audio/" + TRACKS[track_index] + ".wav") as AudioStreamWAV
	if source != null:
		var loop: AudioStreamWAV = source.duplicate() as AudioStreamWAV
		loop.loop_mode = AudioStreamWAV.LOOP_FORWARD
		loop.loop_begin = 0
		loop.loop_end = int(round(loop.get_length() * float(loop.mix_rate)))
		music.stop()
		music.stream = loop
		apply_settings()
	save_settings()

func toggle_music() -> void:
	music_enabled = not music_enabled
	apply_settings()
	save_settings()

func toggle_sfx() -> void:
	sfx_enabled = not sfx_enabled
	apply_settings()
	save_settings()
	if sfx_enabled:
		play("click")

func apply_settings() -> void:
	update_music_level()
	var music_bus: int = AudioServer.get_bus_index("Music")
	var sfx_bus: int = AudioServer.get_bus_index("SFX")
	if music_bus >= 0:
		AudioServer.set_bus_mute(music_bus, not music_enabled)
	if sfx_bus >= 0:
		AudioServer.set_bus_mute(sfx_bus, not sfx_enabled)
	if music != null and music.stream != null:
		if music_enabled and not music.playing:
			music.play()
		elif not music_enabled:
			music.stop()

func save_settings() -> void:
	var config: ConfigFile = ConfigFile.new()
	config.load(settings_path)
	config.set_value("audio", "track", track_index)
	config.set_value("audio", "music", music_enabled)
	config.set_value("audio", "level", music_level)
	config.set_value("audio", "sfx", sfx_enabled)
	var error: Error = config.save(settings_path)
	if error != OK:
		push_warning("Audio preferences could not be saved; gameplay is unaffected.")
