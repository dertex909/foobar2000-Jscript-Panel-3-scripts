// ==PREPROCESSOR==
// @name "Cosmic Rainbow VU Meter"
// @author "Case & Custom Mod"
// @import "%fb2k_component_path%helpers.txt"
// @import "%fb2k_component_path%samples\js\lodash.min.js"
// @import "%fb2k_component_path%samples\js\common.js"
// ==/PREPROCESSOR==

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================
var timer_interval = 1000 / 60;
var rms_window = 150 / 1000;
var peak_hold = 30;
var peak_fall_mul = 0.96;
var minDB = -60;
var maxDB = 5;

// ==========================================
// ПЕРЕМЕННЫЕ
// ==========================================
var properties = {
    rms_3db : new _p("2K3.METER.AES", false),
};

var RMS_levels = [0, 0];
var Peak_levels = [0, 0];
var Peak_falldown = [0, 0];
var ChannelNames = ["L", "R"];
var ww = 0, wh = 0, timer_id = 0, rms_db_offset = 0, dBrange = 0;
var time_offset = 0;
var stars = [];
var nebulas = [];

var font_main = null;
var font_label = null;

// ==========================================
// HSL TO RGB
// ==========================================
function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        var hue2rgb = function(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return RGB(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

function hslToRgba(h, s, l, a) {
    var r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        var hue2rgb = function(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return RGBA(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), a);
}

// ==========================================
// КОСМИЧЕСКИЕ ЦВЕТА
// ==========================================
function getCosmicColor(position, intensity, timeShift) {
    // position: 0-1 - позиция на шкале
    // intensity: 0-1 - общая громкость
    // При тишине - холодные синие/фиолетовые
    // При громкости - теплые розовые/красные
    
    var baseHue = 0.6; // Начинаем с синего
    
    // Смещаем hue в зависимости от позиции и громкости
    var hue = baseHue + position * 0.35 + intensity * 0.1;
    hue += Math.sin(timeShift * 0.5) * 0.03; // Легкое мерцание
    hue = hue % 1;
    if (hue < 0) hue += 1;
    
    var saturation = 0.75 + intensity * 0.25;
    var lightness = 0.35 + intensity * 0.3 + position * 0.15;
    
    return hslToRgb(hue, saturation, lightness);
}

function getCosmicColorAlpha(position, intensity, timeShift, alpha) {
    var baseHue = 0.6;
    var hue = baseHue + position * 0.35 + intensity * 0.1;
    hue += Math.sin(timeShift * 0.5) * 0.03;
    hue = hue % 1;
    if (hue < 0) hue += 1;
    
    var saturation = 0.75 + intensity * 0.25;
    var lightness = 0.35 + intensity * 0.3 + position * 0.15;
    
    return hslToRgba(hue, saturation, lightness, alpha);
}

function getSilenceColor(timeShift) {
    // Цвет при полной тишине - мерцающий темно-синий
    var hue = 0.65 + Math.sin(timeShift * 0.3) * 0.05;
    return hslToRgb(hue, 0.5, 0.15);
}

// ==========================================
// ЗВЕЗДЫ И ТУМАННОСТИ
// ==========================================
function initStars() {
    stars = [];
    for (var i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * ww,
            y: Math.random() * wh,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 2 + 0.5,
            phase: Math.random() * Math.PI * 2,
            hue: Math.random() * 0.3 + 0.5 // Синий-фиолетовый спектр
        });
    }
    
    nebulas = [];
    for (var j = 0; j < 5; j++) {
        nebulas.push({
            x: Math.random() * ww,
            y: Math.random() * wh,
            radius: Math.random() * 80 + 40,
            hue: Math.random() * 0.4 + 0.5,
            phase: Math.random() * Math.PI * 2
        });
    }
}

// ==========================================
// ИНИЦИАЛИЗАЦИЯ
// ==========================================
function init() {
    dBrange = maxDB - minDB;
    update_rms_offset();
    
    font_main = CreateFontString("Consolas", 12, 700);
    font_label = CreateFontString("Consolas", 10, 400);
    
    if (fb.IsPaused) update_graph();
    else if (fb.IsPlaying) start_timer();
}

function update_rms_offset() {
    rms_db_offset = properties.rms_3db.enabled ? (20 * Math.log(Math.sqrt(2)) / Math.LN10) : 0;
}

