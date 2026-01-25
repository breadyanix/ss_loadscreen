/* =========================================
   ЭФФЕКТ САКУРЫ (sakura.js)
   Падающие лепестки с физикой ветра
   ========================================= */

(function() {
    let canvas, ctx;
    let width, height;
    let petals = [];
    let animationFrameId;

    // Настройки
    const PETAL_COUNT = 150;     // Количество лепестков
    const GRAVITY = 2;        // Скорость падения
    const WIND = 2.5;           // Сила ветра

    class Petal {
        constructor() {
            this.reset();
            // Распределяем начальные позиции по всему экрану, а не только сверху
            this.y = Math.random() * height; 
        }

        reset() {
            this.x = Math.random() * width;
            this.y = -50; // Начинаем чуть выше экрана
            this.size = Math.random() * 5 + 3; // Размер лепестка
            this.speedY = Math.random() * 1 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.rotation = Math.random() * 360;
            this.rotationSpeed = (Math.random() - 0.5) * 2;
            this.oscillationSpeed = Math.random() * 0.05 + 0.02; // Скорость покачивания
            this.oscillationOffset = Math.random() * Math.PI * 2; // Фаза
            this.opacity = Math.random() * 0.5 + 0.3;
        }

        update() {
            // Движение вниз
            this.y += this.speedY * GRAVITY;
            
            // Движение по горизонтали (ветер + синусоида)
            this.x += this.speedX + Math.sin(this.y * 0.01 + this.oscillationOffset) * WIND;
            
            // Вращение
            this.rotation += this.rotationSpeed;

            // Если улетел вниз или далеко вбок — перерождаем
            if (this.y > height + 20 || this.x > width + 50 || this.x < -50) {
                this.reset();
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);
            
            // Используем акцентный цвет для лепестков
            const style = getComputedStyle(document.documentElement);
            const accent = style.getPropertyValue('--accent').trim();
            
            ctx.fillStyle = accent;
            ctx.globalAlpha = this.opacity;

            // Рисуем форму лепестка кривыми Безье
            ctx.beginPath();
            ctx.moveTo(0, 0);
            // Форма "сердечка" лепестка
            ctx.bezierCurveTo(this.size / 2, -this.size / 2, this.size, 0, 0, this.size);
            ctx.bezierCurveTo(-this.size, 0, -this.size / 2, -this.size / 2, 0, 0);
            ctx.fill();

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

        petals.forEach(petal => {
            petal.update();
            petal.draw();
        });

        animationFrameId = requestAnimationFrame(animate);
    }

    function init() {
        canvas = document.getElementById('sakura-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        
        resize();
        window.addEventListener('resize', resize);

        // Создаем лепестки
        petals = [];
        for (let i = 0; i < PETAL_COUNT; i++) {
            petals.push(new Petal());
        }

        animate();
    }

    // Экспорт функции
    window.initSakuraBackground = init;
})();