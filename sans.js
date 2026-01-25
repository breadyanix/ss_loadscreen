/* =========================================
   MODE: SANS GENOCIDE (0.5% CHANCE)
   GIF VERSION
   ========================================= */

(function() {
    let canvas, ctx;
    let width, height;
    let animationFrameId;

    const PHRASES = [
        "какой прекрасный день снаружи.",
        "птички поют, цветочки благоухают...",
        "в такие дни, дети как ты...",
        "Д О Л Ж Н Ы   Г О Р Е Т Ь   В   А Д У.",
        "хочешь неприятностей?",
        "гееееет данкд он!!!",
        "просто сдайся.",
        "ты чувствуешь, как грехи ползут по спине."
    ];

    let currentPhrase = "";

    function resize() {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function drawText() {
        // Находим элемент с гифкой, чтобы понять, где рисовать текст
        const img = document.getElementById('sans-gif');
        let imgBottom = height / 2 + 100; // Дефолтная позиция если картинки нет
        
        if (img && img.style.display !== 'none') {
            const rect = img.getBoundingClientRect();
            imgBottom = rect.bottom;
        }

        // Динамический размер шрифта
        const fontSize = Math.max(24, height * 0.04);
        ctx.font = `bold ${fontSize}px "Comic Sans MS", "Arial", sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        
        // Рисуем текст чуть ниже картинки
        const textY = imgBottom + 20;
        
        // Обводка для читаемости
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 5;
        ctx.strokeText(currentPhrase, width / 2, textY);
        ctx.fillText(currentPhrase, width / 2, textY);
    }

    function animate() {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, width, height);

        drawText();

        animationFrameId = requestAnimationFrame(animate);
    }

    function init() {
        canvas = document.getElementById('sans-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        
        resize();
        window.addEventListener('resize', resize);
        
        currentPhrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
        
        animate();
        console.log("%c * You feel your sins crawling on your back. ", "background: black; color: white; font-size: 16px; padding: 5px;");
    }

    window.initSansBackground = init;
})();