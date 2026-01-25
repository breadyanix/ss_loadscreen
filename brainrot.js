/* =========================================
   BRAINROT MODE (5% CHANCE)
   EXTREMELY OPTIMIZED (Texture Caching)
   ========================================= */

(function() {
    let canvas, ctx;
    let width, height;
    let elements = [];
    let animationFrameId;

    const SLANG = [
        "SKIBIDI", "GYATT", "RIZZ", "OHIO", "SIGMA", 
        "FANUM TAX", "MEWING", "COOKED", "BUSSIN", 
        "NO CAP", "SUS", "BRUH", "L + RATIO", "GRIMACE"
    ];
    
    const EMOJIS = ["💀", "😭", "🗿", "🚽", "🧢", "🤓", "🤡", "🔥", "🗣️"];
    const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

    const textureCache = {};

    // Создание текстуры
    function createContentTexture(content, color, isEmoji) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        const fontSize = 80; 
        // Для эмодзи используем стандартный шрифт, для текста - жирный
        const fontStack = isEmoji ? "serif" : '"Comic Sans MS", "Impact", sans-serif';
        tempCtx.font = `900 ${fontSize}px ${fontStack}`;
        
        const metrics = tempCtx.measureText(content);
        const w = metrics.width + 20;
        const h = fontSize * 1.5;
        
        tempCanvas.width = w;
        tempCanvas.height = h;

        // Сброс контекста после ресайза
        tempCtx.font = `900 ${fontSize}px ${fontStack}`;
        tempCtx.textAlign = "center";
        tempCtx.textBaseline = "middle";
        
        if (!isEmoji) {
            tempCtx.fillStyle = color;
            tempCtx.lineWidth = 6;
            tempCtx.strokeStyle = "black";
            tempCtx.strokeText(content, w/2, h/2);
            tempCtx.fillText(content, w/2, h/2);
        } else {
            // Эмодзи не красятся fillStyle, они сами по себе цветные
            tempCtx.fillText(content, w/2, h/2);
        }

        return tempCanvas;
    }

    function initCache() {
        // Кэшируем сленг
        SLANG.forEach(text => {
            COLORS.forEach(color => {
                const key = 'T_' + text + color;
                if (!textureCache[key]) {
                    textureCache[key] = createContentTexture(text, color, false);
                }
            });
        });
        // Кэшируем эмодзи (им цвет не нужен, ключ просто эмодзи)
        EMOJIS.forEach(emoji => {
            const key = 'E_' + emoji;
            if (!textureCache[key]) {
                textureCache[key] = createContentTexture(emoji, null, true);
            }
        });
    }

    class BrainrotElement {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            
            const isEmoji = Math.random() > 0.5;
            
            if (isEmoji) {
                const text = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
                this.texture = textureCache['E_' + text];
            } else {
                const text = SLANG[Math.floor(Math.random() * SLANG.length)];
                const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                this.texture = textureCache['T_' + text + color];
            }
            
            // Масштаб (исходник 80px)
            const size = Math.random() * 60 + 20;
            this.scale = size / 80;
            
            this.speedX = (Math.random() - 0.5) * 15;
            this.speedY = (Math.random() - 0.5) * 15;
            
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.4;
            
            this.jitter = Math.random() * 3; // Уменьшил джиттер для производительности
        }

        update() {
            // Простое движение
            this.x += this.speedX; 
            this.y += this.speedY;
            
            // Джиттер (дрожание) - применяем только визуально в draw, чтобы не сбивать координаты
            
            this.rotation += this.rotationSpeed;
            
            if (this.x < -100 || this.x > width + 100) { 
                this.speedX *= -1; 
            }
            if (this.y < -100 || this.y > height + 100) {
                this.speedY *= -1;
            }
        }

        draw() {
            if (!this.texture) return;

            ctx.save();
            
            // Применяем джиттер здесь
            const jX = (Math.random() - 0.5) * this.jitter;
            const jY = (Math.random() - 0.5) * this.jitter;
            
            ctx.translate(this.x + jX, this.y + jY);
            ctx.rotate(this.rotation);
            ctx.scale(this.scale, this.scale);
            
            ctx.drawImage(this.texture, -this.texture.width/2, -this.texture.height/2);
            
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
        
        // Trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
        ctx.fillRect(0, 0, width, height);

        // Редкое мигание (оптимизировано: просто цветной оверлей)
        if (Math.random() > 0.99) {
            ctx.fillStyle = COLORS[Math.floor(Math.random() * COLORS.length)];
            ctx.globalAlpha = 0.1;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1.0;
        }

        elements.forEach(el => {
            el.update();
            el.draw();
        });

        animationFrameId = requestAnimationFrame(animate);
    }

    function init() {
        canvas = document.getElementById('brainrot-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d', { alpha: false });
        
        resize();
        window.addEventListener('resize', resize);
        
        initCache();
        
        elements = [];
        // 35 объектов - оптимальный баланс хаоса и FPS
        for(let i=0; i<35; i++) elements.push(new BrainrotElement());
        
        animate();
    }

    window.initBrainrotBackground = init;
})();