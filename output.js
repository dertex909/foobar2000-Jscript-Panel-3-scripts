// ==PREPROCESSOR==
// @name "Output Device Selector - Cosmic Style"
// @import "%fb2k_component_path%helpers.txt"
// @import "%fb2k_component_path%samples\js\lodash.min.js"
// @import "%fb2k_component_path%samples\js\common.js"
// @import "%fb2k_component_path%samples\js\panel.js"
// ==/PREPROCESSOR==

// ==========================================
// НАСТРОЙКИ
// ==========================================
var colours = {
    badge_active: RGB(50, 255, 100),
    badge_inactive: RGB(255, 160, 0),
    badge_bg: RGBA(0, 0, 0, 150),
    text_color: RGB(255, 255, 255)
};

var panel = new _panel();
var ww = 0, wh = 0, time_offset = 0, bg_timer = null;
var stars = [], nebulas = [];
var isHover = false;

window.MaxHeight = _scale(150);

// ==========================================
// КОСМОС
// ==========================================
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
// ПЛАШКА С УСТРОЙСТВОМ ВЫВОДА
// ==========================================
function drawOutputDevice(gr) {
    var deviceText = "Unknown";
    var badgeColor = colours.badge_inactive;
    
    // Получаем текущее устройство
    var str = fb.GetOutputDevices();
    var arr = JSON.parse(str);
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].active) {
            deviceText = arr[i].name;
            badgeColor = colours.badge_active;
            break;
        }
    }
    
    var h = _scale(24);           // <-- Высота плашки
    var fontSize = _scale(7);    // <-- Размер шрифта
    var padding = _scale(20);     // <-- Отступы
    var minWidth = _scale(150);   // <-- Минимальная ширина
    
    // УВЕЛИЧИВАЕМ коэффициент для ширины, чтобы текст точно помещался
    var estimatedCharWidth = fontSize * 0.8; // Было 0.6, стало 0.75
    var textWidth = deviceText.length * estimatedCharWidth;
    
    var w = textWidth + (padding * 2);
    
    // Ограничиваем ширину
    var maxWidth = ww * 0.9; // Было 0.85, стало 0.9
    if (w < minWidth) w = minWidth;
    if (w > maxWidth) w = maxWidth;
    
    // Центрируем плашку
    var x = Math.round((ww - w) / 2);
    var y = Math.round((wh - h) / 2);
    var radius = h / 2;
    
    // Подсветка при наведении
    var bgColor = isHover ? RGBA(0, 0, 0, 200) : colours.badge_bg;
    
    // Рисуем плашку
    gr.FillRoundedRectangle(x, y, w, h, radius, radius, bgColor);
    gr.DrawRoundedRectangle(x, y, w, h, radius, radius, _scale(2), badgeColor);
    
    // Рисуем текст
    var font = CreateFontString("Segoe UI", fontSize, 700);
    gr.WriteTextSimple(deviceText, font, badgeColor, x, y, w, h, 2, 2);
    
    // Сохраняем координаты для клика
    drawOutputDevice.x = x;
    drawOutputDevice.y = y;
    drawOutputDevice.w = w;
    drawOutputDevice.h = h;
}

// ==========================================
// МЕНЮ ВЫБОРА УСТРОЙСТВА
// ==========================================
function showDeviceMenu() {
    var menu = window.CreatePopupMenu();
    var str = fb.GetOutputDevices();
    var arr = JSON.parse(str);
    var active = -1;
    
    for (var i = 0; i < arr.length; i++) {
        menu.AppendMenuItem(MF_STRING, i + 1, arr[i].name);
        if (arr[i].active) active = i;
    }
    
    if (active > -1) menu.CheckMenuRadioItem(1, arr.length + 1, active + 1);
    
    var idx = menu.TrackPopupMenu(ww / 2, wh / 2);
    menu.Dispose();
    
    if (idx > 0) {
        fb.RunMainMenuCommand('Playback/Device/' + arr[idx - 1].name);
        window.Repaint();
    }
}

// ==========================================
// СОБЫТИЯ
// ==========================================
function on_paint(gr) {
    drawCosmicBackground(gr);
    drawOutputDevice(gr);
}

function on_mouse_move(x, y) {
    var wasHover = isHover;
    isHover = (x >= drawOutputDevice.x && x <= drawOutputDevice.x + drawOutputDevice.w &&
               y >= drawOutputDevice.y && y <= drawOutputDevice.y + drawOutputDevice.h);
    
    if (wasHover != isHover) window.Repaint();
    window.SetCursor(isHover ? IDC_HAND : IDC_ARROW);
}

function on_mouse_leave() {
    if (isHover) {
        isHover = false;
        window.Repaint();
    }
}

function on_mouse_lbtn_up(x, y) {
    if (isHover) {
        showDeviceMenu();
    }
}

function on_size() {
    panel.size();
    ww = window.Width;
    wh = window.Height;
    initStars();
}

function on_playback_dynamic_info_track() {
    window.Repaint();
}

// ==========================================
// ЗАПУСК
// ==========================================
startCosmicTimer();