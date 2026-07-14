extends Control

const DEEP_VIOLET := Color("#100626")
const INK := Color("#190B35")
const PANEL_VIOLET := Color("#26104E")
const PANEL_LIGHT := Color("#42217B")
const CORAL := Color("#FF6478")
const AQUA := Color("#35D7E5")
const SUNSHINE := Color("#FFC83D")
const WHITE := Color("#FFF9F2")
const SOFT_PURPLE := Color("#CDBBFF")
const SUCCESS_GREEN := Color("#87F05E")
const GOLD := Color("#FFD45A")

var board_grid: GridContainer
var piggie_row: HBoxContainer
var status_label: Label
var level_label: Label
var waiting_row: HBoxContainer
var combo_badge: Label
var pixel_cells: Array[PanelContainer] = []
var is_resolving := false
var combo := 0

var level_layout: Array[String] = [
	"CORAL", "AQUA", "SUNSHINE", "CORAL", "AQUA", "SUNSHINE",
	"AQUA", "SUNSHINE", "CORAL", "AQUA", "SUNSHINE", "CORAL",
	"SUNSHINE", "CORAL", "AQUA", "SUNSHINE", "CORAL", "AQUA"
]

var color_values: Dictionary = {
	"CORAL": CORAL,
	"AQUA": AQUA,
	"SUNSHINE": SUNSHINE
}


func _ready() -> void:
	_build_interface()
	_start_level()
	_show_launch_screen()


func _build_interface() -> void:
	var background := TextureRect.new()
	background.texture = load("res://assets/ui/bloom_garden_gameplay_bg.webp")
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)

	var veil := ColorRect.new()
	veil.color = Color(0.035, 0.01, 0.12, 0.34)
	veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(veil)

	var safe := MarginContainer.new()
	safe.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	safe.add_theme_constant_override("margin_left", 18)
	safe.add_theme_constant_override("margin_right", 18)
	safe.add_theme_constant_override("margin_top", 16)
	safe.add_theme_constant_override("margin_bottom", 15)
	add_child(safe)

	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 8)
	safe.add_child(page)

	_build_hud(page)
	_build_level_header(page)
	_build_board(page)
	_build_flow_zone(page)
	_build_piggie_queue(page)


func _build_hud(page: VBoxContainer) -> void:
	var hud := HBoxContainer.new()
	hud.add_theme_constant_override("separation", 8)
	page.add_child(hud)

	var profile := Button.new()
	profile.text = "🐷"
	profile.custom_minimum_size = Vector2(54, 50)
	profile.add_theme_font_size_override("font_size", 25)
	_apply_button_style(profile, PANEL_LIGHT, CORAL, 18)
	profile.tooltip_text = "Piggie Collection"
	profile.pressed.connect(_show_collection)
	hud.add_child(profile)

	var brand := VBoxContainer.new()
	brand.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	brand.add_theme_constant_override("separation", -2)
	hud.add_child(brand)

	var title := Label.new()
	title.text = "PIXEL PIGGIES"
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", WHITE)
	title.add_theme_color_override("font_shadow_color", CORAL)
	title.add_theme_constant_override("shadow_offset_x", 2)
	title.add_theme_constant_override("shadow_offset_y", 3)
	brand.add_child(title)

	var garden := Label.new()
	garden.text = "BLOOM GARDEN"
	garden.add_theme_font_size_override("font_size", 12)
	garden.add_theme_color_override("font_color", SOFT_PURPLE)
	brand.add_child(garden)

	var heart := _make_stat_chip("♥  5", CORAL)
	hud.add_child(heart)
	var coins := _make_stat_chip("●  560", GOLD)
	hud.add_child(coins)


func _build_level_header(page: VBoxContainer) -> void:
	var header := PanelContainer.new()
	header.add_theme_stylebox_override("panel", _panel_style(Color(0.10, 0.035, 0.24, 0.90), Color(0.62, 0.39, 1.0, 0.72), 18, 2))
	page.add_child(header)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	header.add_child(row)

	level_label = Label.new()
	level_label.text = "GARDEN 01  •  LEVEL 1"
	level_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	level_label.add_theme_font_size_override("font_size", 16)
	level_label.add_theme_color_override("font_color", WHITE)
	row.add_child(level_label)

	combo_badge = Label.new()
	combo_badge.text = "FLOW x1"
	combo_badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	combo_badge.add_theme_font_size_override("font_size", 16)
	combo_badge.add_theme_color_override("font_color", SUNSHINE)
	row.add_child(combo_badge)


