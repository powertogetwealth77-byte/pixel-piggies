extends Control

const DEEP_VIOLET := Color("#12072E")
const PANEL_VIOLET := Color("#291653")
const CORAL := Color("#FF6577")
const AQUA := Color("#34D9E6")
const SUNSHINE := Color("#FFC83D")
const WHITE := Color("#FFF9F2")
const SOFT_PURPLE := Color("#BFA8FF")
const SUCCESS_GREEN := Color("#78E85B")

var board_grid: GridContainer
var piggie_row: HBoxContainer
var status_label: Label
var level_label: Label
var pixel_cells: Array[ColorRect] = []
var is_resolving := false

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


func _build_interface() -> void:
	var background := ColorRect.new()
	background.color = DEEP_VIOLET
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_top", 26)
	margin.add_theme_constant_override("margin_bottom", 24)
	add_child(margin)

	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 13)
	margin.add_child(page)

	var title := Label.new()
	title.text = "PIXEL PIGGIES"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 40)
	title.add_theme_color_override("font_color", WHITE)
	title.add_theme_color_override("font_shadow_color", CORAL)
	title.add_theme_constant_override("shadow_offset_x", 3)
	title.add_theme_constant_override("shadow_offset_y", 4)
	page.add_child(title)

	level_label = Label.new()
	level_label.text = "BLOOM GARDEN • LEVEL 1"
	level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	level_label.add_theme_font_size_override("font_size", 17)
	level_label.add_theme_color_override("font_color", SOFT_PURPLE)
	page.add_child(level_label)

	var instructions := Label.new()
	instructions.text = "Tap a piggie to pop pixels of its own color."
	instructions.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	instructions.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	instructions.add_theme_font_size_override("font_size", 17)
	instructions.add_theme_color_override("font_color", WHITE)
	page.add_child(instructions)

	var board_panel := PanelContainer.new()
	board_panel.custom_minimum_size = Vector2(0, 380)
	var board_style := StyleBoxFlat.new()
	board_style.bg_color = PANEL_VIOLET
	board_style.corner_radius_top_left = 32
	board_style.corner_radius_top_right = 32
	board_style.corner_radius_bottom_left = 32
	board_style.corner_radius_bottom_right = 32
	board_style.border_width_left = 3
	board_style.border_width_top = 3
	board_style.border_width_right = 3
	board_style.border_width_bottom = 3
	board_style.border_color = Color("#6A4AC9")
	board_style.content_margin_left = 22
	board_style.content_margin_right = 22
	board_style.content_margin_top = 28
	board_style.content_margin_bottom = 28
	board_panel.add_theme_stylebox_override("panel", board_style)
	page.add_child(board_panel)

	var board_center := CenterContainer.new()
	board_panel.add_child(board_center)

	board_grid = GridContainer.new()
	board_grid.columns = 6
	board_grid.add_theme_constant_override("h_separation", 7)
	board_grid.add_theme_constant_override("v_separation", 7)
	board_center.add_child(board_grid)

	status_label = Label.new()
	status_label.text = "THE BLOOM CONVEYOR IS READY"
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.add_theme_font_size_override("font_size", 19)
	status_label.add_theme_color_override("font_color", AQUA)
	page.add_child(status_label)

	var conveyor := ColorRect.new()
	conveyor.color = Color("#50378A")
	conveyor.custom_minimum_size = Vector2(0, 12)
	page.add_child(conveyor)

	var queue_title := Label.new()
	queue_title.text = "CHOOSE YOUR PIXEL PIGGIE"
	queue_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	queue_title.add_theme_font_size_override("font_size", 16)
	queue_title.add_theme_color_override("font_color", WHITE)
	page.add_child(queue_title)

	piggie_row = HBoxContainer.new()
	piggie_row.alignment = BoxContainer.ALIGNMENT_CENTER
	piggie_row.add_theme_constant_override("separation", 12)
	page.add_child(piggie_row)

	var restart_button := Button.new()
	restart_button.text = "RESTART LEVEL"
	restart_button.custom_minimum_size = Vector2(0, 50)
	restart_button.add_theme_font_size_override("font_size", 17)
	restart_button.pressed.connect(_start_level)
	page.add_child(restart_button)

	var footer := Label.new()
	footer.text = "PROTOTYPE 01 • MATCH • POP • BLOOM"
	footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	footer.add_theme_font_size_override("font_size", 13)
	footer.add_theme_color_override("font_color", SOFT_PURPLE)
	page.add_child(footer)


