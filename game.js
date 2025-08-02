// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let lives = 3;
let level = 1;
let gameSpeed = 2;

// Player object
const player = {
    x: 50,
    y: canvas.height - 100,
    width: 32,
    height: 48,
    speed: 5,
    bullets: [],
    lastShot: 0,
    shootCooldown: 200,
    // Animation properties
    animationFrame: 0,
    animationSpeed: 0.2,
    isMoving: false,
    isShooting: false,
    shootAnimationTimer: 0,
    direction: 1 // 1 for right, -1 for left
};

// Game objects arrays
let enemies = [];
let explosions = [];
let powerUps = [];

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Bullet class
class Bullet {
    constructor(x, y, direction = 1, isPlayerBullet = true) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 4;
        this.speed = 8 * direction;
        this.isPlayerBullet = isPlayerBullet;
        this.color = isPlayerBullet ? '#ffff00' : '#ff0000';
    }

    update() {
        this.x += this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add bullet trail effect
        ctx.fillStyle = this.isPlayerBullet ? 'rgba(255, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(this.x - 5, this.y + 1, 5, 2);
    }
}

// Enemy class
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.width = 35;
        this.height = 35;
        this.speed = 0.5 + Math.random() * 1; // Reduced speed from 1-3 to 0.5-1.5
        this.health = type === 'basic' ? 1 : 3;
        this.maxHealth = this.health;
        this.type = type;
        this.color = type === 'basic' ? '#ff4444' : '#ff8800';
        this.bullets = [];
        this.lastShot = 0;
        this.shootCooldown = 1500 + Math.random() * 2500; // Slightly slower shooting
        this.movePattern = Math.random() < 0.5 ? 'straight' : 'wave';
        this.waveOffset = Math.random() * Math.PI * 2;
    }

    update() {
        // Movement patterns
        if (this.movePattern === 'straight') {
            this.x -= this.speed;
        } else {
            this.x -= this.speed;
            this.y += Math.sin(Date.now() * 0.003 + this.waveOffset) * 2;
        }

        // Keep enemies on screen vertically
        if (this.y < 0) this.y = 0;
        if (this.y > canvas.height - this.height) this.y = canvas.height - this.height;

        // Shooting
        if (Date.now() - this.lastShot > this.shootCooldown && this.x < canvas.width - 100) {
            this.shoot();
            this.lastShot = Date.now();
        }

        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.x > -bullet.width;
        });
    }

    shoot() {
        this.bullets.push(new Bullet(this.x - 10, this.y + this.height / 2, -1, false));
    }

    draw() {
        // Enemy body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Enemy details
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 5, this.y + 5, 8, 8);
        ctx.fillRect(this.x + 22, this.y + 5, 8, 8);
        
        // Health bar for stronger enemies
        if (this.maxHealth > 1) {
            const barWidth = this.width;
            const barHeight = 4;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x, this.y - 8, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x, this.y - 8, (this.health / this.maxHealth) * barWidth, barHeight);
        }

        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw());
    }

    takeDamage() {
        this.health--;
        return this.health <= 0;
    }
}

// Explosion class
class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.life = 40;
        
        // Create colorful particles with different types
        const colors = [
            '#FF0000', '#FF4500', '#FFD700', '#FFFF00', '#FF69B4',
            '#00FF00', '#00FFFF', '#0080FF', '#8A2BE2', '#FF1493',
            '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#DA70D6'
        ];
        
        // Main explosion particles
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 40,
                maxLife: 40,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 6 + 2,
                type: 'main'
            });
        }
        
        // Sparkle particles
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                maxLife: 30,
                color: '#FFFFFF',
                size: Math.random() * 3 + 1,
                type: 'sparkle'
            });
        }
        
        // Ring particles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 12,
                vy: Math.sin(angle) * 12,
                life: 25,
                maxLife: 25,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 4,
                type: 'ring'
            });
        }
    }

    update() {
        this.life--;
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Different physics for different particle types
            if (particle.type === 'main') {
                particle.vx *= 0.95;
                particle.vy *= 0.95;
                particle.vy += 0.2; // Gravity
            } else if (particle.type === 'sparkle') {
                particle.vx *= 0.98;
                particle.vy *= 0.98;
            } else if (particle.type === 'ring') {
                particle.vx *= 0.92;
                particle.vy *= 0.92;
            }
            
            particle.life--;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw() {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            ctx.globalAlpha = alpha;
            
            if (particle.type === 'sparkle') {
                // Draw sparkles as stars
                ctx.fillStyle = particle.color;
                const size = particle.size * alpha;
                ctx.fillRect(particle.x - size/2, particle.y - 1, size, 2);
                ctx.fillRect(particle.x - 1, particle.y - size/2, 2, size);
            } else {
                // Draw other particles as circles/squares
                ctx.fillStyle = particle.color;
                const size = particle.size * (particle.type === 'ring' ? alpha * 2 : 1);
                
                if (particle.type === 'ring') {
                    // Draw ring particles as hollow circles
                    ctx.strokeStyle = particle.color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.fillRect(particle.x - size/2, particle.y - size/2, size, size);
                }
            }
        });
        ctx.globalAlpha = 1;
    }
}

