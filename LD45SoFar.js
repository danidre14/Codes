const gameVars = {};
const panel = new GamePanel("gameArea", { dimensions: { width: 500, height: 450 }, name: "Brawler Game" });
const WIDTH = panel.canvasWidth();
const HEIGHT = panel.canvasHeight();
const SCALE = WIDTH / HEIGHT;

let PAUSED = true;
let musicStopped = false;

let init = true;

const lW = 10, lH = 9;

const stage = panel.getCanvas();
const screen = stage.getContext('2d');
screen.mozImageSmoothingEnabled = false;
screen.webkitImageSmoothingEnabled = false;
screen.msImageSmoothingEnabled = false;
screen.imageSmoothingEnabled = false;


const playerMaxHealth = 100;
const bounceDistance = 20;
const defaultPunchStrength = 24;
const defaultWallStrength = 55;
const crosshairSize = 30;
let playerHealth = playerMaxHealth;
let playerX = 0;
let playerY = 0;
const playerW = 50;
const playerH = 50;
let playerBX = 0;
let playerBY = 0;
let playerDead = false;
let punchStrength = defaultPunchStrength;
let wallStrength = defaultWallStrength;
let playerReach = 45;

const scoreEnemyDead = 69;
const scoreEnemyHit = 3;
const scorePotionPickup = 11;
const scorePackagePickup = 42;

const adjuster = 900;

let movingLeft = false;
let movingRight = false;
let movingUp = false;
let movingDown = false;
let doingAction = false;
let crosshairCord = { x: 0, y: 0 };
let mouseCords = { x: 0, y: 0 };
let punchBack = [];

let score = 0;
let potions = 0;
let walls = 0;

let canPunch = false;
let canUsePotion = false;

var Dani = {
    random: function (a, b) {
        var result;
        var random = Math.random();
        if (a !== null && typeof a === "object") {
            //treat as list
            if (b === 1)
                result = a[this.random(a.length - 1)];
            else
                result = this.cloneObject(a).sort(function () {
                    return random > .5 ? -1 : 1;
                });
        } else if (typeof a === "string") {
            //treat as string
            if (b === 1)
                result = a.split("")[this.random(a.length - 1)];
            else
                result = a.split("").sort(function () {
                    return random > .5 ? -1 : 1;
                }).join("");
        } else if (typeof a === "number") {
            //treat as number
            if (typeof b === "number") {
                //treat as range
                result = Math.round(random * (b - a)) + a;
            } else {
                //treat as number
                result = Math.round(random * a);
            }
        } else {
            //treat as val between 0 and 1
            result = random;
        }
        return result;
    },
    cloneObject: function (obj) {
        if (obj === null || typeof (obj) !== 'object')
            return obj;

        var temp = new obj.constructor();
        for (var key in obj)
            temp[key] = this.cloneObject(obj[key]);

        return temp;
    },
    lock: function (num, a, b) {
        if (num === undefined) return 0;
        if (b === undefined) b = a;
        if (num < a) num = a;
        else if (num > b) num = b;
        return num;
    },
    cycle: function (num, max, min) {
        if (num === undefined || max === undefined) return 0;
        min = min || 0;
        num = this.lock(num, min, max);
        if (num < max) num++;
        else num = min;
        return num;
    }
}

const Aim = function () {
    const size = gameVars.level.size;
    let x = 0;
    let y = 0;
    let bX = 0;
    let bY = 0;
    let range = 0;
    function tick() {

        var newX = mouseCords.x;
        var newY = mouseCords.y;
        var xx = newX - playerX;
        var yy = newY - (playerY - playerW / 2);
        var angleRad = Math.atan2(yy, xx);
        var angleDeg = angleRad / Math.PI * 180;
        var rotation = angleDeg;

        var distance = Math.sqrt((xx * xx) + (yy * yy));
        range = distance > playerReach ? playerReach : distance;

        var xMov = Math.cos(rotation * (Math.PI / 180));
        var yMov = Math.sin(rotation * (Math.PI / 180));
        x = playerX + xMov * range;
        y = (playerY - playerW / 2) + yMov * range;

        bX = (Math.floor(x / gameVars.level.size) * gameVars.level.size);
        bY = (Math.floor(y / gameVars.level.size) * gameVars.level.size);
    }
    function render() {
        drawImg('crosshair', x - size / 2, y - size / 2, size, size);
        drawImg('buildOptions', bX, bY, size, size);
    }
    function getCoords() {
        return { x: x, y: y, bX: bX, bY: bY };
    }
    return {
        tick,
        render,
        getCoords
    }
}

