const canvas = document.getElementById('canvas');
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');

let jumpingKeyDown = false;
// Mouse / tap events
canvas.addEventListener('mousedown', (e) => jumpingKeyDown = true);
canvas.addEventListener('mouseup', (e) => jumpingKeyDown = false);
window.addEventListener('keyup', (e) => { if (e.code === "Space") jumpingKeyDown = false; });
window.addEventListener('keydown', (e) => { if (e.code === "Space") jumpingKeyDown = true; });

function drawImage(imageSrc, x, y, w, h) {
    const image = new Image();
    image.src = imageSrc;
    ctx.drawImage(image, x, y, w, h);
}

class Game {
    constructor() {
        this.debug = false;

        this.fps = 0;
        this.delta = 1;
        this.times = [];

        this.state = 0; // 0 = start, 1 = playing, 2 = stop
        this.speed = 0.5;
        this.player = new Player();
        this.obstacles = [ new Obstacle(Math.random() * 50, true) ];
    }

    gameLoop() {
        this._framesPerSecond();
        
        if (this.state == 0) this._start();
        else if (this.state == 1) this._playing();
        else if (this.state == 2) this._stop();
 
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    setState(state) {
        this.state = state;
    }

    _showDebug() {
        const drawText = (text, x, y) => {
            ctx.fillStyle = "#2c2c2c";
            ctx.font = "18px Arial";
            ctx.fillText(text, x, y);
        }
        drawText("Speed: " + this.speed, 10, 18);
        drawText("FPS: " + this.fps, 10, 36);
        drawText("HitBox: " + this.player.hitbox, 10, 54);
        drawText("Obstacle HitBox: " + this.obstacles[0].hitbox, 10, 72);
        drawText("Obstacle Index: " + this.obstacles[0].imageIndex, 10, 90);
        drawText("Obstacle List Length: " + this.obstacles.length, 10, 108);
        this.player.hitbox.debug();
        this.obstacles[0].hitbox.debug();
    }

    _framesPerSecond() {
        const now = performance.now();
        while (this.times.length > 0 && this.times[0] <= now - 1000)
            this.times.shift();
        this.times.push(now);
        this.fps = this.times.length;
        this.delta = 60 / this.fps;
    }

    _start() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fcfcfc';
        ctx.font = '32px Arial';
        ctx.fillText("CLICK / TAP TO START", canvas.width / 2 - ctx.measureText("CLICK / TAP TO START").width / 2, canvas.height / 2 - 6);
        window.addEventListener("click", (e) => {
            this.speed = 0.5;
            this.player = new Player();
            this.obstacles = [ new Obstacle(Math.random() * 50, true) ];
            this.state = 1;
        }, { once: true });
    }

    _playing() {
        this.state = 1;
        ctx.fillStyle = "#4464a0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#2c2c2c";
        ctx.font = "32px Arial";
        ctx.fillText(this.player.score, canvas.width - ctx.measureText(this.player.score).width - 32 / 4, 32);

        if (HitBox.isColliding(this.player.hitbox, this.obstacles[0].hitbox))
            this._stop();

        this.player.update(this.speed, this.delta);
        if (this.times.length > 100) {
            this.obstacles.forEach((obstacle) => {
                obstacle.update(this.speed, this.delta);
                if (obstacle.x + obstacle.size < 0) {
                    this.obstacles.push(new Obstacle(Math.random() * 50, true));
                    this.obstacles.shift();
                }
            });
        }

        this.speed += this.speed * 0.000005 + 0.00005;
        if (this.debug) this._showDebug();
    }

    _stop() {
        this.state = 2;
        ctx.fillStyle = '#2c2c2c';
        ctx.strokeStyle = "";
        ctx.fillRect(canvas.width / 4, canvas.height / 4, canvas.width / 2, canvas.height / 2);
    
        ctx.fillStyle = '#fff';
        ctx.font = "48px Arial";
        ctx.fillText("YOU LOSE", canvas.width / 2 - ctx.measureText("YOU LOSE").width / 2, canvas.height / 2 - 48);
    
        ctx.font = "32px Arial";
        ctx.fillText(this.player.score, canvas.width / 2 - ctx.measureText(this.player.score).width / 2, canvas.height / 2 - 6);
    
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4c4c4c';
        ctx.fillRect(canvas.width / 2 - ctx.measureText("CLICK / TAP TO RESTART").width / 2 - 10, canvas.height / 2 + 50, ctx.measureText("CLICK / TAP TO RESTART").width + 20, 50);
        
        ctx.fillStyle = '#000';
        ctx.fillText("CLICK / TAP TO RESTART", canvas.width / 2 - ctx.measureText("CLICK / TAP TO RESTART").width / 2, canvas.height / 2 + 50 + 35)
    
        window.addEventListener("mousedown", (e) => {
            if (this.state == 2) {
                this.speed = 0.5;
                this.player = new Player();
                this.obstacles = [ new Obstacle(Math.random() * 50, true) ];
                this.state = 1;
            }
        });
    }
}

class Player {
    constructor() {
        this.score = 0;
        this.size = 128;
        this.y = 0;
        this.gravity = 1.2;
        this.y_vel = 0;
        this.jump_pow = 25;
    }

    get hitbox() {
        return new HitBox(20, canvas.height - 128 - this.y + 15, this.size - 43, this.size - 30);
    }

    _jump(delta) {
        if (jumpingKeyDown && this.y == 0) this.y_vel = this.jump_pow
        this.y += this.y_vel * delta;

        if (this.y > 0.0) this.y_vel -= this.gravity * delta;
        else this.y = 0.0;
    }

    update(speed, delta) {
        this._jump(delta);

        ctx.save();
        ctx.translate(128, 0);
        ctx.scale(-1, 1);
        drawImage("./assets/tux.png", 0, canvas.height - 128 - this.y, 128, 128);
        ctx.restore();

        this.score += this.score * speed;
    }
}

class Obstacle {
    constructor(xOffset,d) {
        this.y = 0;
        this.size = 128;
        this.scale = 16;
        this.x = canvas.width + xOffset;
        this.imageIndex = Math.floor(Math.random() * 4);
        this.debug = d;
    }

    get hitbox() {
        return new HitBox(
            this.x + this.scale / 2, 
            canvas.height - this.size - this.y + this.scale / 2, 
            this.size - this.scale / 2, 
            this.size - this.scale / 2, "#0ff000cc"
            );
    }

    _move(speed) {
        this.x -= 10 * speed;
    }

    update(speed) {
        this._move(speed);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(this.x + this.scale / 2, canvas.height - this.size - this.y + this.scale / 2, this.size - this.scale / 2, this.size - this.scale / 2);
        drawImage(`./assets/${this.imageIndex}.png`, this.x + this.scale / 2, canvas.height - this.size - this.y + this.scale / 2, this.size - this.scale / 2, this.size - this.scale / 2);
    }
}

class HitBox {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.w = width;
        this.h = height;
    }

    debug() {
        ctx.fillStyle = "#ff000088";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = "#0000ff88";
        ctx.strokeRect(this.x, this.y, this.w, this.h);
    }

    toString() {
        return `x=${this.x}, y=${this.y}, w=${this.w}, h=${this.h}`;
    }

    static isColliding(hitbox1, hitbox2) {
        return hitbox1.x < hitbox2.x + hitbox2.w && // right
            hitbox1.w + hitbox1.x > hitbox2.x && // left
            hitbox1.y < hitbox2.y + hitbox2.h && // bottom
            hitbox1.y + hitbox1.h > hitbox2.y; // top
    }

}

const game = new Game();
game.gameLoop()