// Game functions
function startGame() {
    gameState = 'playing';
    document.getElementById('startScreen').style.display = 'none';
    resetGame();
    gameLoop();
}

function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    player.x = 50;
    player.y = canvas.height - 100;
    player.bullets = [];
    enemies = [];
    explosions = [];
    powerUps = [];
    updateUI();
}

function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    startGame();
}

function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('level').textContent = level;
}

function spawnEnemy() {
    const enemyType = Math.random() < 0.8 ? 'basic' : 'strong';
    const enemy = new Enemy(
        canvas.width,
        Math.random() * (canvas.height - 100) + 50,
        enemyType
    );
    enemies.push(enemy);
}

function updatePlayer() {
    // Reset movement flag
    player.isMoving = false;
    
    // Player movement
    if (keys['w'] && player.y > 0) {
        player.y -= player.speed;
        player.isMoving = true;
    }
    if (keys['s'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
        player.isMoving = true;
    }
    if (keys['a'] && player.x > 0) {
        player.x -= player.speed;
        player.isMoving = true;
        player.direction = -1; // Face left
    }
    if (keys['d'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
        player.isMoving = true;
        player.direction = 1; // Face right
    }

    // Player shooting
    if (keys[' '] && Date.now() - player.lastShot > player.shootCooldown) {
        const bulletX = player.direction === 1 ? player.x + player.width : player.x - 8;
        player.bullets.push(new Bullet(bulletX, player.y + player.height / 2, player.direction));
        player.lastShot = Date.now();
        player.isShooting = true;
        player.shootAnimationTimer = 10; // Animation duration
    }

    // Update player bullets
    player.bullets = player.bullets.filter(bullet => {
        bullet.update();
        return bullet.x > -bullet.width && bullet.x < canvas.width + bullet.width;
    });
}

function drawPlayerSprite(x, y, frame, isShooting) {
    const hoverOffset = Math.sin(frame * 0.3) * 3; // UFO hovering effect
    const ufoY = y + hoverOffset;
    
    ctx.save();
    
    // Flip sprite if facing left
    if (player.direction === -1) {
        ctx.scale(-1, 1);
        ctx.translate(-(x + player.width / 2) * 2, 0);
    }
    
    // UFO Base (bottom disc)
    ctx.fillStyle = '#C0C0C0'; // Silver
    ctx.fillRect(x - 8, ufoY + 25, 48, 8);
    
    // UFO Top dome
    ctx.fillStyle = '#E6E6FA'; // Light purple/silver
    ctx.fillRect(x + 4, ufoY + 15, 24, 10);
    ctx.fillRect(x + 8, ufoY + 10, 16, 5);
    
    // UFO lights (animated)
    const lightColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
    for (let i = 0; i < 5; i++) {
        const lightX = x - 4 + i * 8;
        const colorIndex = (Math.floor(frame * 0.5) + i) % lightColors.length;
        ctx.fillStyle = lightColors[colorIndex];
        ctx.fillRect(lightX, ufoY + 28, 4, 2);
    }
    
    // Player sitting in UFO
    // Head
    ctx.fillStyle = '#FDBCB4'; // Skin color
    ctx.fillRect(x + 12, ufoY + 5, 8, 8);
    
    // Hair
    ctx.fillStyle = '#8B4513'; // Brown hair
    ctx.fillRect(x + 10, ufoY + 3, 12, 4);
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 13, ufoY + 7, 1, 1);
    ctx.fillRect(x + 17, ufoY + 7, 1, 1);
    
    // Body (sitting)
    ctx.fillStyle = '#228B22'; // Dark green uniform
    ctx.fillRect(x + 10, ufoY + 13, 12, 12);
    
    // Arms
    ctx.fillStyle = '#FDBCB4';
    if (isShooting) {
        // Shooting pose from UFO
        ctx.fillRect(x + 22, ufoY + 15, 6, 3); // Right arm extended
        ctx.fillRect(x + 28, ufoY + 14, 4, 5); // Gun
        ctx.fillRect(x + 4, ufoY + 16, 3, 5); // Left arm
    } else {
        // Normal sitting arms
        ctx.fillRect(x + 22, ufoY + 16, 3, 5); // Right arm
        ctx.fillRect(x + 7, ufoY + 16, 3, 5); // Left arm
    }
    
    // UFO energy beam effect when moving
    if (player.isMoving) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.fillRect(x + 8, ufoY + 33, 16, 8);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(x + 12, ufoY + 35, 8, 4);
    }
    
    ctx.restore();
}