function clear_graph() {
    RMS_levels = [0, 0];
    Peak_levels = [0, 0];
    Peak_falldown = [0, 0];
    window.Repaint();
}

// ==========================================
// ОБРАБОТКА АУДИО (ТОЛЬКО 2 КАНАЛА)
// ==========================================
function update_graph() {
    var cur_time = fb.PlaybackTime;
    if (cur_time < rms_window) return;

    var chunk = fb.GetAudioChunk(rms_window);
    if (!chunk) return;

    var actual_channels = chunk.ChannelCount;
    var data = chunk.Data.toArray();
    var frame_len = chunk.SampleCount;

    if (data && actual_channels > 0 && frame_len > 0) {
		for (var c = 0; c < 2; ++c) {
			var src_ch = c;
			if (c >= actual_channels) src_ch = 0;
			
			var sum = 0;
			for (var i = src_ch; i < data.length; i += actual_channels) {
				var s = data[i];
				sum += s * s;
			}

			var rms = Math.sqrt(sum / frame_len);
			RMS_levels[c] = rms;

			if (rms >= Peak_levels[c]) {
				Peak_levels[c] = rms;
				Peak_falldown[c] = 0;
			} else {
				if (++Peak_falldown[c] > peak_hold) {
					Peak_levels[c] *= peak_fall_mul;
				}
			}
		}
        
        time_offset += 0.08;
        window.Repaint();
    }
}

function to_db(num) {
    if (num <= 0) return minDB;
    var db = 20 * Math.log(num) / Math.LN10;
    return Math.max(db, minDB);
}