const Entity = function () {

    const entities = [];

    const Length = function () {
        return entities.length;
    }

    const reset = function () {
        while (entities.length) {
            entities.pop();
        }
    }

    const addEntity = function (type, x, y, w, h) {
        x = x || 0;
        y = y || 0;
        w = Dani.lock(w, 40) || 40;
        h = Dani.lock(h, 40) || 40;

        if (type === 'char') {
            entities.push(new Character(x, y, w, h, type));
        } else if (type === 'enem') {
            entities.push(new Enemy(x, y, w, h, type));
        }
    }
    let deadEntities = [];
    function tick() {
        //sort entities based on their y
        entities.sort((a, b) => a.getY() - b.getY());
        for (const i in entities) {
            const entity = entities[i];
            entity.tick();

            testCollisions(entity);
            if (entity.getRemove()) {
                entities.splice(parseInt(i), 1);
                const weights = Dani.random(100);
                if (weights > 92)
                    gameVars.drops.drop('potion', entity.getX(), entity.getY());

                if (weights > 99)
                    gameVars.gui.addWall(1);
            }
        }
    }

    function render() {
        for (const i in entities) {
            entities[i].render();
        }
    }

    function isFreeTile(tX, tY) {
        for (const i in entities) {
            const entity = entities[i];

            const w = entity.getW();
            const h = entity.getH();
            const x = entity.getX();
            const y = entity.getY();

            const leftPoint = getBlockX(x - (w / 4));
            const rightPoint = getBlockX(x + (w / 4));
            const topPoint = getBlockY(y - (h * 3 / 4));
            const bottomPoint = getBlockY(y - (h / 4));

            if (pointsMatch(leftPoint, topPoint, tX, tY) || pointsMatch(rightPoint, topPoint, tX, tY) || pointsMatch(leftPoint, bottomPoint, tX, tY) || pointsMatch(rightPoint, bottomPoint, tX, tY)) {
                return false;
            }
        }
        return true;
    }

    function testCollisions(self) {
        const w = self.getW();
        const h = self.getH();
        const x = self.getX();
        const y = self.getY();

        // colliding with borders
        if (x - (w / 2) < 0) self.setX(w / 2);
        if (x + (w / 2) > WIDTH) self.setX(WIDTH - w / 2);
        if (y - h < 0) self.setY(h);
        if (y > HEIGHT) self.setY(HEIGHT);

        // colliding with walls
        //collisions
        const rightX = getBlockX(x + (w / 2));
        const leftX = getBlockX(x - (w / 2));
        const topY = getBlockY(y - h);
        const bottomY = getBlockY(y);

        const xLeft = getBlockX(x - (w / 4))
        const xRight = getBlockX(x + (w / 4));
        const yTop = getBlockY(y - (h * 3 / 4));
        const yBottom = getBlockY(y - (h / 4));

        // left collide
        if (collide(leftX, yBottom) || collide(leftX, yTop)) {
            //self.setX(x + Math.abs(x - (w / 2) - ((leftX + 1) * gameVars.level.size)));
            var newX = leftX * gameVars.level.size + gameVars.level.size;
            var newY = yTop * gameVars.level.size + gameVars.level.size/2;
            var xx = newX - (x - (w / 2));
            var yy = newY - (y-h/2);
            var angleRad = Math.atan2(yy, xx);
            var angleDeg = angleRad / Math.PI * 180;
            var distance = Math.sqrt((xx * xx) + (yy * yy)) + 1;


            var rotation = angleDeg;
            var xMov = Math.cos(rotation * (Math.PI / 180));
            var yMov = Math.sin(rotation * (Math.PI / 180));
            console.log(newX, xx, xMov)
            self.setX(-xMov * distance, true);
            self.setY(-yMov * distance, true);
            // x += xMov * distance;
            // y += yMov * distance;
        }
        if (touchingWall(leftX, yBottom) || touchingWall(leftX, yTop)) {
            self.setTouchingWall(true);
        }

        // right collide
        if (collide(rightX, yBottom) || collide(rightX, yTop)) {
            self.setX(x - Math.abs(x + (w / 2) - (rightX * gameVars.level.size)));
        }
        if (touchingWall(rightX, yBottom) || touchingWall(rightX, yTop)) {
            self.setTouchingWall(true);
        }

        // top collide
        if (collide(xLeft, topY) || collide(xRight, topY)) {
            self.setY(y + Math.abs(y - h - ((topY + 1) * gameVars.level.size)));
        }
        if (touchingWall(xLeft, topY) || touchingWall(xRight, topY)) {
            self.setTouchingWall(true);
        }

        // bottom collide
        if (collide(xLeft, bottomY) || collide(xRight, bottomY)) {
            self.setY(y - Math.abs(y - (bottomY * gameVars.level.size)));
        }
        if (touchingWall(xLeft, bottomY) || touchingWall(xRight, bottomY)) {
            self.setTouchingWall(true);
        }
    }

    function processPunch() {
        for (const i in entities) {
            const entity = entities[i];
            if (entity.getType() === 'char') continue;
            if (entity.getIsDead()) continue;
            var newX = crosshairCord.x;
            var newY = crosshairCord.y;
            var xx = newX - entity.getX();
            var yy = newY - (entity.getY() - entity.getH() / 2);
            var distance = Math.sqrt((xx * xx) + (yy * yy));

            newX = playerX;
            newY = (playerY - playerW / 2);
            xx = newX - entity.getX();
            yy = newY - (entity.getY() - entity.getH() / 2);
            var angleRad = Math.atan2(yy, xx);
            var angleDeg = angleRad / Math.PI * 180;
            var rotation = angleDeg;
            var enemyD = entity.getW() / 2;
            if (distance < (enemyD + crosshairSize / 2)) {
                entity.playHurtFrame();
                entity.setHealth(-Dani.random(punchStrength - 5, punchStrength), true);

                var xMov = Math.cos(rotation * (Math.PI / 180));
                var yMov = Math.sin(rotation * (Math.PI / 180));
                gameVars.gui.addScore(scoreEnemyHit);
                gameVars.audios.audio.playOnce('EnemyHurt');

                entity.setX(-xMov * bounceDistance, true);
                entity.setY(-yMov * bounceDistance, true);
            }
        }
    }


    /*function getBlock(val) {
        return Math.floor(val/gameVars.level.size);
    }*/
    function getBlockX(x) {
        return Math.floor(x / gameVars.level.size);
    }
    function getBlockY(y) {
        return Math.floor(y / gameVars.level.size);
    }
    function pointsMatch(p1_X, p2_Y, p3_X, p4_Y) {
        if (arguments.length === 2) {
            return p1_X.x === p2_Y.x && p1_X.y === p2_Y.y;
        } else if (arguments.length === 4) {
            return p1_X === p3_X && p2_Y === p4_Y;
        }
    }
    function collide(x, y) {
        try {
            return (gameVars.level.isBlock(x, y, Tile.wall)) || (gameVars.level.isBlock(x, y, Tile.bedrock));
        } catch {
            return false;
        }
    }
    function touchingWall(x, y) {
        try {
            return gameVars.level.isBlock(x, y, Tile.wall);
        } catch {
            return false;
        }
    }

    return {
        addEntity,
        tick,
        render,
        Length,
        isFreeTile,
        processPunch,
        reset
    }
}