function drawPlayer() {
    // Update animation
    if (player.isMoving) {
        player.animationFrame += player.animationSpeed;
    }
    
    // Update shooting animation
    if (player.isShooting) {
        player.shootAnimationTimer--;
        if (player.shootAnimationTimer <= 0) {
            player.isShooting = false;
        }
    }
    
    // Draw the animated sprite
    drawPlayerSprite(player.x, player.y, player.animationFrame, player.isShooting);
    
    // Draw muzzle flash when shooting
    if (player.isShooting && player.shootAnimationTimer > 5) {
        ctx.fillStyle = '#FFFF00';
        const flashX = player.direction === 1 ? player.x + player.width + 5 : player.x - 10;
        ctx.fillRect(flashX, player.y + player.height / 2 - 2, 8, 4);
        
        ctx.fillStyle = '#FF8800';
        ctx.fillRect(flashX + 2, player.y + player.height / 2 - 1, 4, 2);
    }

    // Draw player bullets
    player.bullets.forEach(bullet => bullet.draw());
}

function checkCollisions() {
    // Player bullets vs enemies
    player.bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                
                // Remove bullet
                player.bullets.splice(bulletIndex, 1);
                
                // Damage enemy
                if (enemy.takeDamage()) {
                    explosions.push(new Explosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
                    enemies.splice(enemyIndex, 1);
                    score += enemy.type === 'basic' ? 100 : 300;
                }
            }
        });
    });

    // Enemy bullets vs player
    enemies.forEach(enemy => {
        enemy.bullets.forEach((bullet, bulletIndex) => {
            if (bullet.x < player.x + player.width &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.height &&
                bullet.y + bullet.height > player.y) {
                
                enemy.bullets.splice(bulletIndex, 1);
                lives--;
                explosions.push(new Explosion(player.x + player.width / 2, player.y + player.height / 2));
                
                if (lives <= 0) {
                    gameState = 'gameOver';
                    document.getElementById('finalScore').textContent = score;
                    document.getElementById('gameOver').style.display = 'block';
                }
            }
        });
    });

    // Player vs enemies (collision damage)
    enemies.forEach((enemy, enemyIndex) => {
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            
            explosions.push(new Explosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
            enemies.splice(enemyIndex, 1);
            lives--;
            
            if (lives <= 0) {
                gameState = 'gameOver';
                document.getElementById('finalScore').textContent = score;
                document.getElementById('gameOver').style.display = 'block';
            }
        }
    });
}

function updateGame() {
    if (gameState !== 'playing') return;

    updatePlayer();

    // Update enemies
    enemies.forEach(enemy => enemy.update());
    enemies = enemies.filter(enemy => enemy.x > -enemy.width);

    // Update explosions
    explosions.forEach(explosion => explosion.update());
    explosions = explosions.filter(explosion => explosion.life > 0);

    // Spawn enemies
    if (Math.random() < 0.02 + level * 0.005) {
        spawnEnemy();
    }

    // Level progression
    if (score > level * 1000) {
        level++;
        gameSpeed += 0.5;
    }

    checkCollisions();
    updateUI();
}

function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#228B22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 5; i++) {
        const x = (Date.now() * 0.02 + i * 200) % (canvas.width + 100);
        const y = 50 + i * 30;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 20, y, 30, 0, Math.PI * 2);
        ctx.arc(x + 40, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }

    if (gameState === 'playing') {
        drawPlayer();
        enemies.forEach(enemy => enemy.draw());
        explosions.forEach(explosion => explosion.draw());
    }
}

function gameLoop() {
    updateGame();
    drawGame();
    
    if (gameState === 'playing') {
        requestAnimationFrame(gameLoop);
    }
}

// Initialize the game
updateUI();
