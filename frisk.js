/* =========================================
   MODE: FRISK / UNDERTALE (1% CHANCE)
   "You are filled with DETERMINATION."
   ========================================= */

(function() {
    let canvas, ctx;
    let width, height;
    let hearts = [];
    let animationFrameId;

    // Пиксельная сетка сердца (11x10)
    const HEART_GRID = [
        [0,1,1,0,0,0,1,1,0],
        [1,1,1,1,0,1,1,1,1],
        [1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,0,0,0],
        [0,0,0,0,1,0,0,0,0]
    ];
    
    // Цвета
    const COLOR_HEART = '#FF0000'; // Красная душа
    const COLOR_TEXT = '#FFFF00';  // Желтый текст сохранения
    const PIXEL_SIZE = 4;          // Размер одного "пикселя" внутри сердца

    // Состояния
    const ST_FLYING = 0;
    const ST_SHATTERING = 1;
    const ST_ASSEMBLING = 2;
    const ST_COOLDOWN = 3;

    class HeartParticle {
        constructor(x, y) {
            this.homeX = x; // Куда должен вернуться
            this.homeY = y;
            this.x = x;     // Текущая позиция (относительно центра сердца)
            this.y = y;
            this.vx = 0;
            this.vy = 0;
        }
    }

    class Soul {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
            
            this.scale = Math.random() * 0.5 + 0.5; // Размер сердца
            this.state = ST_FLYING;
            this.timer = Math.random() * 200; // Случайная задержка перед разломом
            
            // Создаем частицы из грида
            this.particles = [];
            const cols = HEART_GRID[0].length;
            const rows = HEART_GRID.length;
            const offsetX = (cols * PIXEL_SIZE) / 2;
            const offsetY = (rows * PIXEL_SIZE) / 2;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (HEART_GRID[r][c] === 1) {
                        // Координаты относительно центра сердца
                        const px = c * PIXEL_SIZE - offsetX;
                        const py = r * PIXEL_SIZE - offsetY;
                        this.particles.push(new HeartParticle(px, py));
                    }
                }
            }
        }

        update() {
            // Движение всего объекта
            if (this.state === ST_FLYING || this.state === ST_COOLDOWN) {
                this.x += this.vx;
                this.y += this.vy;
                
                // Отскок
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }

            switch (this.state) {
                case ST_FLYING:
                    this.timer++;
                    if (this.timer > 300) { // Пора ломаться
                        this.state = ST_SHATTERING;
                        this.timer = 0;
                        this.shatter();
                    }
                    break;

                case ST_SHATTERING:
                    this.timer++;
                    // Частицы разлетаются
                    for (let p of this.particles) {
                        p.x += p.vx;
                        p.y += p.vy;
                        p.vy += 0.2; // Гравитация для осколков
                    }
                    
                    if (this.timer > 60) {
                        this.state = ST_ASSEMBLING;
                        this.timer = 0;
                    }
                    break;

                case ST_ASSEMBLING:
                    let allAssembled = true;
                    const speed = 0.15; // Скорость сборки
                    
                    for (let p of this.particles) {
                        // Lerp обратно домой
                        p.x += (p.homeX - p.x) * speed;
                        p.y += (p.homeY - p.y) * speed;
                        
                        // Если хотя бы одна частица далеко, еще не собрались
                        if (Math.abs(p.x - p.homeX) > 0.5 || Math.abs(p.y - p.homeY) > 0.5) {
                            allAssembled = false;
                        } else {
                            // Притягиваем точно, чтобы не дрожало
                            p.x = p.homeX;
                            p.y = p.homeY;
                        }
                    }

                    if (allAssembled) {
                        this.state = ST_COOLDOWN;
                        this.timer = 0;
                    }
                    break;
                    
                case ST_COOLDOWN:
                    this.timer++;
                    // Показываем текст "Решимость" пока мы только что собрались
                    if (this.timer > 100) {
                        this.state = ST_FLYING;
                        this.timer = 0;
                    }
                    break;
            }
        }

        shatter() {
            // Раздаем случайные скорости частицам для взрыва
            for (let p of this.particles) {
                p.vx = (Math.random() - 0.5) * 10;
                p.vy = (Math.random() - 1.0) * 10; // Больше вверх
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(this.scale, this.scale);

            // Рисуем частицы
            ctx.fillStyle = COLOR_HEART;
            for (let p of this.particles) {
                // Рисуем квадратные пиксели
                ctx.fillRect(p.x, p.y, PIXEL_SIZE, PIXEL_SIZE);
            }

            // Если мы собираемся или только собрались - рисуем текст
            if (this.state === ST_ASSEMBLING || this.state === ST_COOLDOWN) {
                // Эффект мигания текста при сборке
                const alpha = this.state === ST_ASSEMBLING ? Math.random() : 1.0 - (this.timer / 100);
                
                ctx.globalAlpha = alpha;
                ctx.font = 'bold 24px "Courier New", monospace'; // Моноширинный шрифт похож на пиксельный
                ctx.fillStyle = COLOR_TEXT;
                ctx.textAlign = "center";
                // Текст над сердцем
                ctx.fillText("РЕШИМОСТЬ", 0, -30);
            }

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
        ctx.clearRect(0, 0, width, height);

        hearts.forEach(h => {
            h.update();
            h.draw();
        });

        animationFrameId = requestAnimationFrame(animate);
    }

    function init() {
        canvas = document.getElementById('frisk-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        
        resize();
        window.addEventListener('resize', resize);
        
        hearts = [];
        // 15 сердец достаточно
        for(let i=0; i<15; i++) hearts.push(new Soul());
        
        animate();
        console.log("%c DETERMINATION ", "background: black; color: yellow; font-size: 20px; font-weight: bold;");
    }

    window.initFriskBackground = init;
})();