const Character = function (x, y, w, h, type) {
    x = x || 0;
    y = y || 0;
    w = w || 50;
    h = h || 50;
    type = type || 'char';

    let speed = 7;
    let xDir = 1;

    let hX = 0;
    let hY = 0;
    let hW = 16;
    let hH = 16;

    let touchingWall = false;

    let walkAnim = 4;
    let walking = false;
    let walkCount = 0;
    const walkCounter = 2;

    const punchFrame = 5;
    const hurtFrame = 6;
    const deadFrame = 7;

    let canRemove = false;

    function setX(val, increment) {
        if (increment) {
            x += val;
        } else {
            x = val;
        }
    }
    function setY(val, increment) {
        if (increment) {
            y += val;
        } else {
            y = val;
        }
    }
    function getX() {
        return x;
    }
    function getY() {
        return y;
    }
    function getW() {
        return w;
    }
    function getH() {
        return h;
    }
    function getRemove() {
        return canRemove;
    }
    function setTouchingWall(val) {
        touchingWall = val;
    }
    function getTouchingWall() {
        return touchingWall;
    }
    function getType() {
        return type;
    }
    function getHealth() {
        return health;
    }
    function setHealth(val, increment) {
        if (increment) {
            health += val;
        } else {
            health = val;
        }
        health = Dani.lock(health, 0, maxHealth);
    }
    function playHurtFrame(val) {
        hX = hurtFrame; //hurt
    }


    function tick() {
        if (!playerDead) {
            if (movingUp) {
                y -= speed;
            }
            if (movingDown) {
                y += speed;
            }
            if (movingLeft) {
                x -= speed;
                // xDir = -1;
            }
            if (movingRight) {
                x += speed;
                // xDir = 1;
            }
            if (!movingDown && !movingLeft && !movingRight && !movingUp) {
                walking = false;
            } else {
                walking = true;
            }

            playerX = x;
            playerY = y;
            playerBX = (Math.floor((x - 5) / gameVars.level.size) * gameVars.level.size) + w / 2;
            playerBY = (Math.floor((y - 10) / gameVars.level.size) * gameVars.level.size) + h;

            if (crosshairCord.x > playerX) xDir = 1
            else if (crosshairCord.x < playerX) xDir = -1;


            if (xDir === -1) {
                hY = 1;
            } else {
                hY = 0;
            }
            if (walking) {
                crosshairCord = gameVars.aim.getCoords();
                if (walkCount >= walkCounter) {
                    walkCount = 0;
                    if (hX === 1 || hX === 3)
                        gameVars.audios.audio.playOnce('PlayerStep');
                    hX = Dani.cycle(hX, walkAnim, 1);
                } else {
                    walkCount++;
                }
            } else {
                walkCount = 0;
                hX = 0;
            }
            if (doingAction) {
                doingAction = false;
                hX = punchFrame; //punch
            }
            if (punchBack.length > 0) {
                for (const i in punchBack) {
                    var newX = punchBack[i].x;
                    var newY = punchBack[i].y;
                    var xx = newX - x;
                    var yy = newY - (y - h / 2);
                    var distance = Math.sqrt((xx * xx) + (yy * yy));
                    var angleRad = Math.atan2(yy, xx);
                    var angleDeg = angleRad / Math.PI * 180;
                    var rotation = angleDeg;
                    var enemyD = punchBack[i].w;
                    var playerD = w / 2;
                    if (distance < (enemyD + playerD)) {
                        hX = hurtFrame; //hurt
                        let dmg = punchBack[i].dmg
                        playerHealth -= Dani.random(dmg - 5, dmg);
                        playerHealth = Dani.lock(playerHealth, 0, playerMaxHealth);

                        var xMov = Math.cos(rotation * (Math.PI / 180));
                        var yMov = Math.sin(rotation * (Math.PI / 180));
                        gameVars.audios.audio.playOnce('PlayerHurt');
                        x -= xMov * playerD;
                        y -= yMov * playerD;
                        if (playerHealth <= 0) {
                            playerDead = true;
                            gameVars.audios.audio.playOnce('PlayerDeath');
                        }
                    }
                }
                punchBack = [];
            }
        } else {
            // if(removeCount >= removeCounter) {
            //     removeCount = 0;
            //     canRemove = true;
            // } else {
            //     removeCount++;
            // }
            hX = deadFrame; //dead
        }
    }

    function render() {
        // draw('charr', playerBX, playerBY, w+5, h+5);

        drawImg('player', x - (w / 2), y - h, w, h, hX * hW, hY * hH, hW, hH);
    }
    return {
        render,
        tick,
        getX,
        getY,
        getW,
        getH,
        setX,
        setY,
        getRemove,
        setTouchingWall,
        getTouchingWall,
        getType,
        getHealth,
        setHealth,
        playHurtFrame
    }
}