func _build_board(page: VBoxContainer) -> void:
	var board_panel := PanelContainer.new()
	board_panel.custom_minimum_size = Vector2(0, 350)
	board_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	board_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.08, 0.025, 0.19, 0.90), Color("#8A5CFF"), 30, 3))
	page.add_child(board_panel)

	var board_stack := VBoxContainer.new()
	board_stack.add_theme_constant_override("separation", 9)
	board_panel.add_child(board_stack)

	var objective := HBoxContainer.new()
	objective.alignment = BoxContainer.ALIGNMENT_CENTER
	objective.add_theme_constant_override("separation", 8)
	board_stack.add_child(objective)
	for entry in [["● 6", CORAL], ["● 6", AQUA], ["● 6", SUNSHINE]]:
		var chip := Label.new()
		chip.text = entry[0]
		chip.add_theme_font_size_override("font_size", 14)
		chip.add_theme_color_override("font_color", entry[1])
		objective.add_child(chip)

	var board_center := CenterContainer.new()
	board_center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	board_stack.add_child(board_center)

	board_grid = GridContainer.new()
	board_grid.columns = 6
	board_grid.add_theme_constant_override("h_separation", 5)
	board_grid.add_theme_constant_override("v_separation", 5)
	board_center.add_child(board_grid)

	status_label = Label.new()
	status_label.text = "PICK A PIGGIE • START THE FLOW"
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.add_theme_font_size_override("font_size", 16)
	status_label.add_theme_color_override("font_color", AQUA)
	board_stack.add_child(status_label)


func _build_flow_zone(page: VBoxContainer) -> void:
	var flow := PanelContainer.new()
	flow.custom_minimum_size = Vector2(0, 70)
	flow.add_theme_stylebox_override("panel", _panel_style(Color(0.08, 0.025, 0.18, 0.94), Color(0.30, 0.85, 0.95, 0.65), 20, 2))
	page.add_child(flow)

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 4)
	flow.add_child(stack)

	var flow_label := Label.new()
	flow_label.text = "✦  BLOOM CONVEYOR  ✦"
	flow_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	flow_label.add_theme_font_size_override("font_size", 13)
	flow_label.add_theme_color_override("font_color", AQUA)
	stack.add_child(flow_label)

	waiting_row = HBoxContainer.new()
	waiting_row.alignment = BoxContainer.ALIGNMENT_CENTER
	waiting_row.add_theme_constant_override("separation", 9)
	stack.add_child(waiting_row)
	for index in range(5):
		var pod := PanelContainer.new()
		pod.custom_minimum_size = Vector2(55, 32)
		pod.add_theme_stylebox_override("panel", _panel_style(Color(0.20, 0.10, 0.38, 0.90), Color(0.65, 0.52, 1.0, 0.55), 14, 2))
		pod.set_meta("occupied", false)
		waiting_row.add_child(pod)


func _build_piggie_queue(page: VBoxContainer) -> void:
	var queue_title := Label.new()
	queue_title.text = "CHOOSE YOUR PIXEL PIGGIE"
	queue_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	queue_title.add_theme_font_size_override("font_size", 14)
	queue_title.add_theme_color_override("font_color", WHITE)
	page.add_child(queue_title)

	piggie_row = HBoxContainer.new()
	piggie_row.alignment = BoxContainer.ALIGNMENT_CENTER
	piggie_row.add_theme_constant_override("separation", 8)
	page.add_child(piggie_row)

	var footer := HBoxContainer.new()
	footer.alignment = BoxContainer.ALIGNMENT_CENTER
	footer.add_theme_constant_override("separation", 8)
	page.add_child(footer)
	for data in [["↶", "UNDO"], ["↻", "SHUFFLE"], ["✦", "BOOST"]]:
		var utility := Button.new()
		utility.text = "%s  %s" % [data[0], data[1]]
		utility.custom_minimum_size = Vector2(132, 42)
		utility.add_theme_font_size_override("font_size", 12)
		_apply_button_style(utility, PANEL_LIGHT, Color("#7850D8"), 16)
		footer.add_child(utility)


func _start_level() -> void:
	is_resolving = false
	combo = 0
	status_label.text = "PICK A PIGGIE • START THE FLOW"
	status_label.add_theme_color_override("font_color", AQUA)
	level_label.text = "GARDEN 01  •  LEVEL 1"
	combo_badge.text = "FLOW x1"

	for child in board_grid.get_children():
		child.queue_free()
	for child in piggie_row.get_children():
		child.queue_free()
	for pod in waiting_row.get_children():
		for content in pod.get_children():
			content.queue_free()
		pod.set_meta("occupied", false)

	pixel_cells.clear()
	for color_name in level_layout:
		_create_pixel(color_name)

	_create_piggie_button("CORAL", 6)
	_create_piggie_button("AQUA", 6)
	_create_piggie_button("SUNSHINE", 6)