func _start_level() -> void:
	is_resolving = false
	status_label.text = "THE BLOOM CONVEYOR IS READY"
	status_label.add_theme_color_override("font_color", AQUA)
	level_label.text = "BLOOM GARDEN • LEVEL 1"

	for child in board_grid.get_children():
		child.queue_free()

	for child in piggie_row.get_children():
		child.queue_free()

	pixel_cells.clear()

	for color_name in level_layout:
		_create_pixel(color_name)

	_create_piggie_button("CORAL", 6)
	_create_piggie_button("AQUA", 6)
	_create_piggie_button("SUNSHINE", 6)


func _create_pixel(color_name: String) -> void:
	var cell := ColorRect.new()
	cell.color = color_values[color_name]
	cell.custom_minimum_size = Vector2(62, 62)
	cell.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cell.set_meta("pixel_color", color_name)
	cell.pivot_offset = Vector2(31, 31)

	var shine := Label.new()
	shine.text = "◆"
	shine.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shine.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	shine.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	shine.add_theme_font_size_override("font_size", 18)
	shine.add_theme_color_override("font_color", Color(1, 1, 1, 0.68))
	shine.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cell.add_child(shine)

	board_grid.add_child(cell)
	pixel_cells.append(cell)


func _create_piggie_button(color_name: String, ammo: int) -> void:
	var button := Button.new()
	button.text = "%s\nAMMO %d" % [color_name, ammo]
	button.custom_minimum_size = Vector2(142, 96)
	button.add_theme_font_size_override("font_size", 16)

	var normal_style := StyleBoxFlat.new()
	normal_style.bg_color = color_values[color_name]
	normal_style.corner_radius_top_left = 28
	normal_style.corner_radius_top_right = 28
	normal_style.corner_radius_bottom_left = 28
	normal_style.corner_radius_bottom_right = 28
	normal_style.border_width_left = 3
	normal_style.border_width_top = 3
	normal_style.border_width_right = 3
	normal_style.border_width_bottom = 3
	normal_style.border_color = WHITE
	button.add_theme_stylebox_override("normal", normal_style)

	var hover_style: StyleBoxFlat = normal_style.duplicate()
	hover_style.bg_color = color_values[color_name].lightened(0.15)
	button.add_theme_stylebox_override("hover", hover_style)

	var pressed_style: StyleBoxFlat = normal_style.duplicate()
	pressed_style.bg_color = color_values[color_name].darkened(0.12)
	button.add_theme_stylebox_override("pressed", pressed_style)

	button.add_theme_color_override("font_color", DEEP_VIOLET)
	button.add_theme_color_override("font_hover_color", DEEP_VIOLET)
	button.add_theme_color_override("font_pressed_color", DEEP_VIOLET)
	button.set_meta("used", false)
	button.pressed.connect(_launch_piggie.bind(color_name, ammo, button))
	piggie_row.add_child(button)


func _launch_piggie(color_name: String, ammo: int, button: Button) -> void:
	if is_resolving or bool(button.get_meta("used")):
		return

	is_resolving = true
	button.set_meta("used", true)
	_set_piggie_buttons_disabled(true)
	status_label.text = "%s PIGGIE IS BLOOMING!" % color_name
	status_label.add_theme_color_override("font_color", color_values[color_name])

	var matching_cells: Array[ColorRect] = []
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
		tween.tween_property(cell, "scale", Vector2(1.2, 1.2), 0.07)
		tween.tween_property(cell, "scale", Vector2.ZERO, 0.12)
		await tween.finished

		pixel_cells.erase(cell)
		cell.queue_free()
		await get_tree().create_timer(0.035).timeout

	if pixel_cells.is_empty():
		_show_victory()
	else:
		status_label.text = "PERFECT HIT! CHOOSE THE NEXT PIGGIE"
		status_label.add_theme_color_override("font_color", SUCCESS_GREEN)
		is_resolving = false
		_set_piggie_buttons_disabled(false)


func _set_piggie_buttons_disabled(disabled_state: bool) -> void:
	for child in piggie_row.get_children():
		if child is Button:
			var already_used := bool(child.get_meta("used"))
			child.disabled = disabled_state or already_used


func _show_victory() -> void:
	is_resolving = false
	status_label.text = "BLOOM BURST! LEVEL COMPLETE!"
	status_label.add_theme_color_override("font_color", SUNSHINE)
	level_label.text = "PERFECT FLOW • 3 STARS"
	_set_piggie_buttons_disabled(true)

	status_label.pivot_offset = status_label.size * 0.5
	var tween := create_tween()
	tween.set_loops(3)
	tween.tween_property(status_label, "scale", Vector2(1.08, 1.08), 0.12)
	tween.tween_property(status_label, "scale", Vector2.ONE, 0.12)