const Enemy = function (x, y, w, h, type) {
    x = x || 0;
    y = y || 0;
    w = w || 50;
    h = h || 50;
    type = type || 'enem';


    let hX = 0;
    let hY = 0;
    let hW = 16;
    let hH = 16;

    const weight = Math.floor(score/adjuster);
    const eStrength = Dani.random(10+weight, 15+weight);

    let touchingWall = false;

    let walkAnim = 4;
    let walking = false;
    let walkCount = 0;
    const walkCounter = 2;

    const punchFrame = 5;
    const hurtFrame = 6;
    const deadFrame = 7;

    let attackCount = 0;
    const attackCounter = 10;
    let wallBreakCount = 0;
    const wallBreakCounter = 10;

    let removeCount = 0;
    const removeCounter = 50;

    const maxHealth = 50 + weight*10;
    let health = maxHealth;
    let isDead = false;
    let canRemove = false;

    let speed = 4;


    function setX(val, increment) {
        if (increment) {
            x += val;
        } else {
            x = val;
        }
    }
    function setY(val, increment) {
        if (increment) {
            y += val;
        } else {
            y = val;
        }
    }
    function getX() {
        return x;
    }
    function getY() {
        return y;
    }
    function getW() {
        return w;
    }
    function getH() {
        return h;
    }
    function getRemove() {
        return canRemove;
    }
    function setTouchingWall(val) {
        touchingWall = val;
    }
    function getTouchingWall() {
        return touchingWall;
    }
    function getType() {
        return type;
    }
    function getHealth() {
        return health;
    }
    function setHealth(val, increment) {
        if (increment) {
            health += val;
        } else {
            health = val;
        }
        health = Dani.lock(health, 0, maxHealth);
    }
    function playHurtFrame(val) {
        hX = hurtFrame; //hurt
    }
    function getIsDead() {
        return isDead;
    }

    let xMove = 0;
    let yMove = 0;
    let blX = 0;
    let blY = 0;
    let followingPlayer = false;
    let xDir = 1;

    var nextMoves;
    var nextMove;
    var targetMet = true;
    function tick() {
        if (!isDead) {
            if (health <= 0) {
                isDead = true;
                gameVars.gui.addScore(scoreEnemyDead);
                gameVars.audios.audio.playOnce('EnemyDeath');
                return;
            }
            if (followingPlayer) {
                blX = (Math.floor((x - 5) / gameVars.level.size) * gameVars.level.size) + w / 2;
                blY = (Math.floor((y - 10) / gameVars.level.size) * gameVars.level.size) + h;
                const playersX = Math.floor(playerBX / gameVars.level.size);
                const playersY = Math.floor(playerBY / gameVars.level.size);
                const blockX = Math.floor(blX / gameVars.level.size);
                const blockY = Math.floor(blY / gameVars.level.size);
                nextMoves = gameVars.level.path({ x: blockX, y: blockY }, { x: playersX, y: playersY });
                if (nextMoves.length === 0) { //chase
                    var newX = playerX;
                    var newY = playerY;
                    var xx = newX - x;
                    var yy = newY - y;
                    var angleRad = Math.atan2(yy, xx);
                    var angleDeg = angleRad / Math.PI * 180;

                    var distance = Math.sqrt((xx * xx) + (yy * yy));

                    var rotation = angleDeg;
                    if (distance > speed) {
                        walking = true;
                        var xMov = Math.cos(rotation * (Math.PI / 180));
                        var yMov = Math.sin(rotation * (Math.PI / 180));
                        x += xMov * speed;
                        y += yMov * speed;
                        if (xMov > 0) xDir = 1;
                        else if (xMov < 0) xDir = -1;
                    } else {
                        walking = false;
                    }

                    if (touchingWall) {
                        let bX = (Math.floor((x - 5) / gameVars.level.size) * gameVars.level.size) + w / 2;
                        let bY = (Math.floor((y - 10) / gameVars.level.size) * gameVars.level.size) + h;
                        if (wallBreakCount >= wallBreakCounter) {
                            wallBreakCount = 0;

                            if (playerBX > bX) {
                                gameVars.checker.punchWall(bX, bY, 1, 0, eStrength, 'enemy');
                                hX = punchFrame;
                            } else if (playerBX < bX) {
                                gameVars.checker.punchWall(bX, bY, -1, 0, eStrength, 'enemy');
                                hX = punchFrame;
                            }
                            if (playerBY > bY) {
                                gameVars.checker.punchWall(bX, bY, 0, 1, eStrength, 'enemy')
                                hX = punchFrame;
                            } else if (playerBY < bY) {
                                gameVars.checker.punchWall(bX, bY, 0, -1, eStrength, 'enemy');
                                hX = punchFrame;
                            }
                        } else {
                            wallBreakCount++;
                        }
                        touchingWall = false;
                    }
                } else { //pathfind
                    walking = true;

                    if (targetMet) {
                        nextMove = nextMoves[1];
                        targetMet = false;
                    }

                    var newX = nextMove.x * gameVars.level.size + w / 2;
                    var newY = nextMove.y * gameVars.level.size + h;
                    var xx = newX - x;
                    var yy = newY - y;
                    var angleRad = Math.atan2(yy, xx);
                    var angleDeg = angleRad / Math.PI * 180;
                    var distance = Math.sqrt((xx * xx) + (yy * yy));

                    var rotation = angleDeg;
                    var xMov = Math.cos(rotation * (Math.PI / 180));
                    var yMov = Math.sin(rotation * (Math.PI / 180));
                    x += xMov * speed;
                    y += yMov * speed;

                    if (xMov > 0) xDir = 1;
                    else if (xMov < 0) xDir = -1;

                    if (distance < speed) {
                        targetMet = true;
                    }
                }

                if (Dani.random(100) > 98) {
                    followingPlayer = false;
                }
            } else { //idle
                x += xMove * speed;
                y += yMove * speed;
                if (Dani.random(100) > 97) {
                    xMove = parseInt(Dani.random([-1, 0, 1], 1));
                    yMove = parseInt(Dani.random([-1, 0, 1], 1));
                }
                if (xMove === 1 || xMove === -1) {
                    xDir = xMove;
                }
                if (xMove === 0 && yMove === 0) {
                    walking = false;
                } else {
                    walking = true;
                }

                if (Dani.random(100) > 95) {
                    followingPlayer = true;
                }
            }

            if (xDir === -1) {
                hY = 1;
            } else {
                hY = 0;
            }

            if (walking) {
                if (walkCount >= walkCounter) {
                    walkCount = 0;
                    hX = Dani.cycle(hX, walkAnim, 1);
                } else {
                    walkCount++;
                }
            } else {
                walkCount = 0;
                hX = 0;
            }
            if (!playerDead && nearChar()) {
                if (attackCount >= attackCounter) {
                    attackCount = 0;
                    hX = punchFrame; //punch
                    punchBack.push({ x, y: y - (h / 2), w: w / 2, dmg: eStrength });
                } else {
                    attackCount++;
                }
            }

        } else {
            if (removeCount >= removeCounter) {
                removeCount = 0;
                canRemove = true;
            } else {
                removeCount++;
            }
            hX = deadFrame; //dead
        }
    }

    function render() {
        // for(let i in nextMoves)
        //     draw('enemm', nextMoves[i].x * gameVars.level.size + w/2, nextMoves[i].y * gameVars.level.size + h, w, h);
        drawImg('enemy', x - (w / 2), y - h, w, h, hX * hW, hY * hH, hW, hH);
    }

    function nearChar() {
        var newX = playerX;
        var newY = playerY - playerH / 2;
        var xx = newX - x;
        var yy = newY - (y - h / 2);
        var distance = Math.sqrt((xx * xx) + (yy * yy));

        var enemyD = w / 2;
        if (distance < (enemyD + playerW / 2)) {
            return true
        }
        return false;
    }

    return {
        render,
        tick,
        getX,
        getY,
        getW,
        getH,
        setX,
        setY,
        getRemove,
        setTouchingWall,
        getTouchingWall,
        getType,
        getHealth,
        setHealth,
        playHurtFrame,
        getIsDead
    }
}