func _create_pixel(color_name: String) -> void:
	var cell := PanelContainer.new()
	cell.custom_minimum_size = Vector2(51, 51)
	cell.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cell.set_meta("pixel_color", color_name)
	cell.pivot_offset = Vector2(25.5, 25.5)
	var pixel_style := _panel_style(color_values[color_name], color_values[color_name].lightened(0.33), 11, 2)
	pixel_style.shadow_color = Color(0, 0, 0, 0.38)
	pixel_style.shadow_size = 5
	pixel_style.shadow_offset = Vector2(0, 4)
	cell.add_theme_stylebox_override("panel", pixel_style)

	var shine := Label.new()
	shine.text = "◆"
	shine.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	shine.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	shine.add_theme_font_size_override("font_size", 13)
	shine.add_theme_color_override("font_color", Color(1, 1, 1, 0.72))
	shine.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cell.add_child(shine)

	board_grid.add_child(cell)
	pixel_cells.append(cell)


func _create_piggie_button(color_name: String, ammo: int) -> void:
	var button := Button.new()
	button.text = ""
	button.custom_minimum_size = Vector2(145, 86)
	button.icon = load("res://assets/piggies/%s.webp" % color_name.to_lower())
	button.expand_icon = true
	button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_apply_button_style(button, Color("#F1E7FF"), color_values[color_name], 25)
	button.add_theme_color_override("font_color", INK)
	button.add_theme_color_override("font_hover_color", INK)
	button.add_theme_color_override("font_pressed_color", INK)
	button.set_meta("used", false)
	button.pressed.connect(_launch_piggie.bind(color_name, ammo, button))

	var badge := PanelContainer.new()
	badge.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	badge.offset_left = 8
	badge.offset_right = -8
	badge.offset_top = -29
	badge.offset_bottom = -5
	badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge.add_theme_stylebox_override("panel", _panel_style(Color(0.07, 0.02, 0.16, 0.90), color_values[color_name], 11, 2))
	var badge_label := Label.new()
	badge_label.text = "%s  •  %d" % [color_name, ammo]
	badge_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	badge_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	badge_label.add_theme_font_size_override("font_size", 11)
	badge_label.add_theme_color_override("font_color", WHITE)
	badge_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge.add_child(badge_label)
	button.add_child(badge)
	piggie_row.add_child(button)


func _show_launch_screen() -> void:
	var launch := TextureButton.new()
	launch.name = "LaunchHero"
	launch.texture_normal = load("res://assets/brand/launch_hero.webp")
	launch.ignore_texture_size = true
	launch.stretch_mode = TextureButton.STRETCH_SCALE
	launch.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	launch.z_index = 100
	launch.tooltip_text = "Tap to play"
	launch.pressed.connect(_dismiss_launch.bind(launch))
	add_child(launch)


func _dismiss_launch(launch: TextureButton) -> void:
	launch.disabled = true
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_QUAD)
	tween.set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(launch, "modulate", Color(1, 1, 1, 0), 0.28)
	tween.parallel().tween_property(launch, "scale", Vector2(1.035, 1.035), 0.28)
	await tween.finished
	launch.queue_free()


func _show_collection() -> void:
	var overlay := ColorRect.new()
	overlay.name = "CollectionShowcase"
	overlay.color = Color(0.025, 0.008, 0.08, 0.97)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.z_index = 80
	add_child(overlay)

	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_top", 22)
	margin.add_theme_constant_override("margin_bottom", 20)
	overlay.add_child(margin)

	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 12)
	margin.add_child(stack)
	var heading := Label.new()
	heading.text = "PIGGIE COLLECTION  •  LIVE EVENTS"
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	heading.add_theme_font_size_override("font_size", 20)
	heading.add_theme_color_override("font_color", WHITE)
	stack.add_child(heading)

	var cards := HBoxContainer.new()
	cards.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cards.alignment = BoxContainer.ALIGNMENT_CENTER
	cards.add_theme_constant_override("separation", 10)
	stack.add_child(cards)
	for path in ["res://assets/brand/collection_preview.webp", "res://assets/brand/twin_bloom_preview.webp"]:
		var preview := TextureRect.new()
		preview.texture = load(path)
		preview.custom_minimum_size = Vector2(238, 0)
		preview.size_flags_vertical = Control.SIZE_EXPAND_FILL
		preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		cards.add_child(preview)

	var close := Button.new()
	close.text = "BACK TO THE GARDEN"
	close.custom_minimum_size = Vector2(0, 58)
	close.add_theme_font_size_override("font_size", 16)
	_apply_button_style(close, CORAL, WHITE, 22)
	close.pressed.connect(overlay.queue_free)
	stack.add_child(close)