// ==========================================
// ОТРИСОВКА
// ==========================================
function on_paint(gr) {
    // Космический фон
    drawCosmicBackground(gr);
    
    if (wh < 1 || ww < 1) return;

    // Общая интенсивность (для эффектов)
    var avgLevel = (RMS_levels[0] + RMS_levels[1]) / 2;
    var globalIntensity = _clamp((to_db(avgLevel) - minDB) / dBrange, 0, 1);

    // Layout
    var left_margin = 35;
    var right_margin = 100;
    var top_margin = 25;
    var bottom_margin = 25;
    var bar_area_w = ww - left_margin - right_margin;
    
    var ch_height = (wh - top_margin - bottom_margin) / 2;
    var bar_h = Math.floor(ch_height * 0.45);
    var bar_y_offset = Math.floor((ch_height - bar_h) / 2);

    // Сегменты
    var num_segments = 48;
    var seg_total_w = bar_area_w / num_segments;
    var seg_gap = 3;
    var seg_w = seg_total_w - seg_gap;
    if (seg_w < 2) { seg_w = 2; seg_gap = 1; }

    // Рисуем оба канала
    for (var c = 0; c < 2; ++c) {
        var y_pos = top_margin + (c * ch_height);
        var bar_y = y_pos + bar_y_offset;

        // Вычисления уровней
        var db_val = minDB;
        var peak_val_db = minDB;
        
        if (RMS_levels[c] > 0) {
            db_val = to_db(RMS_levels[c]) + rms_db_offset;
        }
        if (Peak_levels[c] > 0) {
            peak_val_db = to_db(Peak_levels[c]);
        }

        db_val = _clamp(db_val, minDB, maxDB);
        peak_val_db = _clamp(peak_val_db, minDB, maxDB);

        var active_ratio = (db_val - minDB) / dBrange;
        var active_segments = Math.floor(active_ratio * num_segments);
        
        // Свечение бара (подложка)
        if (active_segments > 0) {
            var glowWidth = active_segments * seg_total_w;
            var glowColor = getCosmicColorAlpha(active_ratio * 0.5, globalIntensity, time_offset + c, 40);
            gr.FillRectangle(left_margin - 5, bar_y - 8, glowWidth + 10, bar_h + 16, glowColor);
        }

        // Рисуем сегменты
        for (var i = 0; i < num_segments; i++) {
            var sx = left_margin + (i * seg_total_w);
            var seg_ratio = i / num_segments;

            if (i < active_segments) {
                // === АКТИВНЫЙ СЕГМЕНТ ===
                var color = getCosmicColor(seg_ratio, active_ratio, time_offset + c * 0.5);
                
                // Внешнее свечение
                var outerGlow = getCosmicColorAlpha(seg_ratio, active_ratio, time_offset, 60);
                gr.FillRectangle(sx - 2, bar_y - 4, seg_w + 4, bar_h + 8, outerGlow);
                
                // Среднее свечение
                var midGlow = getCosmicColorAlpha(seg_ratio, active_ratio, time_offset, 120);
                gr.FillRectangle(sx - 1, bar_y - 2, seg_w + 2, bar_h + 4, midGlow);
                
                // Основной сегмент
                gr.FillRectangle(sx, bar_y, seg_w, bar_h, color);
                
                // Яркий центр (блик)
                var coreColor = RGBA(255, 255, 255, 80 + Math.floor(active_ratio * 100));
                gr.FillRectangle(sx + 1, bar_y + 2, seg_w - 2, Math.floor(bar_h * 0.3), coreColor);
                
            } else {
                // === НЕАКТИВНЫЙ СЕГМЕНТ ===
                var dimColor = getSilenceColor(time_offset + i * 0.1);
                gr.FillRectangle(sx, bar_y, seg_w, bar_h, dimColor);
                
                // Тонкая рамка
                gr.DrawRectangle(sx, bar_y, seg_w, bar_h, 1, RGBA(60, 40, 100, 50));
            }
        }

        // === ПИК ===
        if (peak_val_db > minDB) {
            var peak_ratio = (peak_val_db - minDB) / dBrange;
            var px = left_margin + (peak_ratio * bar_area_w);
            px = _clamp(px, left_margin, left_margin + bar_area_w - 4);
            
            // Мощное свечение пика
            var peakHue = 0.85 + Math.sin(time_offset * 2) * 0.05; // Розово-фиолетовый
            gr.FillRectangle(px - 8, bar_y - 10, 18, bar_h + 20, hslToRgba(peakHue, 1, 0.5, 30));
            gr.FillRectangle(px - 4, bar_y - 6, 10, bar_h + 12, hslToRgba(peakHue, 1, 0.6, 80));
            gr.FillRectangle(px - 2, bar_y - 3, 6, bar_h + 6, hslToRgba(peakHue, 0.8, 0.8, 180));
            gr.FillRectangle(px, bar_y, 2, bar_h, RGBA(255, 255, 255, 255));
        }

        // === НАЗВАНИЕ КАНАЛА ===
        var labelColor = getCosmicColor(0.3, globalIntensity, time_offset + c);
        gr.WriteTextSimple(ChannelNames[c], font_label, labelColor, 5, bar_y, left_margin - 10, bar_h, 2, 2);

		// === ЦИФРОВОЕ ЗНАЧЕНИЕ ===
		var txt_db;
		if (db_val <= minDB) {
			txt_db = "-∞ dB";
		} else if (db_val > 0) {
			txt_db = "+" + db_val.toFixed(1) + " dB";
		} else {
			txt_db = db_val.toFixed(1) + " dB";
		}

		var dbColor;
		if (db_val > -3) {
			dbColor = hslToRgb(0.9, 1, 0.6);
		} else if (db_val > -20) {
			dbColor = getCosmicColor(0.7, active_ratio, time_offset);
		} else {
			dbColor = hslToRgb(0.6, 0.7, 0.5);
		}

		gr.WriteTextSimple(txt_db, font_main, dbColor, ww - right_margin + 5, bar_y, right_margin - 10, bar_h, 0, 2);
    }
    
    // Центральный разделитель с эффектом
    drawCenterLine(gr, top_margin + ch_height, globalIntensity);
    
    // Декоративная рамка
    drawFrame(gr, globalIntensity);
}

function drawCosmicBackground(gr) {
    // Глубокий космический градиент
    gr.FillRectangle(0, 0, ww, wh, RGB(5, 3, 15));
    
    // Туманности
    for (var n = 0; n < nebulas.length; n++) {
        var neb = nebulas[n];
        var pulse = Math.sin(time_offset * 0.3 + neb.phase) * 0.3 + 0.7;
        var alpha = Math.floor(15 * pulse);
        
        var nebColor = hslToRgba(neb.hue, 0.6, 0.3, alpha);
        
        // Несколько слоев для эффекта туманности
        for (var layer = 3; layer > 0; layer--) {
            var r = neb.radius * layer * 0.4;
            var a = Math.floor(alpha / layer);
            var layerColor = hslToRgba(neb.hue + layer * 0.05, 0.5, 0.2, a);
            gr.FillRectangle(neb.x - r, neb.y - r, r * 2, r * 2, layerColor);
        }
    }
    
    // Звезды
    for (var s = 0; s < stars.length; s++) {
        var star = stars[s];
        var twinkle = Math.sin(time_offset * star.speed + star.phase);
        var brightness = twinkle * 0.4 + 0.6;
        
        if (brightness > 0.3) {
            var alpha = Math.floor(brightness * 255);
            var starColor = hslToRgba(star.hue, 0.3, 0.9, alpha);
            
            // Ядро звезды
            gr.FillRectangle(star.x, star.y, star.size, star.size, starColor);
            
            // Свечение (для ярких звезд)
            if (brightness > 0.7 && star.size > 1) {
                var glowAlpha = Math.floor((brightness - 0.7) * 200);
                var glowColor = hslToRgba(star.hue, 0.5, 0.8, glowAlpha);
                gr.FillRectangle(star.x - 1, star.y - 1, star.size + 2, star.size + 2, glowColor);
            }
        }
    }
}

