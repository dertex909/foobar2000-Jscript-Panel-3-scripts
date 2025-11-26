// ==PREPROCESSOR==
// @name "Minimal Controls - Cosmic + Codec Badge FINAL"
// @import "%fb2k_component_path%helpers.txt"
// @import "%fb2k_component_path%samples\js\lodash.min.js"
// @import "%fb2k_component_path%samples\js\common.js"
// @import "%fb2k_component_path%samples\js\panel.js"
// ==/PREPROCESSOR==

// ==========================================
// 1. НАСТРОЙКИ
// ==========================================
var colours = {
	buttons : RGB(255, 255, 255),
	contrast : RGB(196, 30, 35), 
	active_green: RGB(50, 255, 100),
	idle_red: RGB(255, 60, 60),
	
	// Цвета плашки
	badge_lossless: RGB(50, 255, 100),
	badge_lossy: RGB(255, 160, 0),
	badge_none: RGB(255, 60, 60),
	badge_bg: RGBA(0, 0, 0, 150)
};

var panel = new _panel();
var buttons = new _buttons();
var bs = _scale(24);
var tf_codec = fb.TitleFormat("%codec%");

// Анимация кнопок
var ANIM_DURATION_MS = 800; 
var FRAME_RATE_MS = 20;     
var fade_steps = Math.round(ANIM_DURATION_MS / FRAME_RATE_MS); 
var current_step_prev = fade_steps; 
var current_step_next = fade_steps; 
var anim_timer_buttons = null;
var start_rgb = [50, 255, 100]; 
var end_rgb = [255, 60, 60];    
var last_button_x = 0;

// ==========================================
// 2. КОСМОС
// ==========================================
var stars = [], nebulas = [];
var ww = 0, wh = 0, time_offset = 0, bg_timer = null;

function hslToRgba(h, s, l, a) {
    var r, g, b;
    if (s === 0) { r = g = b = l; } 
    else {
        var hue2rgb = function(p, q, t) {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
    }
    return RGBA(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), a);
}

function initStars() {
    stars = [];
    for (var i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * ww, y: Math.random() * wh,
            size: Math.random() * 2 + 0.5, speed: Math.random() * 2 + 0.5,
            phase: Math.random() * Math.PI * 2, hue: Math.random() * 0.3 + 0.5 
        });
    }
    nebulas = [];
    for (var j = 0; j < 4; j++) {
        nebulas.push({
            x: Math.random() * ww, y: Math.random() * wh,
            radius: Math.random() * 80 + 40, hue: Math.random() * 0.4 + 0.5,
            phase: Math.random() * Math.PI * 2
        });
    }
}

function drawCosmicBackground(gr) {
    gr.FillRectangle(0, 0, ww, wh, RGB(5, 3, 15));
    for (var n = 0; n < nebulas.length; n++) {
        var neb = nebulas[n];
        var pulse = Math.sin(time_offset * 0.3 + neb.phase) * 0.3 + 0.7;
        var alpha = Math.floor(15 * pulse);
        var nebColor = hslToRgba(neb.hue, 0.6, 0.3, alpha);
        for (var layer = 2; layer > 0; layer--) {
            var r = neb.radius * layer * 0.5;
            var a = Math.floor(alpha / layer);
            var layerColor = hslToRgba(neb.hue + layer * 0.05, 0.5, 0.2, a);
            gr.FillRectangle(neb.x - r, neb.y - r, r * 2, r * 2, layerColor);
        }
    }
    for (var s = 0; s < stars.length; s++) {
        var star = stars[s];
        var twinkle = Math.sin(time_offset * star.speed + star.phase);
        var brightness = twinkle * 0.4 + 0.6;
        if (brightness > 0.3) {
            var alpha = Math.floor(brightness * 255);
            var starColor = hslToRgba(star.hue, 0.3, 0.9, alpha);
            gr.FillRectangle(star.x, star.y, star.size, star.size, starColor);
        }
    }
}

function startCosmicTimer() {
    if (!bg_timer) {
        bg_timer = window.SetInterval(function() {
            time_offset += 0.05;
            window.Repaint();
        }, 30);
    }
}

// ==========================================
// 3. КНОПКИ
// ==========================================
var pbo_chars = [chars.repeat_one, chars.repeat_off, chars.random];
var pbo_names = ["Repeat Track", "Default", "Random"];
var pbo_real_index = [2, 0, 3]; 

window.MaxHeight = _scale(150);

function trigger_fade(direction) {
	if (direction === 'prev') current_step_prev = 0;
	if (direction === 'next') current_step_next = 0;
	if (!anim_timer_buttons) anim_timer_buttons = window.SetInterval(anim_tick_buttons, FRAME_RATE_MS);
	buttons.update();
}

function anim_tick_buttons() {
	var changes = false;
	if (current_step_prev < fade_steps) { current_step_prev++; changes = true; }
	if (current_step_next < fade_steps) { current_step_next++; changes = true; }
	if (changes) buttons.update(); 
	else { window.ClearInterval(anim_timer_buttons); anim_timer_buttons = null; }
}

function get_faded_color(step, total) {
	if (step >= total) return colours.idle_red; 
	var factor = step / total; 
	var r = start_rgb[0] + (end_rgb[0] - start_rgb[0]) * factor;
	var g = start_rgb[1] + (end_rgb[1] - start_rgb[1]) * factor;
	var b = start_rgb[2] + (end_rgb[2] - start_rgb[2]) * factor;
	return RGB(Math.round(r), Math.round(g), Math.round(b));
}