func _launch_piggie(color_name: String, ammo: int, button: Button) -> void:
	if is_resolving or bool(button.get_meta("used")):
		return

	is_resolving = true
	button.set_meta("used", true)
	_set_piggie_buttons_disabled(true)
	status_label.text = "%s PIGGIE IS POPPING!" % color_name
	status_label.add_theme_color_override("font_color", color_values[color_name])

	var matching_cells: Array[PanelContainer] = []
	for cell in pixel_cells:
		if is_instance_valid(cell) and cell.get_meta("pixel_color") == color_name:
			matching_cells.append(cell)

	var hits: int = mini(ammo, matching_cells.size())
	for index in range(hits):
		var cell := matching_cells[index]
		if not is_instance_valid(cell):
			continue
		var tween := create_tween()
		tween.set_trans(Tween.TRANS_BACK)
		tween.set_ease(Tween.EASE_IN)
		tween.tween_property(cell, "scale", Vector2(1.18, 1.18), 0.055)
		tween.tween_property(cell, "modulate", Color(1.8, 1.8, 1.8, 1), 0.04)
		tween.tween_property(cell, "scale", Vector2.ZERO, 0.105)
		await tween.finished
		pixel_cells.erase(cell)
		cell.queue_free()
		await get_tree().create_timer(0.025).timeout

	combo += 1
	combo_badge.text = "FLOW x%d" % maxi(1, combo)
	_pulse(combo_badge)
	if pixel_cells.is_empty():
		_show_victory()
	else:
		status_label.text = "PERFECT HIT! KEEP THE FLOW"
		status_label.add_theme_color_override("font_color", SUCCESS_GREEN)
		is_resolving = false
		_set_piggie_buttons_disabled(false)


func _set_piggie_buttons_disabled(disabled_state: bool) -> void:
	for child in piggie_row.get_children():
		if child is Button:
			child.disabled = disabled_state or bool(child.get_meta("used"))


func _show_victory() -> void:
	is_resolving = false
	status_label.text = "BLOOM BURST!  ★★★"
	status_label.add_theme_color_override("font_color", SUNSHINE)
	level_label.text = "PERFECT FLOW • LEVEL COMPLETE"
	_set_piggie_buttons_disabled(true)
	_pulse(status_label, 1.12, 4)


func _make_stat_chip(text_value: String, accent: Color) -> PanelContainer:
	var chip := PanelContainer.new()
	chip.custom_minimum_size = Vector2(78, 48)
	chip.add_theme_stylebox_override("panel", _panel_style(Color(0.08, 0.025, 0.18, 0.92), accent, 18, 2))
	var label := Label.new()
	label.text = text_value
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 15)
	label.add_theme_color_override("font_color", WHITE)
	chip.add_child(label)
	return chip


func _panel_style(fill: Color, border: Color, radius: int, border_width: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(radius)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 9
	style.content_margin_bottom = 9
	return style


func _apply_button_style(button: Button, fill: Color, border: Color, radius: int) -> void:
	var normal := _panel_style(fill, border, radius, 3)
	normal.shadow_color = Color(0, 0, 0, 0.35)
	normal.shadow_size = 5
	normal.shadow_offset = Vector2(0, 4)
	button.add_theme_stylebox_override("normal", normal)
	var hover: StyleBoxFlat = normal.duplicate()
	hover.bg_color = fill.lightened(0.12)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("focus", hover)
	var pressed: StyleBoxFlat = normal.duplicate()
	pressed.bg_color = fill.darkened(0.10)
	pressed.shadow_size = 1
	pressed.shadow_offset = Vector2(0, 1)
	button.add_theme_stylebox_override("pressed", pressed)
	var disabled: StyleBoxFlat = normal.duplicate()
	disabled.bg_color = fill.darkened(0.45)
	disabled.border_color = border.darkened(0.35)
	button.add_theme_stylebox_override("disabled", disabled)


func _pulse(control: Control, target_scale := 1.08, loops := 2) -> void:
	control.pivot_offset = control.size * 0.5
	var tween := create_tween()
	tween.set_loops(loops)
	tween.tween_property(control, "scale", Vector2(target_scale, target_scale), 0.10)
	tween.tween_property(control, "scale", Vector2.ONE, 0.10)