function drawCenterLine(gr, y, intensity) {
    var lineHue = 0.7 + intensity * 0.2;
    var alpha = Math.floor(30 + intensity * 50);
    
    // Размытая линия
    gr.FillRectangle(40, y - 2, ww - 80, 4, hslToRgba(lineHue, 0.8, 0.4, alpha));
    gr.FillRectangle(50, y - 1, ww - 100, 2, hslToRgba(lineHue, 0.9, 0.6, alpha + 30));
    gr.FillRectangle(60, y, ww - 120, 1, hslToRgba(lineHue, 1, 0.8, alpha + 50));
}

function drawFrame(gr, intensity) {
    var frameHue = 0.65 + intensity * 0.15;
    var alpha = Math.floor(40 + intensity * 40);
    
    // Внешняя рамка
    gr.DrawRectangle(2, 2, ww - 5, wh - 5, 1, hslToRgba(frameHue, 0.6, 0.3, alpha));
    
    // Угловые акценты
    var cornerSize = 15;
    var cornerColor = hslToRgba(frameHue + 0.1, 0.8, 0.5, alpha + 40);
    
    // Верхний левый
    gr.DrawLine(2, 2, 2 + cornerSize, 2, 2, cornerColor);
    gr.DrawLine(2, 2, 2, 2 + cornerSize, 2, cornerColor);
    
    // Верхний правый
    gr.DrawLine(ww - 3 - cornerSize, 2, ww - 3, 2, 2, cornerColor);
    gr.DrawLine(ww - 3, 2, ww - 3, 2 + cornerSize, 2, cornerColor);
    
    // Нижний левый
    gr.DrawLine(2, wh - 3, 2 + cornerSize, wh - 3, 2, cornerColor);
    gr.DrawLine(2, wh - 3 - cornerSize, 2, wh - 3, 2, cornerColor);
    
    // Нижний правый
    gr.DrawLine(ww - 3 - cornerSize, wh - 3, ww - 3, wh - 3, 2, cornerColor);
    gr.DrawLine(ww - 3, wh - 3 - cornerSize, ww - 3, wh - 3, 2, cornerColor);
}

// ==========================================
// СТАНДАРТНЫЕ ОБРАБОТЧИКИ
// ==========================================
function start_timer() {
    if (!timer_id) timer_id = window.SetInterval(update_graph, timer_interval);
}

function stop_timer() {
    if (timer_id) window.ClearInterval(timer_id);
    timer_id = 0;
}

function on_playback_new_track(handle) { start_timer(); }
function on_playback_pause(state) { state ? stop_timer() : start_timer(); }
function on_playback_stop(reason) { if (reason != 2) stop_timer(); clear_graph(); }

function on_size() {
    ww = window.Width;
    wh = window.Height;
    initStars();
}

function on_mouse_rbtn_up(x, y) {
    var menu = window.CreatePopupMenu();
    menu.AppendMenuItem(CheckMenuIf(properties.rms_3db.enabled), 1, 'Use AES +3dB RMS');
    menu.AppendMenuSeparator();
    menu.AppendMenuItem(MF_STRING, 2, 'Configure Component...');
    
    var idx = menu.TrackPopupMenu(x, y);
    menu.Dispose();

    switch (idx) {
        case 1:
            properties.rms_3db.toggle();
            update_rms_offset();
            window.Repaint();
            break;
        case 2:
            window.ShowConfigure();
            break;
    }
    return true;
}

function _clamp(val, min, max) { 
    return Math.min(Math.max(val, min), max); 
}

init();