const Font = function (pathRef) {
    var path = pathRef ? pathRef : "PixelFont/font_";

    var fontChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'colon', 'equals', 'period', 'comma', 'exclamation_point', 'question_mark', 'space'];
    var fonts = {};

    function getChar(char) {
        char = char.toLowerCase();
        if (char.match(/[0-9a-z]/i)) {
            return char;
        } else {
            if (char === " ") return 'space';
            if (char === ":") return 'colon';
            if (char === "=") return 'equals';
            if (char === ".") return 'period';
            if (char === ",") return 'comma';
            if (char === "!") return 'exclamation_point';
            if (char === "?") return 'question_mark';
        }
        return '';
    }

    var preloadimages = async function () {
        var texxture;
        for (var i in fontChars) {
            texxture = fontChars[i];
            fonts[texxture] = new Image();
            fonts[texxture].onerror = async function () {
                var textyure = this.src.split(path)[1].split('.')[0];

                this.onerror = async function () {
                    for (var j = 0; j < fontChars.length; j++) {
                        if (fontChars[j] === textyure) {
                            fontChars.splice(j, 1);
                            j--;
                        }
                    }
                }
                this.src = await path + textyure + ".jpg";
            }
            fonts[texxture].src = await path + texxture + ".png";
        }

    }
    preloadimages();

    return {
        fonts: fonts,
        getChar
    }
}

const Texture = function (pathRef) {

    var textureList = ["player", "wall", "floor", "bedrock", "blockDamage", "enemy", "health", "potion", "package", "GUIPanel", "pause_screen", "play_screen", "death_screen", "crosshair", "buildOptions", "mousePos"];
    var textures = {};

    var path = pathRef ? pathRef : "textures/";

    var preloadimages = async function () {
        var texxture;
        for (var i in textureList) {
            texxture = textureList[i];
            textures[texxture] = new Image();
            textures[texxture].onerror = async function () {
                var textyure = this.src.split(path)[1].split('.')[0];

                this.onerror = async function () {
                    for (var j = 0; j < textureList.length; j++) {
                        if (textureList[j] === textyure) {
                            textureList.splice(j, 1);
                            j--;
                        }
                    }
                }
                this.src = await path + textyure + ".jpg";
            }
            textures[texxture].src = await path + texxture + ".png";
        }

    }
    preloadimages();

    return {
        textures: textures
    }
}

function drawImg(obj, x, y, w, h, dx, dy, dw, dh) {
    const width = panel.canvasWidth();
    const scale = width / WIDTH;
    dx = dx || 0;
    dy = dy || 0;
    dw = dw || gameVars.texture.textures[obj].width;
    dh = dh || gameVars.texture.textures[obj].height;

    x *= scale;
    y *= scale;
    w *= scale;
    h *= scale;

    screen.drawImage(gameVars.texture.textures[obj], dx, dy, dw, dh, x, y, w, h); // parseInt(w), parseInt(h));
}

function drawTxt(string, x, y, h, dx, dy, dw, dh) {
    const width = panel.canvasWidth();
    const scale = width / WIDTH;
    dx = dx || 0;
    dy = dy || 0;
    dw = dw || gameVars.font.fonts['a'].width;
    dh = dh || gameVars.font.fonts['a'].height;

    let dist = 3;
    h = h || 10; //parseInt(h) || 10;

    let w = h / 2;
    x *= scale;
    y *= scale;
    w *= scale;
    h *= scale;
    dist *= scale;

    dist += w;

    let char;
    let j = 0;
    for (var i in string) {
        char = gameVars.font.getChar(string[i]);
        if (char === '') continue;
        screen.drawImage(gameVars.font.fonts[char], dx, dy, dw, dh, x + (j * dist), y, w, h); // parseInt(w), parseInt(h));
        j++;
    }
}

const Tile = {
    floor: 'floor',
    wall: 'wall',
    bedrock: 'bedrock'
}

