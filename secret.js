/* =========================================
   SECRET RARE EFFECT (GOO GOO GAA GAA)
   Хаотичный текст, появляющийся повсюду
   ========================================= */

(function() {
    let canvas, ctx;
    let width, height;
    let texts = [];
    let animationFrameId;

    const PHRASES = [
        "GOO", 
        "GAA", 
        "GOO GOO", 
        "GAA GAA", 
        "GOO GOO GAA GAA"
    ];
    
    // Яркие, "детские" или кислотные цвета
    const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'];

    class CrazyText {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.text = PHRASES[Math.floor(Math.random() * PHRASES.length)];
            
            // Рандомный размер от маленького до гигантского
            this.size = Math.random() * 60 + 20; 
            
            this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
            
            // Быстрое движение
            this.speedX = (Math.random() - 0.5) * 15;
            this.speedY = (Math.random() - 0.5) * 15;
            
            this.rotation = (Math.random() - 0.5) * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.2;
            
            this.life = 1.0;
            this.decay = Math.random() * 0.03 + 0.01; // Скорость исчезновения
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.rotation += this.rotationSpeed;
            this.life -= this.decay;
            
            // Отскок от стен
            if (this.x < 0 || this.x > width) this.speedX *= -1;
            if (this.y < 0 || this.y > height) this.speedY *= -1;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            // Используем Comic Sans для комичности или Impact для веса
            ctx.font = `bold ${this.size}px "Comic Sans MS", "Impact", sans-serif`;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.life;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            // Эффект обводки для читаемости
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.strokeText(this.text, 0, 0);
            ctx.fillText(this.text, 0, 0);
            
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

        // Спавним новый текст очень часто
        if (Math.random() < 0.3) { 
            texts.push(new CrazyText());
        }

        for (let i = texts.length - 1; i >= 0; i--) {
            texts[i].update();
            texts[i].draw();
            if (texts[i].life <= 0) {
                texts.splice(i, 1);
            }
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    function init() {
        canvas = document.getElementById('secret-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        
        resize();
        window.addEventListener('resize', resize);
        
        texts = [];
        animate();
        
        // Пасхалка в консоль
        console.log("%c GOO GOO GAA GAA MODE ACTIVATED ", "background: #222; color: #bada55; font-size: 20px");
    }

    window.initSecretBackground = init;
})();