/* =========================================
   MODE: SELF-PLAYING TOWER DEFENSE (FINAL V3)
   Support Dependency (No Ice/Traps without DPS)
   ========================================= */

(function() {
    let canvas, ctx;
    let width, height;
    let animationFrameId;

    // --- КОНФИГУРАЦИЯ БАШЕН ---
const TOWERS = {
        STANDARD: { id: 'std',  name: "Standard", damage: 3.5, cooldown: 50, range: 4, cost: 5,  color: '#3498db', type: 'single' },
        HEAVY:    { id: 'hvy',  name: "Heavy",    damage: 12,   cooldown: 155, range: 5, cost: 45, color: '#e74c3c', type: 'aoe', aoeRange: 3 },
        FAST:     { id: 'fst',  name: "Fast",     damage: 1,   cooldown: 5,  range: 6, cost: 150, color: '#f1c40f', type: 'single' },
        GOLD:     { id: 'gold', name: "Gold Gen", damage: 0,   cooldown: 300, range: 0, cost: 15,  color: '#ffd700', type: 'eco' },
        ICE:      { id: 'ice',  name: "Ice Tower",damage: 0,   cooldown: 10,  range: 6, cost: 40,  color: '#00cec9', type: 'aura' },
        TRAP:     { id: 'trap', name: "Trapper",  damage: 0,   cooldown: 180, range: 3, cost: 40,  color: '#8e44ad', type: 'spawner' },
        TACTIC:   { id: 'tac',  name: "Tactician",damage: 5,   cooldown: 120, range: 5, cost: 175, color: '#2c3e50', type: 'support', abilityCd: 420 }
    };

    // --- СОСТОЯНИЕ ИГРЫ ---
    let gameState = {
        gp: 90,
        round: 1,
        wave: 1,
        gridSize: 20,
        minPathLength: 15,
        cellSize: 0,
        grid: [], 
        path: [], 
        enemies: [],
        towers: [],
        traps: [],      
        projectiles: [],
        particles: [],
        waveTimer: 0,
        spawnTimer: 0,
        enemiesToSpawn: 0,
        enemiesSpawned: 0,
        waveActive: false
    };

    // --- КЛАССЫ ---

    class TrapEntity {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.uses = 5;
            this.hitList = []; 
        }
    }

    class Enemy {
        constructor(path) {
            this.id = Math.random().toString(36).substr(2, 9);
            this.pathIndex = 0;
            this.progress = 0;
            this.path = path;
            this.x = path[0].x;
            this.y = path[0].y;
            this.dead = false;
            
            const difficultyMult = 1 + (gameState.round - 1) * 0.6;
            this.maxHp = (10 * difficultyMult) + (gameState.wave * 3);
            this.hp = this.maxHp;
            this.baseSpeed = 0.05 + (gameState.round * 0.005); 
            this.speed = this.baseSpeed;
            this.radius = gameState.cellSize * 0.3;
            
            this.poisonStacks = 0;
            this.poisonTimer = 0;
            this.slowTimer = 0;
            this.markedTimer = 0; 
        }

        update() {
            if (this.poisonStacks > 0) {
                this.poisonTimer++;
                if (this.poisonTimer >= 30) {
                    this.takeDamage(0.5 * this.poisonStacks, true); 
                    this.poisonTimer = 0;
                    spawnParticles(this.x, this.y, '#2ecc71', 1);
                }
            }
            
            if (this.slowTimer > 0) {
                this.speed = this.baseSpeed * 0.4; 
                this.slowTimer--;
            } else {
                this.speed = this.baseSpeed;
            }

            if (this.markedTimer > 0) this.markedTimer--;

            if (this.pathIndex >= this.path.length - 1) {
                this.dead = true; 
                return;
            }

            const curr = this.path[this.pathIndex];
            const next = this.path[this.pathIndex + 1];
            const dist = Math.abs(next.x - curr.x) + Math.abs(next.y - curr.y);
            
            if (dist > 1.5) { // Портал
                this.progress += this.speed;
                if (this.progress >= 1.0) {
                    this.pathIndex++;
                    this.progress = 0;
                    this.x = next.x;
                    this.y = next.y;
                    spawnParticles(curr.x, curr.y, '#e67e22', 5);
                    spawnParticles(next.x, next.y, '#3498db', 5);
                } else {
                    this.x = curr.x;
                    this.y = curr.y;
                    this.radius = (gameState.cellSize * 0.3) * (1 - this.progress);
                }
            } else { // Обычный шаг
                this.progress += this.speed;
                if (this.progress >= 1) {
                    this.progress = 0;
                    this.pathIndex++;
                } else {
                    this.x = curr.x + (next.x - curr.x) * this.progress;
                    this.y = curr.y + (next.y - curr.y) * this.progress;
                }
                this.radius = gameState.cellSize * 0.3;
            }

            // Проверка ловушек
            for (let i = gameState.traps.length - 1; i >= 0; i--) {
                let t = gameState.traps[i];
                if (Math.abs(t.x - this.x) < 0.5 && Math.abs(t.y - this.y) < 0.5) {
                    if (!t.hitList.includes(this.id)) {
                        this.poisonStacks++;
                        t.uses--;
                        t.hitList.push(this.id);
                        spawnParticles(this.x, this.y, '#8e44ad', 3);
                        if (t.uses <= 0) {
                            gameState.traps.splice(i, 1);
                        }
                    }
                }
            }
        }

        draw() {
            const screenX = this.x * gameState.cellSize + gameState.cellSize/2;
            const screenY = this.y * gameState.cellSize + gameState.cellSize/2;
            
            if (this.slowTimer > 0) ctx.fillStyle = '#00cec9';
            else ctx.fillStyle = `hsl(${Math.min(120, (this.hp / this.maxHp) * 120)}, 100%, 50%)`;
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
            ctx.fill();

            if (this.markedTimer > 0) {
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(screenX - 5, screenY - 5); ctx.lineTo(screenX + 5, screenY + 5);
                ctx.moveTo(screenX + 5, screenY - 5); ctx.lineTo(screenX - 5, screenY + 5);
                ctx.stroke();
            }
            
            if (this.poisonStacks > 0) {
                ctx.fillStyle = '#2ecc71';
                ctx.beginPath();
                ctx.arc(screenX + 5, screenY - 5, 3, 0, Math.PI*2);
                ctx.fill();
            }
        }

        takeDamage(amount, isPure = false) {
            let finalDamage = amount;
            if (!isPure && this.markedTimer > 0) {
                finalDamage *= 1.5; 
            }
            this.hp -= finalDamage;
            if (this.hp <= 0) {
                this.hp = 0;
                this.dead = true;
                gameState.gp += 1;
                spawnParticles(this.x, this.y, '#fff', 5);
            }
        }
    }

    class Tower {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.cooldownTimer = 0;
            this.abilityTimer = 0; 
            this.angle = 0;
            this.boost = 1.0; 
        }

        update() {
            // Gold
            if (this.type.id === 'gold') {
                let neighbors = 0;
                gameState.towers.forEach(t => {
                    if (t !== this && t.type.id === 'gold') {
                        const dist = Math.abs(t.x - this.x) + Math.abs(t.y - this.y);
                        if (dist < 1.1) neighbors++;
                    }
                });
                
                this.boost = 1 + Math.min(0.60, neighbors * 0.15);
                this.cooldownTimer += this.boost;
                
                if (this.cooldownTimer >= this.type.cooldown) {
                    gameState.gp += 1;
                    this.cooldownTimer = 0;
                    spawnParticles(this.x, this.y, '#f1c40f', 3); 
                }
                return;
            }

            // Ice
            if (this.type.id === 'ice') {
                const rangeSq = this.type.range * this.type.range;
                let active = false;
                for (let enemy of gameState.enemies) {
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    if (dx*dx + dy*dy <= rangeSq) {
                        enemy.slowTimer = 300; 
                        active = true;
                    }
                }
                if (active && Math.random() < 0.1) spawnParticles(this.x, this.y, '#74b9ff', 1);
                return;
            }

            // Trapper
            if (this.type.id === 'trap') {
                this.cooldownTimer--;
                if (this.cooldownTimer <= 0) {
                    let spots = [];
                    const r = this.type.range;
                    const size = gameState.gridSize;
                    for(let i = -r; i <= r; i++) {
                        for(let j = -r; j <= r; j++) {
                            const tx = this.x + i;
                            const ty = this.y + j;
                            if (tx >= 0 && tx < size && ty >= 0 && ty < size && gameState.grid[tx][ty] === 1) {
                                spots.push({x: tx, y: ty});
                            }
                        }
                    }
                    
                    for(let k=0; k<3; k++) {
                        if (spots.length > 0) {
                            const idx = Math.floor(Math.random() * spots.length);
                            const spot = spots[idx];
                            gameState.traps.push(new TrapEntity(spot.x, spot.y));
                            spawnParticles(spot.x, spot.y, '#8e44ad', 2);
                            spots.splice(idx, 1);
                        }
                    }
                    this.cooldownTimer = this.type.cooldown;
                }
                return;
            }

            // Others
            if (this.cooldownTimer > 0) this.cooldownTimer--;
            
            if (this.type.id === 'tac') {
                if (this.abilityTimer > 0) this.abilityTimer--;
                else {
                    let target = null;
                    let maxHp = -1;
                    const rangeSq = this.type.range * this.type.range;
                    for (let enemy of gameState.enemies) {
                        const dist = (enemy.x - this.x)**2 + (enemy.y - this.y)**2;
                        if (dist <= rangeSq && enemy.hp > maxHp) {
                            maxHp = enemy.hp;
                            target = enemy;
                        }
                    }
                    if (target) {
                        target.markedTimer = 300; 
                        this.abilityTimer = this.type.abilityCd;
                        spawnParticles(target.x, target.y, '#e74c3c', 10);
                        gameState.particles.push(new ParticleLine(this.x, this.y, target.x, target.y, '#e74c3c'));
                    }
                }
            }

            if (this.cooldownTimer <= 0) {
                const target = this.findTarget();
                if (target) {
                    this.shoot(target);
                    this.cooldownTimer = this.type.cooldown;
                }
            }
        }

        findTarget() {
            let nearest = null;
            const rangeSq = this.type.range * this.type.range;
            for (let enemy of gameState.enemies) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                if (dx*dx + dy*dy <= rangeSq) {
                    if (!nearest || enemy.pathIndex > nearest.pathIndex) {
                        nearest = enemy;
                    }
                }
            }
            return nearest;
        }

        shoot(target) {
            gameState.projectiles.push(new Projectile(this.x, this.y, target, this.type));
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        }

        draw() {
            const cx = this.x * gameState.cellSize + gameState.cellSize/2;
            const cy = this.y * gameState.cellSize + gameState.cellSize/2;
            const size = gameState.cellSize * 0.8;
            ctx.save();
            ctx.translate(cx, cy);
            
            ctx.fillStyle = '#444';
            ctx.fillRect(-size/2, -size/2, size, size);
            
            if (this.type.id === 'gold' && this.boost > 1.0) {
                 ctx.strokeStyle = '#f1c40f';
                 ctx.lineWidth = 2;
                 gameState.towers.forEach(t => {
                    if (t !== this && t.type.id === 'gold') {
                        const dist = Math.abs(t.x - this.x) + Math.abs(t.y - this.y);
                        if (dist < 1.1) {
                            const dx = (t.x - this.x) * gameState.cellSize;
                            const dy = (t.y - this.y) * gameState.cellSize;
                            ctx.beginPath();
                            ctx.moveTo(0,0);
                            ctx.lineTo(dx, dy);
                            ctx.stroke();
                        }
                    }
                });
            }

            ctx.rotate(this.angle);
            ctx.fillStyle = this.type.color;

            switch(this.type.id) {
                case 'std':
                    ctx.fillRect(-size/4, -size/4, size/2, size/2);
                    ctx.fillRect(0, -size/6, size/2, size/3);
                    break;
                case 'hvy':
                    ctx.beginPath(); ctx.arc(0, 0, size/2.5, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#c0392b'; ctx.fillRect(-5, -5, 10, 10);
                    break;
                case 'fst':
                    ctx.beginPath(); ctx.moveTo(size/2, 0); ctx.lineTo(-size/3, size/3); ctx.lineTo(-size/3, -size/3); ctx.fill();
                    break;
                case 'gold':
                    ctx.fillStyle = '#f39c12';
                    ctx.fillRect(-size/3, -size/3, size/1.5, size/1.5);
                    ctx.fillStyle = '#f1c40f';
                    ctx.font = "bold 12px monospace";
                    ctx.textAlign = "center";
                    ctx.fillText("$", 0, 4); 
                    if (this.boost > 1) {
                         ctx.fillStyle = '#fff';
                         let dots = Math.round((this.boost - 1) / 0.15);
                         for(let i=0; i<dots; i++) ctx.fillRect(-6 + i*4, -size/2, 2, 2);
                    }
                    break;
                case 'ice':
                    ctx.fillStyle = '#74b9ff';
                    ctx.beginPath(); ctx.arc(0, 0, size/3, 0, Math.PI*2); ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, size/2, 0, Math.PI*2); ctx.stroke();
                    break;
                case 'trap':
                    ctx.fillStyle = '#8e44ad';
                    ctx.fillRect(-size/4, -size/4, size/2, size/2);
                    ctx.strokeStyle = '#9b59b6'; ctx.beginPath(); ctx.moveTo(-size/2, -size/2); ctx.lineTo(size/2, size/2); ctx.moveTo(size/2, -size/2); ctx.lineTo(-size/2, size/2); ctx.stroke();
                    break;
                case 'tac':
                    ctx.fillStyle = '#2c3e50';
                    ctx.fillRect(-size/3, -size/3, size/1.5, size/1.5);
                    ctx.fillStyle = 'red'; ctx.fillRect(0, -2, size/2, 4);
                    break;
            }
            ctx.restore();
        }
    }

    class Projectile {
        constructor(x, y, target, type) {
            this.x = x;
            this.y = y;
            this.target = target;
            this.type = type;
            this.speed = 0.5;
            this.active = true;
            this.targetX = target.x;
            this.targetY = target.y;
        }
        update() {
            if (!this.target.dead) { this.targetX = this.target.x; this.targetY = this.target.y; }
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < this.speed) this.hit();
            else { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
        }
        hit() {
            this.active = false;
            if (this.type.type === 'aoe') {
                spawnParticles(this.x, this.y, this.type.color, 10);
                const rangeSq = this.type.aoeRange * this.type.aoeRange;
                for (let enemy of gameState.enemies) {
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    if (dx*dx + dy*dy <= rangeSq) enemy.takeDamage(this.type.damage);
                }
            } else {
                if (!this.target.dead) this.target.takeDamage(this.type.damage);
            }
        }
        draw() {
            const screenX = this.x * gameState.cellSize + gameState.cellSize/2;
            const screenY = this.y * gameState.cellSize + gameState.cellSize/2;
            ctx.fillStyle = this.type.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, gameState.cellSize * 0.15, 0, Math.PI*2);
            ctx.fill();
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.life = 1.0;
            this.vx = (Math.random() - 0.5) * 0.1;
            this.vy = (Math.random() - 0.5) * 0.1;
        }
        update() { this.x += this.vx; this.y += this.vy; this.life -= 0.05; }
        draw() {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            const s = gameState.cellSize * 0.2 * this.life;
            const sx = this.x * gameState.cellSize + gameState.cellSize/2;
            const sy = this.y * gameState.cellSize + gameState.cellSize/2;
            ctx.fillRect(sx-s/2, sy-s/2, s, s);
            ctx.globalAlpha = 1.0;
        }
    }
    
    class ParticleLine {
        constructor(x1, y1, x2, y2, color) {
            this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
            this.color = color; this.life = 1.0;
        }
        update() { this.life -= 0.1; }
        draw() {
            ctx.globalAlpha = this.life;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const cs = gameState.cellSize;
            ctx.moveTo(this.x1*cs+cs/2, this.y1*cs+cs/2);
            ctx.lineTo(this.x2*cs+cs/2, this.y2*cs+cs/2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }

    function spawnParticles(x, y, color, count) { for(let i=0; i<count; i++) gameState.particles.push(new Particle(x, y, color)); }

    // --- ГЕНЕРАЦИЯ КАРТЫ ---
    function generateMap() {
        const size = gameState.gridSize;
        gameState.grid = Array(size).fill().map(() => Array(size).fill(0));
        gameState.towers = [];
        gameState.enemies = [];
        gameState.traps = []; 
        gameState.projectiles = [];
        gameState.particles = [];
        
        let path = [];
        let startSide = Math.floor(Math.random() * 4); 
        let start = {x: 0, y: 0};
        switch(startSide) {
            case 0: start = {x: Math.floor(Math.random()*(size-2))+1, y: 0}; break;
            case 1: start = {x: size-1, y: Math.floor(Math.random()*(size-2))+1}; break;
            case 2: start = {x: Math.floor(Math.random()*(size-2))+1, y: size-1}; break;
            case 3: start = {x: 0, y: Math.floor(Math.random()*(size-2))+1}; break;
        }
        
        let curr = {...start};
        path.push(curr);
        gameState.grid[curr.x][curr.y] = 1;

        while (true) {
            let onEdge = (curr.x === 0 || curr.x === size-1 || curr.y === 0 || curr.y === size-1);
            if (path.length > 1 && onEdge) {
                if (path.length >= gameState.minPathLength) break; 
            }

            let neighbors = [
                {x: curr.x+1, y: curr.y}, {x: curr.x-1, y: curr.y},
                {x: curr.x, y: curr.y+1}, {x: curr.x, y: curr.y-1}
            ].filter(n => n.x >= 0 && n.x < size && n.y >= 0 && n.y < size && gameState.grid[n.x][n.y] === 0);

            let validNeighbors = neighbors.filter(n => {
                let roadNeighbors = 0;
                const checkDirs = [{x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}];
                for(let d of checkDirs) {
                    const nx = n.x + d.x;
                    const ny = n.y + d.y;
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                        if (gameState.grid[nx][ny] === 1) roadNeighbors++;
                    }
                }
                return roadNeighbors === 1;
            });

            if (validNeighbors.length > 0) {
                let next = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
                path.push(next);
                gameState.grid[next.x][next.y] = 1;
                curr = next;
            } else {
                let potentialSpots = [];
                for(let i=1; i<size-1; i++) {
                    for(let j=1; j<size-1; j++) {
                        if (gameState.grid[i][j] === 0) potentialSpots.push({x:i, y:j});
                    }
                }
                if (potentialSpots.length > 0) {
                    let portalExit = potentialSpots[Math.floor(Math.random() * potentialSpots.length)];
                    path.push(portalExit);
                    gameState.grid[portalExit.x][portalExit.y] = 1;
                    curr = portalExit;
                } else {
                    break;
                }
            }
        }
        gameState.path = path;
    }

    // --- БОТ ---
    function getTowerCount(id) {
        return gameState.towers.filter(t => t.type.id === id).length;
    }

    function botUpdate() {
        // --- 1. ЛОГИКА ПРОДАЖИ (ОПТИМИЗАЦИЯ) ---
        // Если раунд сложный и нам не хватает денег на Heavy/Tactician, продаем Standard
        if (gameState.round >= 3 && gameState.gp < TOWERS.HEAVY.cost) {
            const stdTowers = gameState.towers.filter(t => t.type.id === 'std');
            
            // Если у нас есть Standard и продав один, мы сможем купить Heavy
            if (stdTowers.length > 0 && (gameState.gp + TOWERS.STANDARD.cost * 0.5) >= TOWERS.HEAVY.cost) {
                const toSell = stdTowers[0]; // Берем первый попавшийся (самый старый)
                const idx = gameState.towers.indexOf(toSell);
                if (idx > -1) {
                    gameState.grid[toSell.x][toSell.y] = 0; // Освобождаем клетку
                    gameState.gp += TOWERS.STANDARD.cost * 0.5; // Возврат 50%
                    gameState.towers.splice(idx, 1);
                    spawnParticles(toSell.x, toSell.y, '#f39c12', 5); // Эффект продажи
                    // После продажи сразу не строим, ждем следующего кадра чтобы обновился баланс
                    return; 
                }
            }
        }

        // --- 2. ЛОГИКА ПОКУПКИ ---
        let priorities = [];
        const MAX_SAME_TYPE = 7; 

        const canBuild = (type) => getTowerCount(type.id) < MAX_SAME_TYPE;

        // Контроль
        if (canBuild(TOWERS.ICE)) {
            if (getTowerCount('ice') < 2) {
                if (gameState.gp >= TOWERS.ICE.cost) priorities.push({ type: TOWERS.ICE, weight: 20 });
            } else if (gameState.enemies.length > 8) {
                 if (gameState.gp >= TOWERS.ICE.cost) priorities.push({ type: TOWERS.ICE, weight: 10 });
            }
        }

        if (canBuild(TOWERS.TRAP)) {
            if (getTowerCount('trap') < 3) {
                if (gameState.gp >= TOWERS.TRAP.cost) priorities.push({ type: TOWERS.TRAP, weight: 18 });
            } else {
                if (gameState.gp >= TOWERS.TRAP.cost) priorities.push({ type: TOWERS.TRAP, weight: 8 });
            }
        }

        // Экономика
        if (canBuild(TOWERS.GOLD)) {
            if (gameState.gp >= TOWERS.GOLD.cost) {
                if (getTowerCount('gold') < 5) priorities.push({ type: TOWERS.GOLD, weight: 16 });
                else priorities.push({ type: TOWERS.GOLD, weight: 4 });
            }
        }

        // Урон
        if (gameState.round >= 3) {
             if (canBuild(TOWERS.TACTIC) && gameState.gp >= TOWERS.TACTIC.cost) priorities.push({ type: TOWERS.TACTIC, weight: 12 });
             if (canBuild(TOWERS.HEAVY) && gameState.gp >= TOWERS.HEAVY.cost) priorities.push({ type: TOWERS.HEAVY, weight: 9 });
        }

        if (canBuild(TOWERS.FAST) && gameState.gp >= TOWERS.FAST.cost) priorities.push({ type: TOWERS.FAST, weight: 6 });
        if (canBuild(TOWERS.STANDARD) && gameState.gp >= TOWERS.STANDARD.cost) priorities.push({ type: TOWERS.STANDARD, weight: 2 });

        priorities.sort((a, b) => b.weight - a.weight);

        for (let p of priorities) {
            let tower = p.type;
            let validSpots = [];
            const size = gameState.gridSize;
            
            for(let x=0; x<size; x++) {
                for(let y=0; y<size; y++) {
                    if (gameState.grid[x][y] === 0) {
                        
                        // ДЛЯ ЗОЛОТА: Можно ставить везде
                        if (tower.id === 'gold') {
                            validSpots.push({x, y, score: Math.random()});
                        } 
                        // ДЛЯ ОСТАЛЬНЫХ: Нужна дорога рядом
                        else {
                            let hasRoad = false;
                            const neighbors = [{x:x+1,y:y}, {x:x-1,y:y}, {x:x,y:y+1}, {x:x,y:y-1}];
                            for(let n of neighbors) {
                                if (n.x>=0 && n.x<size && n.y>=0 && n.y<size && gameState.grid[n.x][n.y] === 1) {
                                    hasRoad = true; break;
                                }
                            }
                            if (hasRoad) {
                                validSpots.push({x, y, score: Math.random()}); 
                            }
                        }
                    }
                }
            }

            if (validSpots.length > 0) {
                // --- SCORING SYSTEM ---
                
                validSpots.forEach(s => {
                    // ЗОЛОТО: Кластеризация
                    if (tower.id === 'gold') {
                        let goldNeighbors = 0;
                        gameState.towers.forEach(t => {
                            if (t.type.id === 'gold') {
                                const dist = Math.abs(t.x - s.x) + Math.abs(t.y - s.y);
                                if (dist < 1.1) goldNeighbors++;
                            }
                        });
                        if (goldNeighbors > 0) s.score += 50 * goldNeighbors;
                        
                        // Штраф за место у дороги
                        let isRoadNear = false;
                        [{x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}].forEach(d => {
                             let nx = s.x+d.x, ny = s.y+d.y;
                             if(nx>=0 && nx<size && ny>=0 && ny<size && gameState.grid[nx][ny] === 1) isRoadNear = true;
                        });
                        if (isRoadNear) s.score -= 20; 
                    }

                    // ЛЕД/ТРАПЫ: Штраф за кучность (Anti-Clumping)
                    if (tower.id === 'ice' || tower.id === 'trap') {
                        gameState.towers.forEach(t => {
                            if (t.type.id === tower.id) { // Если тот же тип
                                const dist = Math.abs(t.x - s.x) + Math.abs(t.y - s.y);
                                if (dist < 5) s.score -= 1000; // ОГРОМНЫЙ ШТРАФ
                            }
                        });
                    }
                    
                    // --- НОВОЕ: ЗАВИСИМОСТЬ ПОДДЕРЖКИ ОТ УРОНА ---
                    if (['ice', 'trap'].includes(tower.id)) {
                        let shootersNearby = 0;
                        gameState.towers.forEach(t => {
                            if (['std', 'hvy', 'fst', 'tac'].includes(t.type.id)) {
                                const dist = Math.abs(t.x - s.x) + Math.abs(t.y - s.y);
                                if (dist <= 6) shootersNearby++; 
                            }
                        });
                        
                        // Если рядом нет стрелков - запрещаем строить (огромный штраф)
                        if (shootersNearby === 0) {
                            s.score -= 500;
                        } else {
                            // Если есть - поощряем
                            s.score += 20 * shootersNearby;
                        }
                    }
                    
                    // СИНЕРГИЯ СТРЕЛКОВ (Ищут контроль)
                    if (['std', 'hvy', 'fst', 'tac'].includes(tower.id)) {
                        gameState.towers.forEach(t => {
                            if (['ice', 'trap'].includes(t.type.id)) {
                                const dist = Math.abs(t.x - s.x) + Math.abs(t.y - s.y);
                                if (dist <= 6) s.score += 20; 
                            }
                        });
                    }
                });

                validSpots.sort((a, b) => b.score - a.score);
                
                // Проверка: если лучший скор слишком низкий (например, из-за штрафа -1000), не строим
                if (validSpots[0].score > -400) {
                    const spot = validSpots[0];
                    gameState.gp -= tower.cost;
                    gameState.grid[spot.x][spot.y] = 2;
                    gameState.towers.push(new Tower(spot.x, spot.y, tower));
                    spawnParticles(spot.x, spot.y, '#fff', 10);
                    break;
                }
            }
        }
    }

    // --- ЦИКЛ ---

    function startRound() {
        gameState.wave = 1;
        gameState.waveActive = true;
        startWave();
    }

    function startWave() {
        gameState.enemiesSpawned = 0;
        gameState.enemiesToSpawn = 5 + (gameState.round * 2) + (gameState.wave * 2);
        gameState.spawnTimer = 0;
        gameState.waveActive = true;
    }

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        const minDim = Math.min(width, height);
        gameState.cellSize = Math.floor((minDim * 0.8) / gameState.gridSize);
    }

    function update() {
        if (!gameState.waveActive) {
            gameState.waveTimer++;
            if (gameState.waveTimer > 100) {
                gameState.waveTimer = 0;
                
                gameState.gp += 50; // Бонус за волну
                
                gameState.wave++;
                if (gameState.wave > 5) {
                    gameState.round++;
                    gameState.towers.forEach(t => {
                        gameState.gp += Math.floor(t.type.cost * 0.5); 
                        spawnParticles(t.x, t.y, '#f1c40f', 5);
                    });
                    gameState.towers = [];
                    gameState.projectiles = [];
                    gameState.traps = [];
                    gameState.gp += 50;
                    gameState.gridSize += 2;
                    gameState.minPathLength += 5;
                    resize();
                    generateMap();
                    startRound();
                } else {
                    startWave();
                }
            }
            return;
        }

        if (gameState.enemiesSpawned < gameState.enemiesToSpawn) {
            gameState.spawnTimer++;
            if (gameState.spawnTimer > 40 - Math.min(30, gameState.round * 2)) {
                gameState.enemies.push(new Enemy(gameState.path));
                gameState.enemiesSpawned++;
                gameState.spawnTimer = 0;
            }
        } else if (gameState.enemies.length === 0) {
            gameState.waveActive = false;
        }

        botUpdate();
        gameState.enemies.forEach(e => e.update());
        gameState.enemies = gameState.enemies.filter(e => !e.dead);
        gameState.towers.forEach(t => t.update());
        gameState.projectiles.forEach(p => p.update());
        gameState.projectiles = gameState.projectiles.filter(p => p.active);
        gameState.particles.forEach(p => p.update());
        gameState.particles = gameState.particles.filter(p => p.life > 0);
    }

    function draw() {
        ctx.fillStyle = '#111'; 
        ctx.fillRect(0, 0, width, height);
        
        const mapW = gameState.gridSize * gameState.cellSize;
        const mapH = gameState.gridSize * gameState.cellSize;
        const offsetX = (width - mapW) / 2;
        const offsetY = (height - mapH) / 2;
        
        ctx.save();
        ctx.translate(offsetX, offsetY);

        // Сетка
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        for (let i=0; i<=gameState.gridSize; i++) {
            ctx.beginPath(); ctx.moveTo(i*gameState.cellSize, 0); ctx.lineTo(i*gameState.cellSize, mapH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i*gameState.cellSize); ctx.lineTo(mapW, i*gameState.cellSize); ctx.stroke();
        }

        // Дорога и Порталы
        for (let i = 0; i < gameState.path.length; i++) {
            let p = gameState.path[i];
            
            if (i < gameState.path.length - 1) {
                let next = gameState.path[i+1];
                let dist = Math.abs(next.x - p.x) + Math.abs(next.y - p.y);
                
                if (dist > 1.5) {
                    ctx.fillStyle = '#e67e22'; 
                    ctx.beginPath();
                    ctx.arc(p.x * gameState.cellSize + gameState.cellSize/2, p.y * gameState.cellSize + gameState.cellSize/2, gameState.cellSize/2, 0, Math.PI*2);
                    ctx.fill();
                    ctx.strokeStyle = '#d35400'; ctx.lineWidth = 3; ctx.stroke();

                    ctx.fillStyle = '#3498db'; 
                    ctx.beginPath();
                    ctx.arc(next.x * gameState.cellSize + gameState.cellSize/2, next.y * gameState.cellSize + gameState.cellSize/2, gameState.cellSize/2, 0, Math.PI*2);
                    ctx.fill();
                    ctx.strokeStyle = '#2980b9'; ctx.lineWidth = 3; ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                    ctx.setLineDash([5, 5]);
                    ctx.moveTo(p.x * gameState.cellSize + gameState.cellSize/2, p.y * gameState.cellSize + gameState.cellSize/2);
                    ctx.lineTo(next.x * gameState.cellSize + gameState.cellSize/2, next.y * gameState.cellSize + gameState.cellSize/2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    continue; 
                }
            }
            
            ctx.fillStyle = '#333';
            ctx.fillRect(p.x * gameState.cellSize, p.y * gameState.cellSize, gameState.cellSize, gameState.cellSize);
        }
        
        for (let t of gameState.traps) {
            ctx.fillStyle = 'rgba(142, 68, 173, 0.5)';
            ctx.beginPath();
            ctx.arc(t.x * gameState.cellSize + gameState.cellSize/2, t.y * gameState.cellSize + gameState.cellSize/2, gameState.cellSize/4, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 2; ctx.stroke();
        }

        const start = gameState.path[0];
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        ctx.arc(start.x * gameState.cellSize + gameState.cellSize/2, start.y * gameState.cellSize + gameState.cellSize/2, gameState.cellSize/1.5, 0, Math.PI*2);
        ctx.fill();

        const end = gameState.path[gameState.path.length-1];
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(end.x * gameState.cellSize + 5, end.y * gameState.cellSize + 5, gameState.cellSize - 10, gameState.cellSize - 10);

        gameState.towers.forEach(t => t.draw());
        gameState.enemies.forEach(e => e.draw());
        gameState.projectiles.forEach(p => p.draw());
        gameState.particles.forEach(p => p.draw());

        ctx.restore();

        // --- UI ---
        const infoX = offsetX + mapW + 30; 
        const infoY = offsetY;             

        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        
        ctx.font = "bold 24px 'Segoe UI', sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText(`ROUND: ${gameState.round}`, infoX, infoY);
        ctx.fillText(`WAVE: ${gameState.wave}`, infoX, infoY + 35); 
        
        ctx.fillStyle = "#f1c40f";
        ctx.fillText(`GP: ${Math.floor(gameState.gp)}`, infoX, infoY + 80); 

        ctx.font = "14px monospace";
        ctx.fillStyle = "#aaa";
        ctx.fillText("TOWER COSTS:", infoX, infoY + 120); 
        
        let currentListY = infoY + 145; 

        for (let key in TOWERS) {
            let t = TOWERS[key];
            ctx.fillStyle = t.color;
            ctx.font = "16px monospace"; 
            ctx.fillText(`■`, infoX, currentListY);
            
            ctx.fillStyle = "#ccc";
            ctx.font = "14px monospace";
            ctx.fillText(`${t.name}: ${t.cost}`, infoX + 25, currentListY);
            
            currentListY += 25; 
        }
    }

    function animate() {
        if (!canvas) return;
        update();
        draw();
        animationFrameId = requestAnimationFrame(animate);
    }

    function init() {
        canvas = document.getElementById('tower-defense-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        
        gameState.round = 1;
        gameState.gp = 90;
        gameState.gridSize = 20;
        gameState.minPathLength = 15;
        
        resize();
        generateMap();
        startRound();
        animate();
        console.log("Tower Defense Advanced Mode Activated");
    }

    window.initTowerDefenseBackground = init;
})();