function Level(w, h) {
    w = w || 10;
    h = h || 10;
    const blockMaxHealth = 100;
    const blockDamageFrames = 5;
    this.size = 50;
    this.block = [];
    const clearMap = () => {
        for (let x = 0; x < w; x++) {
            this.block[x] = [];
            for (let y = 0; y < h; y++) {
                this.block[x][y] = { id: Tile.floor, health: blockMaxHealth };
            }
        }
        for (let x = 0; x < w; x++) {
            const y = 8;
            this.block[x][y].id = Tile.bedrock;
        }
    }

    const maps = [
        [
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,1,1,1,1,1,1,0,0],
            [0,0,1,0,0,0,0,1,0,0],
            [0,0,1,0,0,0,0,1,0,0],
            [0,0,1,1,1,1,1,1,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0]
        ],
        [
            [0,0,0,0,1,0,0,0,0,0],
            [0,0,0,0,1,0,0,0,0,0],
            [1,1,1,0,1,1,1,1,0,0],
            [0,0,1,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,1,0,0],
            [0,0,1,1,1,1,0,1,1,1],
            [0,0,0,0,0,1,0,0,0,0],
            [0,0,0,0,0,1,0,0,0,0]
        ],
        [
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0]
        ]
    ]

    const generateMap = () => {
        clearMap();
        const theMap = Dani.random(maps, 1);
        for(let y = 0; y < theMap.length; y++) {
            for(let x = 0; x < theMap[y].length; x++) {
                if(theMap[y][x] === 0)
                    this.block[x][y].id = Tile.floor;
                else if(theMap[y][x] === 1)
                    this.block[x][y].id = Tile.wall;
            }
        }
        for (let x = 0; x < w; x++)
            for (let y = 0; y < h; y++) {
                if(Dani.random(100) > 95)
                    this.block[x][y].id = Tile.bedrock;
        }
    }

    generateMap();

    this.reset = function () {
        generateMap();
    }

    this.tick = function () {
    }
    this.render = function () {
        let id, i=0;
        for (let x = 0; x < w; x++)
            for (let y = 0; y < h; y++) {i++;
                id = this.block[x][y].id
                if(id === Tile.floor) {
                    const dX = i%12===0?1:i%2===0?2:0;
                    drawImg(id, x * this.size, y * this.size, this.size, this.size, dX * 16, 0, 16, 16);
                } else {
                    drawImg(id, x * this.size, y * this.size, this.size, this.size, 0, 0, 16, 16);
                }

                const dmgAnim = Math.floor(this.block[x][y].health / blockMaxHealth * blockDamageFrames);
                drawImg('blockDamage', x * this.size, y * this.size, this.size, this.size, dmgAnim * 16, 0, 16, 16);
            }
    }
    this.path = function (startPos, endPos) {
        const block = this.block;
        const map = {};
        for (let x = 0; x < w; x++) {
            map[x] = [];
            for (let y = 0; y < h; y++) {
                map[x][y] = { taken: false, num: 0, roots: [] };
            }
        }

        function spreadPath(id, x, y) {
            try {
                // if(!map[x][y].taken && block[x][y].id !== Tile.wall) {
                map[x][y].taken = true;
                map[x][y].num = id;
                if (map[x][y].roots.length === 0) map[x][y].roots = [{ x, y }];
                attemptSpread(id, x + 1, y, Dani.cloneObject(map[x][y].roots));
                attemptSpread(id, x, y + 1, Dani.cloneObject(map[x][y].roots));
                attemptSpread(id, x - 1, y, Dani.cloneObject(map[x][y].roots));
                attemptSpread(id, x, y - 1, Dani.cloneObject(map[x][y].roots));
                // }
            } catch (e) {
                // console.warn(e.message, x, y)
            }
        }
        const spreadsLeft = [];
        function attemptSpread(id, x, y, roots) {
            try {
                if (!map[x][y].taken && block[x][y].id === Tile.floor && !pathFound) {
                    map[x][y].taken = true;
                    map[x][y].num = id + 1;
                    map[x][y].roots = roots;
                    map[x][y].roots.push({ x, y });
                    if (x === endPos.x && y === endPos.y) {
                        pathFound = true;
                        properPath = map[x][y].roots;
                        return;
                    }
                    spreadsLeft.push({ id, x, y });
                }
            } catch (e) {
                // console.warn(e.message, x, y)
            }
        }
        let pathFound = false;
        let properPath = [];

        spreadPath(0, startPos.x, startPos.y);
        for (let i = 0; i < spreadsLeft.length; i++) {
            if (pathFound) break;
            spreadPath(i + 1, spreadsLeft[i].x, spreadsLeft[i].y);
            if (spreadsLeft[i].x === endPos.x && spreadsLeft[i].y === endPos.y) {
                //pathFound = true;
                break;
            }
        }
        return properPath;
    }

    this.isBlock = function (x, y, id) {
        try {
            return this.block[x][y].id === id;
        } catch {
            return false;
        }
    }

    this.setBlock = function (x, y, id) {
        try {
            this.block[x][y].id = id;
            this.block[x][y].health = blockMaxHealth;
        } catch { }
    }

    this.getBlock = function (x, y) {
        try {
            return this.block[x][y].id;
        } catch {
            return null;
        }
    }

    this.hitBlock = function (x, y, damage, target) {
        try {
            if (this.block[x][y].id !== Tile.wall) return;
            gameVars.audios.audio.playOnce('WallHurt');
            this.block[x][y].health -= damage;
            this.block[x][y].health = Dani.lock(this.block[x][y].health, 0, blockMaxHealth);
            if (this.block[x][y].health === 0) {
                this.setBlock(x, y, Tile.floor);
                gameVars.audios.audio.playOnce('WallDeath');
                if (target === 'player') {
                    gameVars.gui.addWall(1);
                }
            }
        } catch { }
    }
}



function Spawner() {
    const maxEntities = 1; //25; //10;
    let weight = Math.floor(score/adjuster);
    let spawnTimer = Dani.random(20, 45) - weight;
    let spawnTime = 0;
    const spawn = function () {
        if (gameVars.entities.Length() < maxEntities) {
            const x = Dani.random(lW);
            const y = Dani.random(lH - 1);
            if (gameVars.level.isBlock(x, y, Tile.floor)) {
                gameVars.entities.addEntity('enem', x * gameVars.level.size, y * gameVars.level.size + playerH);
            }
        }
    }
    function tick() {
        if (spawnTime >= spawnTimer) {
            spawnTime = 0;
            spawn();

            weight = Math.floor(score/adjuster);
            spawnTimer = Dani.random(20, 45) - weight;
            spawnTimer = Dani.lock(10, 100);
        } else {
            spawnTime++;
        }
    }
    return {
        tick
    }
}