buttons.update = function () {
	var y = Math.round((panel.h - bs) / 2);
	var x = LM;

	var currentPbo = plman.PlaybackOrder;
	var pbo_index = pbo_real_index.indexOf(currentPbo);
	if(pbo_index === -1) pbo_index = 1; 

	this.buttons.pbo = new _button(x, y - 2, bs + 4, bs + 4,
		{ char: pbo_chars[pbo_index], colour: pbo_index === 1 ? setAlpha(colours.buttons, 60) : colours.contrast },
		null,
		function () {
			pbo_index++;
			if(pbo_index >= pbo_chars.length) pbo_index = 0;
			plman.PlaybackOrder = pbo_real_index[pbo_index];
			buttons.update();
		},
		'Playback Order: ' + pbo_names[pbo_index]
	);
	x += bs + _scale(6);

	this.buttons.stop = new _button(x, y, bs, bs, { char: chars.stop, colour: fb.StopAfterCurrent ? colours.contrast : colours.buttons }, null, function () { fb.Stop(); }, 'Stop'); 
	x += bs + _scale(6);
	
	var colPrev = get_faded_color(current_step_prev, fade_steps);
	this.buttons.previous = new _button(x, y, bs, bs, { char: chars.prev, colour: colPrev }, null, 
		function () { fb.Prev(); trigger_fade('prev'); }, 'Previous'
	); 
	x += bs + _scale(6);
	
	var isPlaying = fb.IsPlaying && !fb.IsPaused;
	var playColor = isPlaying ? colours.active_green : colours.idle_red;
	this.buttons.play = new _button(x, y, bs, bs, 
		{ char: !isPlaying ? chars.play : chars.pause, colour: playColor }, 
		null, function () { fb.PlayOrPause(); }, !isPlaying ? 'Play' : 'Pause'
	); 
	x += bs + _scale(6);
	
	var colNext = get_faded_color(current_step_next, fade_steps);
	this.buttons.next = new _button(x, y, bs, bs, { char: chars.next, colour: colNext }, null, 
		function () { fb.Next(); trigger_fade('next'); }, 'Next'
	);
	
	last_button_x = x + bs + _scale(12);
}

// ==========================================
// 4. ПЛАШКА (SAFE MODE v2)
// ==========================================
function drawCodecBadge(gr) {
    var codecText = "?";
    var badgeColor = colours.badge_none;
    
    if (fb.IsPlaying) {
        var codec = tf_codec.Eval();
        var c = codec.toLowerCase();
        codecText = codec;
        if (c == "flac" || c == "wav" || c == "pcm" || c == "alac" || c == "ape" || c == "dsd" || c == "wv") {
            badgeColor = colours.badge_lossless;
        } else {
            badgeColor = colours.badge_lossy;
        }
    }
    
    var h = _scale(20); 
    var y = Math.round((panel.h - h) / 2); 
    var x = last_button_x;
    var radius = h / 2;
    
    // Примерная ширина текста (8px на букву)
    var charWidth = _scale(8);
    var padding = _scale(20);
    var w = (codecText.length * charWidth) + padding;
    if (w < _scale(40)) w = _scale(40);
    
    // 1. Рисуем фон и рамку (GDI)
    gr.FillRoundedRectangle(x, y, w, h, radius, radius, colours.badge_bg);
    gr.DrawRoundedRectangle(x, y, w, h, radius, radius, 1, badgeColor);
    
    // 2. Формируем JSON для WriteText (ТОЧНО КАК В ПРИМЕРЕ)
    // Важно: это должен быть массив объектов!
    var len = codecText.length;
    
    var fontArr = [{
        Start: 0,
        Length: len,
        Name: "Segoe UI",
        Size: 11,
        Weight: 700
    }];
    
    var colArr = [{
        Start: 0,
        Length: len,
        Colour: badgeColor
    }];
    
    // Центрируем текст вручную, добавляя отступ (padding/2) к X
    // Так как WriteText в этой версии не поддерживает флаги выравнивания
    var textX = x + _scale(10); 
    var textY = y + _scale(2);  // Чуть вниз, чтобы было ровно
    
    // Вызов функции: Текст, JSON Шрифта, JSON Цвета, X, Y, W, H
    // БЕЗ флагов 2,2 в конце
    gr.WriteText(codecText, JSON.stringify(fontArr), JSON.stringify(colArr), textX, textY, w, h);
}

// ==========================================
// 5. EVENTS
// ==========================================
function on_mouse_lbtn_down(x, y) {}
function on_mouse_lbtn_up(x, y) { if (buttons.lbtn_up(x, y)) return; }
function on_mouse_leave() { buttons.leave(); }
function on_mouse_move(x, y) { window.SetCursor(IDC_ARROW); buttons.move(x, y); }
function on_mouse_rbtn_up(x, y) { 
	if (buttons.buttons.stop.containsXY(x, y)) { fb.StopAfterCurrent = !fb.StopAfterCurrent; return true; } 
	return panel.rbtn_up(x, y); 
}
function on_mouse_wheel(s) {}

function on_paint(gr) { 
    drawCosmicBackground(gr);
    buttons.paint(gr); 
    drawCodecBadge(gr);
}

function on_playback_dynamic_info_track() { window.Repaint(); } 
function on_playback_new_track() { buttons.update(); window.Repaint(); }
function on_playback_order_changed() { buttons.update(); }
function on_playback_pause() { buttons.update(); window.Repaint(); }
function on_playback_starting() { buttons.update(); window.Repaint(); }
function on_playback_stop() { buttons.update(); window.Repaint(); }
function on_playlist_stop_after_current_changed() { buttons.update(); }

function on_size() { 
    panel.size(); 
    ww = window.Width; wh = window.Height;
    initStars(); 
    buttons.update(); 
}

startCosmicTimer();