/* =========================================
   ULTRA RARE: KASANE TETO MODE (0.1%)
   EXTREMELY OPTIMIZED (Texture Caching)
   ========================================= */

(function() {
    let canvas, ctx;
    let width, height;
    let elements = [];
    let animationFrameId;

    const PHRASES = ["TETO", "0401", "KASANE", "CHIMERA", "FAKE DIVA", "🥖"];
    const COLORS = ['#D01328', '#FF0033', '#F2949C', '#FFFFFF', '#000000'];

    // Кэш для хранения готовых картинок с текстом
    const textureCache = {};

    // Функция создания текстуры текста (вызывается один раз для каждой комбинации)
    function createTextTexture(text, color) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Рисуем в большом размере для качества
        const fontSize = 100; 
        tempCtx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;
        
        // Вычисляем размер
        const metrics = tempCtx.measureText(text);
        const textWidth = metrics.width;
        // Примерная высота с запасом для обводки
        const textHeight = fontSize * 1.5; 
        
        tempCanvas.width = textWidth + 20; // +запас
        tempCanvas.height = textHeight;

        // Настраиваем контекст заново после ресайза
        tempCtx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;
        tempCtx.textAlign = "center";
        tempCtx.textBaseline = "middle";
        
        const centerX = tempCanvas.width / 2;
        const centerY = tempCanvas.height / 2;

        // Рисуем обводку
        if (color === '#000000' || color === '#D01328') {
            tempCtx.strokeStyle = color === '#000000' ? '#D01328' : 'black';
            tempCtx.lineWidth = 8; // Толще, так как разрешение больше
            tempCtx.strokeText(text, centerX, centerY);
        }

        // Рисуем заливку
        tempCtx.fillStyle = color;
        tempCtx.fillText(text, centerX, centerY);

        return tempCanvas;
    }

    // Предзагрузка кэша
    function initCache() {
        PHRASES.forEach(text => {
            COLORS.forEach(color => {
                const key = text + color;
                if (!textureCache[key]) {
                    textureCache[key] = createTextTexture(text, color);
                }
            });
        });
    }

    class TetoElement {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            
            const text = PHRASES[Math.floor(Math.random() * PHRASES.length)];
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            
            // Получаем готовую картинку из кэша
            this.texture = textureCache[text + color];
            
            // Базовая скорость
            this.speedX = (Math.random() - 0.5) * 20;
            this.speedY = (Math.random() - 0.5) * 20;
            
            // Масштаб отрисовки (так как текстура большая)
            // Исходный шрифт 100px, нам нужно от 20 до 80px
            const targetSize = Math.random() * 80 + 20;
            this.scale = targetSize / 100;
            
            if (text === "🥖") {
                this.scale *= 1.5;
            }

            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.2;
            
            this.life = 1.0;
            this.decay = Math.random() * 0.03 + 0.01;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.rotation += this.rotationSpeed;
            this.life -= this.decay;
            
            if (this.x < -100 || this.x > width + 100) this.speedX *= -1;
            if (this.y < -100 || this.y > height + 100) this.speedY *= -1;

            if (this.life <= 0) {
                this.reset();
            }
        }

        draw() {
            if (!this.texture) return;

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.scale(this.scale, this.scale); // Масштабируем картинку
            
            ctx.globalAlpha = this.life;
            // Рисуем картинку вместо текста - это очень быстро
            ctx.drawImage(this.texture, -this.texture.width / 2, -this.texture.height / 2);
            
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
        
        // Trail Effect
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(208, 19, 40, 0.15)'; 
        ctx.fillRect(0, 0, width, height);

        elements.forEach(el => {
            el.update();
            el.draw();
        });

        // GLITCH (Оптимизированный)
        // Делаем глитч реже и меньшими кусками
        if (Math.random() > 0.92) {
            const h = Math.random() * 30 + 10; // Меньшая высота полос
            const y = Math.random() * height;
            const offset = (Math.random() - 0.5) * 20; 
            
            try {
                // Копируем узкую полоску
                ctx.drawImage(canvas, 
                    0, y, width, h,       
                    offset, y, width, h   
                );
            } catch(e) {}
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    function init() {
        canvas = document.getElementById('teto-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d', { alpha: false }); // Отключаем прозрачность холста для скорости
        
        resize();
        window.addEventListener('resize', resize);
        
        // Инициализируем кэш перед созданием элементов
        initCache();
        
        elements = [];
        // 25 элементов достаточно для заполнения
        for(let i=0; i<25; i++) elements.push(new TetoElement());
        
        animate();
    }

    window.initTetoBackground = init;
})();