function Checker() {
    function usePotion() {
        if (potions > 0 && playerHealth < playerMaxHealth) {
            playerHealth += 10;
            playerHealth = Dani.lock(playerHealth, 0, playerMaxHealth);
            gameVars.gui.removePotion();
            gameVars.audios.audio.playOnce('HealthUse');
        } else {
            gameVars.audios.audio.playOnce('HealthNull');
        }
    }
    function placeWall() {
        if (walls > 0) {
            const pX = Math.floor((crosshairCord.bX) / gameVars.level.size);
            const pY = Math.floor((crosshairCord.bY) / gameVars.level.size);
            try {
                if (gameVars.entities.isFreeTile(pX, pY) && gameVars.level.isBlock(pX, pY, Tile.floor)) {
                    gameVars.audios.audio.playOnce('WallPlace');
                    gameVars.level.setBlock(pX, pY, Tile.wall);
                    gameVars.gui.removeWall();
                }
            } catch (e) { console.warn(e.message) }
        }
    }

    function punchWall(bX, bY, xDir, yDir, strength, target) {
        const pX = Math.floor((bX) / gameVars.level.size) + xDir;
        const pY = Math.floor((bY) / gameVars.level.size) + yDir;
        try {
            if (gameVars.level.isBlock(pX, pY, Tile.wall)) {
                gameVars.level.hitBlock(pX, pY, strength, target);
            }
        } catch (e) { console.warn(e.message) }
    }

    function tick() {
        if (canUsePotion) {
            usePotion();
            canUsePotion = false;
        }

        if (rightClicked) {
            placeWall();
        }
    }
    return {
        tick,
        punchWall,
        placeWall
    }
}

function Drops() {
    const size = 35;
    const items = [];
    const ticker = 50;


    const dropTimer = 500;
    let dropTime = 0;

    const drop = function (name, x, y, timeLeft) {
        items.push({ name, x, y, time: timeLeft || ticker });
    }

    const reset = function () {
        while (items.length) {
            items.pop();
        }
    }

    const dropItem = function () {
        if (Dani.random(100) > 1) {
            dropPackage();
        }
    }
    const dropPackage = function () {
        const x = Dani.random(lW);
        const y = Dani.random(lH - 1);
        if (gameVars.level.isBlock(x, y, Tile.floor)) {
            drop('package', x * gameVars.level.size + size / 2, y * gameVars.level.size + size, 100);
        }
    }
    function tick() {
        if (dropTime >= dropTimer) {
            dropTime = 0;
            dropItem();
        } else {
            dropTime++;
        }
        for (const i in items) {
            const item = items[i];
            if (!item.ticker) item.ticker = 1;
            else (item.ticker++);
            if (item.ticker >= item.time)
                items.splice(parseInt(i), 1);

        }
        checkToPickupItem();
    }
    function render() {
        for (const i in items) {
            const item = items[i];
            drawImg(item.name, item.x - (size / 2), item.y - (size), size, size);
        }
    }

    function checkToPickupItem(usingMouse) {
        for (const i in items) {
            const item = items[i];
            if (nearChar(item.x, item.y, size, size, usingMouse)) {
                if (item.name === 'potion') {
                    gameVars.audios.audio.playOnce('HealthPickup');
                    items.splice(parseInt(i), 1);
                    gameVars.gui.addPotion(1);
                    gameVars.gui.addScore(scorePotionPickup);
                } else if (item.name === 'package') {
                    gameVars.audios.audio.playOnce('PackagePickup');
                    items.splice(parseInt(i), 1);
                    gameVars.gui.addWall(Dani.random(1, 10));
                    gameVars.gui.addPotion(Dani.random(1, 3));
                    gameVars.gui.addScore(scorePackagePickup);
                }
            }
        }
    }

    function nearChar(x, y, w, h, usingMouse) {
        if (usingMouse) {
            var newX = crosshairCord.x;
            var newY = crosshairCord.y - (crosshairSize / 2);
            var xx = newX - x;
            var yy = newY - (y - h / 2);
            var distance = Math.sqrt((xx * xx) + (yy * yy));

            var thisD = w / 2;
            if (distance < (thisD + crosshairSize / 2)) {
                return true
            }
        } else {
            var newX = playerX;
            var newY = playerY - (playerW / 2);
            var xx = newX - x;
            var yy = newY - (y - h / 2);
            var distance = Math.sqrt((xx * xx) + (yy * yy));

            var thisD = w / 2;
            if (distance < (thisD + playerW / 2)) {
                return true
            }
        }
        return false;
    }

    return {
        drop,
        dropItem,
        tick,
        render,
        reset,
        checkToPickupItem
    }
}

function GUI() {
    const size = gameVars.level.size;
    function addScore(val) {
        const weight = Math.floor(score/adjuster);
        score += Math.round(val + val*weight/5) || Math.round(1 + weight/5);
        score = Dani.lock(score, 0, 9999999);
    }
    function removeScore(val) {
        score -= val || 1;
        score = Dani.lock(score, 0, 9999999);
    }

    function addPotion(val) {
        potions += val || 1;
        potions = Dani.lock(potions, 0, 99);
    }
    function removePotion(val) {
        potions -= val || 1;
        potions = Dani.lock(potions, 0, 99);
    }

    function addWall(val) {
        walls += val || 1;
        walls = Dani.lock(walls, 0, 99);
    }
    function removeWall(val) {
        walls -= val || 1;
        walls = Dani.lock(walls, 0, 99);
    }

    function render() {

        //guipanel
        drawImg('GUIPanel', 0, 400, 500, 50); //health border

        //player health
        drawImg('health', 16, 415.5, 100 / playerMaxHealth * playerHealth, 25, 0, 0, 32 / playerMaxHealth * playerHealth, 8); //health itself
        drawTxt(`${playerHealth}`, 20, 415, 19);

        // //potion baord
        drawTxt(`${potions}`, 158, 415, 19);

        // //wall baord
        drawTxt(`${walls}`, 275, 415, 19);

        // //score baord
        drawTxt(`${score}`, 393, 415, 19);

        // //cursor pos
        drawImg('mousePos', mouseCords.x - size / 2, mouseCords.y - size / 2, size, size);
    }
    return {
        addScore,
        removeScore,
        addPotion,
        removePotion,
        addWall,
        removeWall,
        render
    }
}

