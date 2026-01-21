(function() {
    const STAR_COUNT = 100;
    const BIG_STAR_COUNT = 24;
    const CONNECT_DISTANCE = 150;
    const BIG_CONNECT_DISTANCE = 250;
    const STAR_SPEED = 0.5;
    const STAR_BASE_COLOR = 'rgba(255, 255, 255, 0.8)';
    const BIG_STAR_COLOR = 'rgba(255, 255, 255, 0.4)';

    let canvas, ctx, width, height;
    let stars = [];
    let bigStars = [];
    let root = document.documentElement;

    class Star {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * STAR_SPEED;
            this.vy = (Math.random() - 0.5) * STAR_SPEED;
            this.radius = Math.random() * 1.2 + 0.3;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = STAR_BASE_COLOR;
            ctx.fill();
        }
    }

    class BigStar {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * (STAR_SPEED * 0.5);
            this.vy = (Math.random() - 0.5) * (STAR_SPEED * 0.5);
            this.baseRadius = Math.random() * 2 + 2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw() {
            const level = window.audioVisLevel || 0;
            const pulse = level * 8; 
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.baseRadius + pulse, 0, Math.PI * 2);
            ctx.fillStyle = BIG_STAR_COLOR;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, (this.baseRadius + pulse) * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
        }
    }

    function initStars() {
        canvas = document.getElementById('stars-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push(new Star());
        }
        
        for (let i = 0; i < BIG_STAR_COUNT; i++) {
            bigStars.push(new BigStar());
        }

        animate();
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    function getAccentColor(opacity) {
        const style = getComputedStyle(root);
        let accent = style.getPropertyValue('--accent').trim();
        
        if (accent.startsWith('#')) {
            let r = parseInt(accent.slice(1, 3), 16);
            let g = parseInt(accent.slice(3, 5), 16);
            let b = parseInt(accent.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        } else if (accent.startsWith('hsl')) {
            return accent.replace('hsl', 'hsla').replace(')', `, ${opacity})`);
        }
        return `rgba(255, 255, 255, ${opacity})`;
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < bigStars.length; i++) {
            bigStars[i].update();
            bigStars[i].draw();

            for (let j = 0; j < stars.length; j++) {
                let dx = bigStars[i].x - stars[j].x;
                let dy = bigStars[i].y - stars[j].y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < BIG_CONNECT_DISTANCE) {
                    let opacity = 1 - (dist / BIG_CONNECT_DISTANCE);
                    ctx.beginPath();
                    ctx.strokeStyle = getAccentColor(opacity * 0.4);
                    ctx.lineWidth = 0.6;
                    ctx.moveTo(bigStars[i].x, bigStars[i].y);
                    ctx.lineTo(stars[j].x, stars[j].y);
                    ctx.stroke();
                }
            }
        }

        for (let i = 0; i < stars.length; i++) {
            stars[i].update();
            stars[i].draw();

            for (let j = i + 1; j < stars.length; j++) {
                let dx = stars[i].x - stars[j].x;
                let dy = stars[i].y - stars[j].y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONNECT_DISTANCE) {
                    let opacity = 1 - (dist / CONNECT_DISTANCE);
                    ctx.beginPath();
                    ctx.strokeStyle = getAccentColor(opacity * 0.5);
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(stars[i].x, stars[i].y);
                    ctx.lineTo(stars[j].x, stars[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }

    window.initStarBackground = initStars;
})();