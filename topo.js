/* =========================================
   ТОПОГРАФИЧЕСКИЙ ПАТТЕРН (MARCHING SQUARES)
   Реализует полноценную карту высот по всему экрану
   ========================================= */

(function() {
    const canvas = document.getElementById('topo-canvas');
    if (!canvas) { console.error("Topo canvas not found!"); return; }
    const ctx = canvas.getContext('2d');
    
    // --- НАСТРОЙКИ ---
    const GRID_SIZE = 10;       // Размер сетки (меньше = детальнее, но нагружает ЦП)
    const LINES_COUNT = 5;     // Количество уровней высоты (изолиний)
    const ANIMATION_SPEED = 0.002; // Скорость морфинга
    const LINE_WIDTH = 1.5;     // Толщина линий

    let width, height;
    let cols, rows;
    let zOff = 0; // Смещение по времени (3D измерение шума)
    let grid = [];

    // --- МИНИ-БИБЛИОТЕКА ШУМА (Simplex Noise Lite) ---
    // Это стандартный алгоритм для генерации плавных случайных значений
    const Noise = (function() {
        var p = new Uint8Array(256);
        for(var i=0; i<256; i++) p[i] = i;
        var perm = new Uint8Array(512);
        var permMod12 = new Uint8Array(512);
        for(var i=0; i<512; i++){
             var v = p[i & 255];
             perm[i] = v;
             permMod12[i] = v % 12;
        }
        // Перемешиваем таблицу перестановок (сид)
        for(var i=0; i<256; i++) {
            var r = (Math.random() * (256 - i) + i) | 0;
            var t = p[i]; p[i] = p[r]; p[r] = t;
            perm[i] = perm[i+256] = p[i];
            permMod12[i] = permMod12[i+256] = p[i] % 12;
        }

        var F3 = 1.0/3.0, G3 = 1.0/6.0;
        return {
            noise3D: function(x, y, z) {
                var n0, n1, n2, n3; 
                var s = (x+y+z)*F3; 
                var i = Math.floor(x+s), j = Math.floor(y+s), k = Math.floor(z+s);
                var t = (i+j+k)*G3; 
                var X0 = i-t, Y0 = j-t, Z0 = k-t;
                var x0 = x-X0, y0 = y-Y0, z0 = z-Z0;
                var i1, j1, k1, i2, j2, k2;
                if(x0>=y0) { if(y0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } else if(x0>=z0){ i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; } }
                else { if(y0<z0){ i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } else if(x0<z0){ i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } }
                var x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
                var x2 = x0 - i2 + 2.0*G3, y2 = y0 - j2 + 2.0*G3, z2 = z0 - k2 + 2.0*G3;
                var x3 = x0 - 1.0 + 3.0*G3, y3 = y0 - 1.0 + 3.0*G3, z3 = z0 - 1.0 + 3.0*G3;
                var ii = i & 255, jj = j & 255, kk = k & 255;
                
                function calc(idx, x, y, z) {
                    var t = 0.6 - x*x - y*y - z*z;
                    if(t < 0) return 0;
                    t *= t;
                    var gi = permMod12[idx] * 3;
                    var table = [1,1,0, -1,1,0, 1,-1,0, -1,-1,0, 1,0,1, -1,0,1, 1,0,-1, -1,0,-1, 0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1];
                    return t * t * (table[gi]*x + table[gi+1]*y + table[gi+2]*z);
                }
                
                n0 = calc(ii+perm[jj+perm[kk]], x0, y0, z0);
                n1 = calc(ii+i1+perm[jj+j1+perm[kk+k1]], x1, y1, z1);
                n2 = calc(ii+i2+perm[jj+j2+perm[kk+k2]], x2, y2, z2);
                n3 = calc(ii+1+perm[jj+1+perm[kk+1]], x3, y3, z3);
                return 32.0*(n0 + n1 + n2 + n3);
            }
        };
    })();

    // Линейная интерполяция для плавности линий
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    // Функция поиска координаты точки на ребре квадрата
    function getOffset(val1, val2, threshold) {
        // Если значения одинаковые, избегаем деления на ноль
        if (Math.abs(val1 - val2) < 0.00001) return 0.5;
        return (threshold - val1) / (val2 - val1);
    }

    // Основная функция отрисовки линии внутри одной клетки сетки (Marching Squares)
    function drawCell(i, j, threshold) {
        // Получаем значения шума в 4 углах клетки
        const v0 = grid[i][j];         // Top-Left
        const v1 = grid[i+1][j];       // Top-Right
        const v2 = grid[i+1][j+1];     // Bottom-Right
        const v3 = grid[i][j+1];       // Bottom-Left

        // Определяем битовую маску (какой угол выше порога?)
        let state = 0;
        if (v0 >= threshold) state |= 1;
        if (v1 >= threshold) state |= 2;
        if (v2 >= threshold) state |= 4;
        if (v3 >= threshold) state |= 8;

        if (state === 0 || state === 15) return; // Клетка полностью пустая или полная - не рисуем

        const x = i * GRID_SIZE;
        const y = j * GRID_SIZE;
        
        // Координаты точек на ребрах
        const a = { x: x + GRID_SIZE * getOffset(v0, v1, threshold), y: y };               // Top edge
        const b = { x: x + GRID_SIZE, y: y + GRID_SIZE * getOffset(v1, v2, threshold) };   // Right edge
        const c = { x: x + GRID_SIZE * getOffset(v3, v2, threshold), y: y + GRID_SIZE };   // Bottom edge
        const d = { x: x, y: y + GRID_SIZE * getOffset(v0, v3, threshold) };               // Left edge

        // Рисуем линии в зависимости от состояния
        // (Таблица переходов Marching Squares)
        ctx.beginPath();
        switch (state) {
            case 1:  ctx.moveTo(d.x, d.y); ctx.lineTo(a.x, a.y); break;
            case 2:  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); break;
            case 3:  ctx.moveTo(d.x, d.y); ctx.lineTo(b.x, b.y); break;
            case 4:  ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); break;
            case 5:  ctx.moveTo(d.x, d.y); ctx.lineTo(a.x, a.y); 
                     ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); break; // Седло
            case 6:  ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); break;
            case 7:  ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y); break;
            case 8:  ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y); break;
            case 9:  ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); break;
            case 10: ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); 
                     ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); break; // Седло
            case 11: ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); break;
            case 12: ctx.moveTo(d.x, d.y); ctx.lineTo(b.x, b.y); break;
            case 13: ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); break;
            case 14: ctx.moveTo(d.x, d.y); ctx.lineTo(a.x, a.y); break;
        }
        ctx.stroke();
    }

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        
        // Пересчитываем размер сетки + 1 ряд про запас
        cols = Math.floor(width / GRID_SIZE) + 1;
        rows = Math.floor(height / GRID_SIZE) + 1;
        
        // Инициализируем массив
        grid = new Array(cols + 1);
        for (let i = 0; i <= cols; i++) {
            grid[i] = new Float32Array(rows + 1);
        }
    }

    function animate() {
        // 1. Очистка
        ctx.clearRect(0, 0, width, height);
        
        // 2. Обновление смещения шума (анимация времени)
        zOff += ANIMATION_SPEED;
        
        // 3. Вычисление поля шума для всех узлов сетки
        // Масштаб шума (zoom) - чем меньше число, тем крупнее фигуры
        const noiseScale = 0.003; 
        
        for (let i = 0; i <= cols; i++) {
            for (let j = 0; j <= rows; j++) {
                // noise3D возвращает от -1 до 1, приводим к 0..1
                let val = Noise.noise3D(i * GRID_SIZE * noiseScale, j * GRID_SIZE * noiseScale, zOff);
                grid[i][j] = (val + 1) / 2; 
            }
        }

        // 4. Настройка стиля
        const style = getComputedStyle(document.documentElement);
        const accent = style.getPropertyValue('--accent').trim();
        ctx.strokeStyle = accent;
        ctx.lineWidth = LINE_WIDTH;
        
        // 5. Отрисовка изолиний (несколько уровней высоты)
        // Чтобы линии "сжимались", мы можем анимировать пороги, но проще двигать zOff
        // Рисуем линии для значений 0.2, 0.3, 0.4 ... 0.8
        
        for (let t = 0; t < LINES_COUNT; t++) {
            // Рассчитываем порог для текущей линии
            // Добавляем плавную модуляцию, чтобы линии "дышали"
            let threshold = (t + 1) / (LINES_COUNT + 1);
            
            // Прозрачность: края прозрачнее, центр ярче
            // Или просто общая прозрачность
            ctx.globalAlpha = 0.3; 
            
            // Проходим по всей сетке и рисуем фрагменты
            ctx.beginPath(); // Начинаем путь для ВСЕХ сегментов этого уровня (оптимизация)
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    drawCell(i, j, threshold);
                }
            }
            ctx.stroke(); // Рисуем всё разом
        }

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    
    // Запуск
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            resize();
            animate();
        });
    } else {
        resize();
        animate();
    }
})();