const Audios = function () {
    const audio = new GameAudio();

    async function loadAudios() {
        audio.setDefaults({ source: 'audios', type: 'wav' });
        await audio.create('GameMusic', 'EnemyDeath', 'EnemyHurt', 'WallPlace', 'WallHurt', 'WallDeath', 'HealthPickup', 'HealthUse', 'PlayerDeath', 'PlayerHurt', 'HealthNull', 'PackagePickup', 'PlayerStep');
        audio.setVolume('HealthUse', 60);
        audio.setVolume('HealthPickup', 60);
        audio.setVolume('PackagePickup', 60);
        audio.setVolume('WallPlace', 30);
        audio.setVolume('WallHurt', 45);
        audio.setVolume('WallDeath', 40);
        audio.setVolume('PlayerDeath', 65);
        audio.setVolume('PlayerStep', 30);
    }

    loadAudios();

    return {
        audio
    }
}

async function main() {

    gameVars.texture = await new Texture('textures/');
    gameVars.font = await new Font();

    gameVars.level = new Level(lW, lH);
    gameVars.checker = new Checker();

    gameVars.entities = new Entity();
    gameVars.entities.addEntity('char', 250, 225);


    gameVars.spawner = new Spawner();
    gameVars.drops = new Drops();

    gameVars.aim = new Aim();
    gameVars.gui = new GUI();

    gameVars.audios = await new Audios();

    setInterval(run, 50);


    // setTimeout(resetGame, 5000);
}


const resetGame = function () {
    //reset let variables
    PAUSED = false;
    musicStopped = false;

    playerHealth = playerMaxHealth;
    playerX = 0;
    playerY = 0;
    playerBX = 0;
    playerBY = 0;
    playerDead = false;
    punchStrength = defaultPunchStrength;
    playerReach = 45;

    movingLeft = false;
    movingRight = false;
    movingUp = false;
    movingDown = false;
    doingAction = false;
    crosshairCord = { x: 0, y: 0 };
    punchBack = [];

    score = 0;
    potions = 0;
    walls = 0;
    canUsePotion = false;

    //reset entities
    gameVars.entities.reset();
    gameVars.entities.addEntity('char', 250, 225);

    //reset drops
    gameVars.drops.reset();

    //reset level
    gameVars.level.reset();

    gameVars.audios.audio.playLoop('GameMusic');
}

function tick() {
    gameVars.spawner.tick();
    gameVars.level.tick();
    gameVars.drops.tick();
    gameVars.entities.tick();
    gameVars.aim.tick();
    gameVars.checker.tick();
}

function render() {

    screen.mozImageSmoothingEnabled = false;
    screen.webkitImageSmoothingEnabled = false;
    screen.msImageSmoothingEnabled = false;
    screen.imageSmoothingEnabled = false;

    panel.clear();

    gameVars.level.render();
    gameVars.drops.render();
    gameVars.entities.render();
    gameVars.aim.render();
    gameVars.gui.render();
}


function run() {
    if (!init) {
        if (!PAUSED && !playerDead) {
            tick();
            render();
            if (musicStopped) musicStopped = false;
        } else if (PAUSED) {
            drawImg('pause_screen', 50, 125, 400, 200);
        } else if (playerDead) {
            drawImg('death_screen', 50, 125, 400, 200);
            if (!musicStopped) {
                gameVars.audios.audio.stop('GameMusic');
                musicStopped = true;
            }
        }
    } else {
        drawImg('play_screen', 0, 0, 500, 450);
    }
}

window.onload = function () {
    main();
    stage.tabIndex = 1000;
    stage.style.outline = "none";
    stage.addEventListener("keydown", keyIsDown);
    stage.addEventListener("keyup", keyIsUp);
    stage.addEventListener('mousedown', mouseIsDown);
    stage.addEventListener('mouseup', mouseIsUp);
    stage.addEventListener('mousemove', mouseIsMoving);
    stage.onselectstart = function () { return false; }
    stage.addEventListener('contextmenu', function (e) { e.preventDefault(); e.stopPropagation(); });
    // stage.style.cursor = 'none';
}

const leftMouseBtn = 0;
const rightMouseBtn = 2;
const actionKey = leftMouseBtn;
const buildKey = rightMouseBtn;
let rightClicked = false;
function mouseIsUp(e) {
    e.preventDefault();
    // console.log('uo')
    if (e.button === buildKey) {
        rightClicked = false;
    }
}

function mouseIsMoving(e) {
    mouseCords = panel.mouse();
    crosshairCord = gameVars.aim.getCoords();
}

function mouseIsDown(e) {
    //e.button describes the mouse button that was clicked
    // 0 is left, 1 is middle, 2 is right
    if (e.button === actionKey) {
        gameVars.entities.processPunch();
        gameVars.checker.punchWall(crosshairCord.bX, crosshairCord.bY, 0, 0, Dani.random(wallStrength - 5, wallStrength), 'player');
        gameVars.drops.checkToPickupItem(true);
        doingAction = true;
    } else if (e.button === buildKey) {
        rightClicked = true;
    }
}


function keyIsUp(e) {
    e.preventDefault();
    if (e.keyCode === 80 || e.keyCode === 32 || e.keyCode === 82) //P or space or R
        setKey(e.keyCode, false, true);
    else
        setKey(e.keyCode, false);
}

function keyIsDown(e) {
    e.preventDefault();
    setKey(e.keyCode, true);
}
function setKey(key, cond, pressOnly) {
    switch (key) {
        case 65: //left or A
        case 37:
            movingLeft = cond;
            break;
        case 68: //right or D
        case 39:
            movingRight = cond;
            break;
        case 87: //up or W
        case 38:
            movingUp = cond;
            break;
        case 83: // down or S
        case 40:
            movingDown = cond;
            break;
        case 80: //P
            if (pressOnly) {
                if (init) {
                    init = false;
                    PAUSED = false;
                    gameVars.audios.audio.playLoop('GameMusic');
                } else
                    if (!playerDead) {
                        PAUSED = !PAUSED;
                        if (PAUSED) gameVars.audios.audio.pause('GameMusic');
                        else if (!PAUSED) gameVars.audios.audio.play('GameMusic');
                    }
            }
            break;
        case 32: // space
            if (pressOnly)
                canUsePotion = true;
            break;
        case 82: //R
            if (pressOnly && playerDead) resetGame();
            break;
        default:
            console.log('not moving really', key)
    }
}
