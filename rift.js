/* =========================================
   ЭФФЕКТ РАЗЛОМА (RIFT) - OPTIMIZED
   Оптимизирован для большого количества объектов
   ========================================= */

(function() {
    let canvas, ctx;
    let width, height;
    let animationFrameId;

    // --- НАСТРОЙКИ (Ваши значения) ---
    const MAX_RIFTS = 130;         // Максимальное кол-во одновременных разломов
    const SPAWN_CHANCE = 0.250;   // Шанс появления (очень часто)
    const PARTICLE_SPEED = 5;     
    const JAGGEDNESS = 30;

    // Состояния
    const STATE_OPENING = 1;
    const STATE_ACTIVE = 2;
    const STATE_CLOSING = 3;
    const STATE_DEAD = 4;

    let rifts = [];
    let particles = [];
    
    // Кэш для шума (чтобы не генерировать его каждый кадр)
    let noiseCanvas;
    let noiseCtx;
    const NOISE_SIZE = 512; // Размер текстуры шума

    // --- ПРЕ-РЕНДЕР ШУМА (ОПТИМИЗАЦИЯ) ---
    function initNoiseTexture() {
        noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = NOISE_SIZE;
        noiseCanvas.height = NOISE_SIZE;
        noiseCtx = noiseCanvas.getContext('2d');
        
        // Получаем цвет темы
        const style = getComputedStyle(document.documentElement);
        const accent = style.getPropertyValue('--accent').trim();

        // Заполняем текстуру статикой один раз
        noiseCtx.fillStyle = 'rgba(0,0,0,0)'; // Прозрачный фон
        noiseCtx.clearRect(0, 0, NOISE_SIZE, NOISE_SIZE);
        
        const pixelsCount = 4000; // Количество точек на текстуре
        for (let i = 0; i < pixelsCount; i++) {
            const x = Math.random() * NOISE_SIZE;
            const y = Math.random() * NOISE_SIZE;
            const w = Math.random() * 4 + 1;
            const h = Math.random() * 2 + 1;
            
            const colRnd = Math.random();
            if (colRnd < 0.5) noiseCtx.fillStyle = '#FFFFFF';
            else if (colRnd < 0.8) noiseCtx.fillStyle = accent;
            else noiseCtx.fillStyle = '#000000';
            
            noiseCtx.globalAlpha = Math.random() * 0.8 + 0.2;
            noiseCtx.fillRect(x, y, w, h);
        }
    }

    // --- КЛАСС ЧАСТИЦЫ ---
    class Pixel {
        constructor(x, y, angle, color) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 3 + 1; // Чуть меньше размер для кучности
            this.life = 1.0;
            
            const spread = (Math.random() - 0.5) * 1.5; 
            const speed = Math.random() * PARTICLE_SPEED + 1;
            const side = Math.random() < 0.5 ? 1 : -1;
            
            this.vx = Math.cos(angle + Math.PI/2 * side + spread) * speed;
            this.vy = Math.sin(angle + Math.PI/2 * side + spread) * speed;
            
            this.color = color;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= 0.03; // Чуть быстрее исчезают, чтобы не засорять экран
            this.size *= 0.9;
        }

        draw() {
            // Рисуем просто квадратом (быстро)
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.life;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }

    // --- КЛАСС РАЗЛОМА ---
    class Rift {
        constructor() {
            this.state = STATE_OPENING;
            this.timer = 0;
            this.width = 0;
            
            // Немного уменьшил макс. ширину, чтобы при 30 штуках не было каши
            this.maxWidth = 15 + Math.random() * 25; 
            
            this.generateGeometry();
            
            const style = getComputedStyle(document.documentElement);
            this.accentColor = style.getPropertyValue('--accent').trim();
        }

        generateGeometry() {
            // Стараемся не спавнить совсем у краев
            const cx = width * 0.15 + Math.random() * width * 0.7;
            const cy = height * 0.15 + Math.random() * height * 0.7;
            
            this.angle = Math.random() * Math.PI * 2;
            // Длина чуть меньше для оптимизации места
            const len = Math.random() * 200 + 100; 
            
            this.x1 = cx - Math.cos(this.angle) * (len / 2);
            this.y1 = cy - Math.sin(this.angle) * (len / 2);
            this.x2 = cx + Math.cos(this.angle) * (len / 2);
            this.y2 = cy + Math.sin(this.angle) * (len / 2);
            
            this.points = [];
            // Меньше сегментов = быстрее отрисовка пути
            const segments = 10; 
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                let px = this.x1 + (this.x2 - this.x1) * t;
                let py = this.y1 + (this.y2 - this.y1) * t;
                
                if (i !== 0 && i !== segments) {
                    const offset = (Math.random() - 0.5) * JAGGEDNESS;
                    px += Math.cos(this.angle + Math.PI/2) * offset;
                    py += Math.sin(this.angle + Math.PI/2) * offset;
                }
                this.points.push({x: px, y: py});
            }
        }

        update() {
            switch (this.state) {
                case STATE_OPENING:
                    this.width += 2 + Math.random() * 3;
                    if (this.width >= this.maxWidth) {
                        this.state = STATE_ACTIVE;
                        this.timer = 0;
                    }
                    break;
                    
                case STATE_ACTIVE:
                    this.timer++;
                    
                    // Эмиттим частицы (реже, так как разломов много)
                    // При 30 разломах это все равно будет много частиц
                    if (Math.random() > 0.6) {
                        const randIdx = Math.floor(Math.random() * (this.points.length - 1));
                        const randPoint = this.points[randIdx];
                        particles.push(new Pixel(randPoint.x, randPoint.y, this.angle, this.accentColor));
                    }
                    
                    // Дрожание
                    this.currentWidth = this.maxWidth + (Math.random() - 0.5) * 10;
                    
                    // Живем меньше, чтобы динамика была выше
                    if (this.timer > 30 + Math.random() * 60) {
                        this.state = STATE_CLOSING;
                    }
                    break;
                    
                case STATE_CLOSING:
                    this.width *= 0.8;
                    if (this.width < 1) {
                        this.width = 0;
                        this.state = STATE_DEAD;
                    }
                    break;
            }
        }

        draw() {
            if (this.width < 1) return;
            const activeWidth = this.state === STATE_ACTIVE ? (this.currentWidth || this.width) : this.width;

            ctx.save();
            ctx.beginPath();
            
            // Строим полигон
            for (let i = 0; i < this.points.length; i++) {
                const p = this.points[i];
                const offsetX = Math.cos(this.angle + Math.PI/2) * (activeWidth / 2);
                const offsetY = Math.sin(this.angle + Math.PI/2) * (activeWidth / 2);
                if (i === 0) ctx.moveTo(p.x + offsetX, p.y + offsetY);
                else ctx.lineTo(p.x + offsetX, p.y + offsetY);
            }
            for (let i = this.points.length - 1; i >= 0; i--) {
                const p = this.points[i];
                const offsetX = Math.cos(this.angle - Math.PI/2) * (activeWidth / 2);
                const offsetY = Math.sin(this.angle - Math.PI/2) * (activeWidth / 2);
                ctx.lineTo(p.x + offsetX, p.y + offsetY);
            }
            ctx.closePath();
            
            // 1. Клиппинг
            ctx.clip();
            
            // 2. Отрисовка шума (ОПТИМИЗАЦИЯ: ОДИН ВЫЗОВ ВМЕСТО ЦИКЛА)
            // Рисуем текстуру шума со случайным смещением для эффекта анимации
            const offsetX = Math.random() * -200;
            const offsetY = Math.random() * -200;
            if (noiseCanvas) {
                // Рисуем текстуру, покрывая область (можно замостить или просто растянуть)
                // Для скорости просто рисуем большой кусок
                ctx.drawImage(noiseCanvas, offsetX, offsetY, NOISE_SIZE * 2, NOISE_SIZE * 2);
            }

            // Полоски (scanlines) - рисуем реже для скорости
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            // Рисуем только в области bounding box разлома (приблизительно)
            // Но clip() и так обрежет, так что просто несколько линий
            // Для оптимизации можно убрать или упростить
            
            ctx.restore();
            
            // 3. Обводка (Glow)
            // При 30 разломах shadowBlur может быть тяжелым.
            // Если лагает - уменьшите shadowBlur или уберите его.
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let p of this.points) ctx.lineTo(p.x, p.y);
            
            ctx.strokeStyle = this.accentColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.shadowBlur = 8; // Уменьшил с 15 до 8 для производительности
            ctx.shadowColor = this.accentColor;
            ctx.stroke();
            ctx.restore();
        }
    }

    function resize() {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function animate() {
        if (!canvas || !ctx) return;
        
        // Используем clearRect, это быстрее всего
        ctx.clearRect(0, 0, width, height);

        // 1. Спавн
        // При высоком шансе (0.1) спавним несколько за раз, если нужно
        if (rifts.length < MAX_RIFTS && Math.random() < SPAWN_CHANCE) {
            rifts.push(new Rift());
        }

        // 2. Отрисовка разломов
        // Рисуем все разломы. Для оптимизации батчинга цветов здесь нет,
        // так как каждый разлом имеет clip(), но это неизбежно.
        for (let i = rifts.length - 1; i >= 0; i--) {
            let r = rifts[i];
            r.update();
            r.draw();
            if (r.state === STATE_DEAD) {
                rifts.splice(i, 1);
            }
        }

        // 3. Отрисовка частиц
        // Оптимизация: один beginPath для всех частиц одного цвета (сложно, т.к. прозрачность разная)
        // Но Canvas быстро рисует rects.
        ctx.globalAlpha = 1.0;
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.update();
            p.draw();
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
        ctx.globalAlpha = 1.0;

        animationFrameId = requestAnimationFrame(animate);
    }

    function init() {
        canvas = document.getElementById('rift-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        
        initNoiseTexture(); // Создаем текстуру шума
        resize();
        window.addEventListener('resize', resize);
        
        rifts = [];
        particles = [];
        rifts.push(new Rift()); // Спавним первый сразу

        animate();
    }

    window.initRiftBackground = init;
})();