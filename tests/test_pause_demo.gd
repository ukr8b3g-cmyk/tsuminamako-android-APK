extends SceneTree
func _initialize(): call_deferred("run")
func run():
 var g=load("res://Main.tscn").instantiate()
 g.session_path="res://tests/_pause_demo_session.cfg"
 root.add_child(g)
 g.set_process(false)
 g.sound.music.stop()
 g.sound.music_enabled=false
 g.sound.sfx_enabled=false
 g.cards.save_path="res://tests/_pause_demo_cards.cfg"
 var count=g.cards.total_owned_count()
 g.begin_demo()
 g.open_collection()
 assert(not g.collection_open)
 g.show_clear(true)
 g.finish_celebration()
 assert(g.mode!=g.Mode.REVEAL and not g.card_ui.reward_panel.visible)
 assert(g.cards.total_owned_count()==count)
 g.finish_trivia()
 g.begin_play()
 g.pause_game()
 assert(not g.modal_note.text.contains("Rキー"))
 var restart=g.modal.get_children().filter(func(n): return n is Button and n.text=="はじめから")
 assert(restart.size()==1)
 restart[0].pressed.emit()
 assert(g.mode==g.Mode.PLAY and g.model.turns==0)
 print("PASS native demo no reward/collection, pause tap restart")
 quit()
