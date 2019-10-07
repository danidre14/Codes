const gameVars = {};
const panel = new GamePanel("gameArea", {dimensions: {width:500, height:450}, name: "Brawler Game"});
const WIDTH = panel.canvasWidth();
const HEIGHT = panel.canvasHeight();
const SCALE = WIDTH/HEIGHT;

let PAUSED = true;

const lW = 10, lH = 9;

const stage = panel.getCanvas();
const screen = stage.getContext('2d');
screen.mozImageSmoothingEnabled = false;
screen.webkitImageSmoothingEnabled = false;
screen.msImageSmoothingEnabled = false;
screen.imageSmoothingEnabled = false;

let playerX = 0;
let playerY = 0;
let playerBX = 0;
let playerBY = 0;
let playerDead = false;
let playerStrength = 10;
let playerReach = 25;
const playerMaxHealth = 100;
let playerHealth = playerMaxHealth;

const defaultScoreToAdd = 20;

let movingLeft = false;
let movingRight = false;
let movingUp = false;
let movingDown = false;
let punching = false;
let punchCord = {x: 0, y: 0};
let punchBack = [];

let score = 0;

var Dani = { 
    random:function(a, b) {
        var result;
        var random = Math.random();
        if(a !== null && typeof a === "object") {
            //treat as list
            if(b === 1)
                result = a[this.random(a.length-1)];
            else
                result = this.cloneObject(a).sort(function() {
                    return random>.5?-1:1;
                });
        } else if(typeof a === "string") {
            //treat as string
            if(b === 1)
                result = a.split("")[this.random(a.length-1)];
            else
                result = a.split("").sort(function() {
                    return random>.5?-1 :1;
                }).join("");
        } else if(typeof a === "number") {
            //treat as number
            if(typeof b === "number") {
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
    cloneObject:function(obj){
        if(obj === null || typeof(obj) !== 'object')
            return obj;

        var temp = new obj.constructor(); 
        for(var key in obj)
            temp[key] = this.cloneObject(obj[key]);

        return temp;
    },
    lock:function(num, a, b) {
        if(num === undefined) return 0;
        if(b === undefined) b = a;
        if(num < a) num = a;
        else if(num > b) num = b;
        return num;
    },
    cycle:function(num, max, min) {
        if(num === undefined || max === undefined) return 0;
        min = min || 0;
        num = this.lock(num, min, max);
        if(num < max) num++;
        else num = min;
        return num;
    }
}

const Entity = function() {

    const entities = [];

    const Length = function() {
        return entities.length;
    }

    const addEntity = function(type, x, y, w, h) {
        x = x || 0;
        y = y || 0;
        w = Dani.lock(w, 40) || 40;
        h = Dani.lock(h, 40) || 40;
        let speed = 5;

        if(type === 'char') {
            entities.push(new Character(x, y, w, h));
        } else if(type === 'enem') {
            entities.push(new Enemy(x, y, w, h));
        }
    }
    let deadEntities = [];
    function tick() {
        //sort entities based on their y
        entities.sort((a,b) => a.getY()-b.getY());
        for(const i in entities) {
            const entity = entities[i];
            entity.tick();

            testCollisions(entity);
            if(entity.getRemove()) {
                entities.splice(parseInt(i), 1);
                if(Dani.random(100) > 70)
                    gameVars.drops.drop('potion', entity.getX(), entity.getY());
            }
        }
    }

    function render() {
        for(const i in entities) {
            entities[i].render();
        }
    }

    function testCollisions(self) {
        const w = self.getW();
        const h = self.getH();
        const x = self.getX();
        const y = self.getY();

        // colliding with borders
        if(x - (w/2) < 0) self.setX(w/2);
        if(x + (w/2) > WIDTH) self.setX(WIDTH - w/2);
        if(y - h < 0) self.setY(h);
        if(y > HEIGHT) self.setY(HEIGHT);

        // colliding with walls
        //collisions
        const rightX = getBlockX(x + (w/2));
        const leftX = getBlockX(x - (w/2));
        const topY = getBlockY(y - h);
        const bottomY = getBlockY(y);

        const xLeft = getBlockX(x - (w/4))
        const xRight = getBlockX(x + (w/4));
        const yTop = getBlockY(y - (h*3/4));
        const yBottom = getBlockY(y - (h/4));

        // left collide
        if(collide(leftX, yBottom) || collide(leftX, yTop)) {
            self.setX(x + Math.abs(x - (w/2) - ((leftX + 1) * gameVars.level.size)));
            // x += Math.abs(x - (w/2) - ((leftX + 1) * gameVars.level.size));
        }
        // right collide
        if(collide(rightX, yBottom) || collide(rightX, yTop)) {
            self.setX(x - Math.abs(x + (w/2) - (rightX * gameVars.level.size)));
            // x -= Math.abs(x + (w/2) - (rightX * gameVars.level.size));
        }
        // top collide
        if(collide(xLeft, topY) || collide(xRight, topY)) {
            self.setY(y + Math.abs(y - h - ((topY + 1) * gameVars.level.size)))
            // y += Math.abs(y - h - ((topY + 1) * gameVars.level.size));
        }
        // bottom collide
        if(collide(xLeft, bottomY) || collide(xRight, bottomY)) {
            self.setY(y - Math.abs(y - (bottomY * gameVars.level.size)));
            // y -= Math.abs(y - (bottomY * gameVars.level.size));
        }
    }

    
    function getBlockX(x) {
        return Math.floor(x/gameVars.level.size);
    }
    function getBlockY(y) {
        return Math.floor(y/gameVars.level.size);
    }
    function collide(x, y) {
        try {
            return gameVars.level.block[x][y].id === Tile.wall;
        } catch {
            return false;
        }
    }

    return {
        addEntity,
        tick,
        render,
        Length
    }
}

const Character = function(x, y, w, h) {
    x = x || 0;
    y = y || 0;
    w = w || 50;
    h = h || 50;
    let speed = 7;
    let xDir = 1;

    let hX = 0;
    let hY = 0;
    let hW = 16;
    let hH = 16;

    let walkAnim = 2;
    let walking = false;
    let walkCount = 0;
    const walkCounter = 5;
    
    let canRemove = false;

    function setX(val) {
        x = val;
    }
    function setY(val) {
        y = val;
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

    function tick() {
        if(!playerDead) {
            if(movingUp) {
                y -= speed;
            }
            if(movingDown) {
                y += speed;
            }
            if(movingLeft) {
                x -= speed;
                xDir = -1;
            }
            if(movingRight) {
                x += speed;
                xDir = 1;
            }
            if(!movingDown && !movingLeft && !movingRight && !movingUp) {
                walking = false;
            } else {
                walking = true;
            }

            playerX = x;
            playerY = y;
            playerBX = (Math.floor((x- 5)/gameVars.level.size) * gameVars.level.size) + w/2;
            playerBY = (Math.floor((y- 10)/gameVars.level.size) * gameVars.level.size) + h;

            if(xDir === -1) {
                hY = 1;
            } else {
                hY = 0;
            }
            if(walking) {
                if(walkCount >= walkCounter) {
                    walkCount = 0;
                    hX = Dani.cycle(hX, walkAnim, 1);
                } else {
                    walkCount++;
                }
            } else {
                walkCount = 0;
                hX = 0;
            }

            if(punching && punchCord.x === 0 && punchCord.y === 0) {
                punchCord.x = x;
                punchCord.y = y - (h/2);
                hX = 3;
            } else if(!punching) {
                punchCord.x = 0;
                punchCord.y = 0;
            }

            if(punchBack.length > 0) {
                for(const i in punchBack) {
                    var newX = punchBack[i].x;
                    var newY = punchBack[i].y;
                    var xx = newX-x;
                    var yy = newY-(y - h/2);
                    var distance = Math.sqrt((xx * xx) + (yy * yy));
                    var angleRad = Math.atan2(yy, xx);
                    var angleDeg = angleRad/Math.PI*180;
                    var rotation = angleDeg;
                    var enemyD = punchBack[i].w;
                    var playerD = w/2;
                    if(distance < (enemyD + playerD)) { //&& !gotHit) {
                        hX = 4; //hurt
                        // gotHit = true;
                        playerHealth -= 10;
                        playerHealth = Dani.lock(playerHealth, 0, playerMaxHealth);

                        var xMov = Math.cos(rotation*(Math.PI/180));
                        var yMov = Math.sin(rotation*(Math.PI/180));
                        x -= xMov*playerD;
                        y -= yMov*playerD;
                        if(playerHealth <= 0) {
                            playerDead = true;
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
            hX = 5; //dead
        }
    }

    function render() {
        // draw('charr', playerBX, playerBY, w+5, h+5);

        drawImg('player', x-(w/2), y-h, w, h, hX*hW, hY*hH, hW, hH);
        drawImg('health', 10, 414, 160, 32, 0, 0, 80, 16); //health border
        drawImg('health', 10, 414, 160/playerMaxHealth*playerHealth, 32, 0, 16, 80/playerMaxHealth*playerHealth, 16); //health itself
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
        getRemove
    }
}


const Enemy = function(x, y, w, h) {
    x = x || 0;
    y = y || 0;
    w = w || 50;
    h = h || 50;
    

    let hX = 0;
    let hY = 0;
    let hW = 16;
    let hH = 16;

    let walkAnim = 2;
    let walking = false;
    let walkCount = 0;
    const walkCounter = 5;

    let attackCount = 0;
    const attackCounter = 10;

    let removeCount = 0;
    const removeCounter = 50;

    const maxHealth = 40;
    let health = maxHealth;
    let gotHit = false;
    let isDead = false;
    let canRemove = false;

    let speed = 4;

    
    function setX(val) {
        x = val;
    }
    function setY(val) {
        y = val;
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

    let xMove = 0;
    let yMove = 0;
    let blX = 0;
    let blY = 0;
    let followingPlayer = 'idle';
    let xDir = 1;
    
    var nextMoves;
    var nextMove;
    var targetMet = true;
    function tick() {
        if(!isDead) {
            if(followingPlayer === 'path') {
                blX = (Math.floor((x- 5)/gameVars.level.size) * gameVars.level.size) + w/2;
                blY = (Math.floor((y- 10)/gameVars.level.size) * gameVars.level.size) + h;
                const playersX = Math.floor(playerBX/gameVars.level.size);
                const playersY = Math.floor(playerBY/gameVars.level.size);
                const blockX = Math.floor(blX/gameVars.level.size);
                const blockY = Math.floor(blY/gameVars.level.size);
                nextMoves = gameVars.level.path({x: blockX, y: blockY}, {x:playersX, y:playersY});
                if(nextMoves.length === 0) {
                    walking = false;
                } else {
                    walking = true;
                    
                    if(targetMet) {
                        nextMove = nextMoves[1];
                        targetMet = false;
                    }

                    var newX = nextMove.x * gameVars.level.size + w/2;
                    var newY = nextMove.y * gameVars.level.size + h;
                    var xx = newX-x;
                    var yy = newY-y;
                    var angleRad = Math.atan2(yy, xx);
                    var angleDeg = angleRad/Math.PI*180;
                    var distance = Math.sqrt((xx * xx) + (yy * yy));
                    
                    var rotation = angleDeg;
                    var xMov = Math.cos(rotation*(Math.PI/180));
                    var yMov = Math.sin(rotation*(Math.PI/180));
                    x += xMov*speed;
                    y += yMov*speed;

                    xDir = xMov >= 0 ? 1 : -1;
                    
                    if(distance < speed) {
                        targetMet = true;
                    }
                }

            } else if(followingPlayer === 'chase') {
                var newX = playerX;
                var newY = playerY;
                var xx = newX-x;
                var yy = newY-y;
                var angleRad = Math.atan2(yy, xx);
                var angleDeg = angleRad/Math.PI*180;

                var distance = Math.sqrt((xx * xx) + (yy * yy));
                
                var rotation = angleDeg;
                if(distance > speed) {
                    walking = true;
                    var xMov = Math.cos(rotation*(Math.PI/180));
                    var yMov = Math.sin(rotation*(Math.PI/180));
                    x += xMov*speed;
                    y += yMov*speed;
                    xDir = xMov >= 0 ? 1 : -1;
                } else {
                    walking = false;
                }
            } else if(followingPlayer === 'idle') {
                x += xMove * speed;
                y += yMove * speed;
                if(Dani.random(100) > 97) {
                    xMove = parseInt(Dani.random([-1, 0, 1], 1));
                    yMove = parseInt(Dani.random([-1, 0, 1], 1));
                    if(xMove === 1 || xMove === -1) {
                        xDir = xMove;
                    }
                }
                if(xMove === 0 && yMove === 0) {
                    walking = false;
                } else {
                    walking = true;
                }
            }

            if(Dani.random(100) > 98) {
                followingPlayer = Dani.random(['idle', 'chase', 'path'], 1);
                // followingPlayer = 'path'
            }

            if(xDir === -1) {
                hY = 1;
            } else {
                hY = 0;
            }
            
            if(walking) {
                if(walkCount >= walkCounter) {
                    walkCount = 0;
                    hX = Dani.cycle(hX, walkAnim, 1);
                } else {
                    walkCount++;
                }
            } else {
                walkCount = 0;
                hX = 0;
            }
            let nearPlayer = nearChar();
            if(!playerDead && nearPlayer) {
                if(attackCount >= attackCounter) {
                    attackCount = 0;
                    hX = 3; //punch
                    punchBack.push({x, y:y - (h/2), w:w/2});
                } else {
                    attackCount++;
                }
            }

            if(punching) {
                var newX = punchCord.x;
                var newY = punchCord.y;
                var xx = newX-x;
                var yy = newY-(y - h/2);
                var distance = Math.sqrt((xx * xx) + (yy * yy));
                var angleRad = Math.atan2(yy, xx);
                var angleDeg = angleRad/Math.PI*180;
                var rotation = angleDeg;
                var enemyD = w/2;
                if(distance < (enemyD + playerReach) && !gotHit) {
                    hX = 4; //hurt
                    gotHit = true;
                    health -= playerStrength;
                    health = Dani.lock(health, 0, maxHealth);

                    var xMov = Math.cos(rotation*(Math.PI/180));
                    var yMov = Math.sin(rotation*(Math.PI/180));
                    x -= xMov*playerReach;
                    y -= yMov*playerReach;
                    if(health <= 0) {
                        isDead = true;
                        gameVars.score.add(defaultScoreToAdd);
                    }
                }
            } else {
                gotHit = false;
            }
        } else {
            if(removeCount >= removeCounter) {
                removeCount = 0;
                canRemove = true;
            } else {
                removeCount++;
            }
            hX = 5; //dead
        }
    }

    function render() {
        // for(let i in nextMoves)
        //     draw('enemm', nextMoves[i].x * gameVars.level.size + w/2, nextMoves[i].y * gameVars.level.size + h, w, h);
        drawImg('enemy', x-(w/2), y-h, w, h, hX*hW, hY*hH, hW, hH);
    }

    function nearChar() {
        var newX = playerX;
        var newY = playerY;
        var xx = newX-x;
        var yy = newY-(y - h/2);
        var distance = Math.sqrt((xx * xx) + (yy * yy));
        
        var enemyD = w;
        if(distance < (enemyD)) {
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
        getRemove
    }
}

Texture = function(pathRef) {

    var textureList = ["player", "wall", "floor", "enemy", "health", "potion"];
    var textures = {};
    
    var path = pathRef ? pathRef : "textures/";

    var preloadimages = async function(){
        var texxture;
        for (var i in textureList) {
            texxture = textureList[i];
            textures[texxture] = new Image();
            textures[texxture].onerror = async function() {
                var textyure = this.src.split(path)[1].split('.')[0];
                
                this.onerror = async function() {
                    for(var j = 0; j < textureList.length; j++){ 
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
        textureList:textureList,
        textures:textures
    }
}

function drawImg(obj, x, y, w, h, dx, dy, dw, dh) {
    const width = panel.canvasWidth();
    const scale = width/WIDTH;
    dx = dx || 0;
    dy = dy || 0;
    dw = dw || gameVars.texture.textures[obj].width;
    dh = dh || gameVars.texture.textures[obj].height;

    x *= scale;
    y *= scale;
    w *= scale;
    h *= scale;
    
   screen.drawImage(gameVars.texture.textures[obj], dx, dy, dw, dh, x, y, w, h);
}

function drawTxt(string, x, y, h) {
    const width = panel.canvasWidth();
    const scale = width/WIDTH;
    h = parseInt(h) || 10;
    x *= scale;
    y *= scale;
    h *= scale;
    h = parseInt(h);
    
    screen.fillStyle = 'white';
    screen.font = `${h}px Hellovetica`;
    screen.fillText(string, x, y+h);

//    screen.drawImage(gameVars.texture.textures[obj], dx, dy, dw, dh, x, y, w, h);
}

const Tile = {
    floor: 'floor',
    wall: 'wall'
}

function Level(w, h) {
    w = w || 10;
    h = h || 10;
    this.size = 50;
    this.block = [];
    for(let x = 0; x < w; x++) {
        this.block[x] = [];
        for(let y = 0; y < h; y++) {
            this.block[x][y] = {id:Tile.floor};
        }
    }
    

    
    for(let x = 0; x < w; x++) {
        const y = 8;
        this.block[x][y].id = Tile.wall;
    }

    this.tick = function() {
    }
    this.render = function() {      
         
        for(let x = 0; x < w; x++)
            for(let y = 0; y < h; y++) {   
                drawImg(this.block[x][y].id, x * this.size, y * this.size, this.size, this.size);

        }
    }
    this.path = function(startPos, endPos) {
        const block = this.block;
        const map = {};
        for(let x = 0; x < w; x++) {
            map[x] = [];
            for(let y = 0; y < h; y++) {
                map[x][y] = {taken: false, num: 0, roots:[]};
            }
        }

        function spreadPath(id, x, y) {
            try {
                // if(!map[x][y].taken && block[x][y].id !== Tile.wall) {
                map[x][y].taken = true;
                map[x][y].num = id;
                if(map[x][y].roots.length === 0) map[x][y].roots = [{x, y}];
                attemptSpread(id, x+1, y, Dani.cloneObject(map[x][y].roots));
                attemptSpread(id, x, y+1, Dani.cloneObject(map[x][y].roots));
                attemptSpread(id, x-1, y, Dani.cloneObject(map[x][y].roots));
                attemptSpread(id, x, y-1, Dani.cloneObject(map[x][y].roots));
                // }
            } catch (e) {
                // console.warn(e.message, x, y)
            }
        }
        const spreadsLeft = [];
        function attemptSpread(id, x, y, roots) {
            try {
                if(!map[x][y].taken && block[x][y].id !== Tile.wall && !pathFound) {
                    map[x][y].taken = true;
                    map[x][y].num = id + 1;
                    map[x][y].roots = roots;
                    map[x][y].roots.push({x, y});
                    if(x === endPos.x && y === endPos.y) {
                        pathFound = true;
                        properPath = map[x][y].roots;
                        return;
                    }
                    spreadsLeft.push({id, x, y});
                }
            } catch (e) {
                // console.warn(e.message, x, y)
            }
        }
        let pathFound = false;
        let properPath = [];

        spreadPath(0, startPos.x, startPos.y);
        for(let i = 0; i < spreadsLeft.length; i++) {
            if(pathFound) break;
            spreadPath(i+1, spreadsLeft[i].x, spreadsLeft[i].y);
            if(spreadsLeft[i].x === endPos.x && spreadsLeft[i].y === endPos.y) {
                //pathFound = true;
                break;
            }
        }
        return properPath;
    }
}



function Spawner() {
    const maxEnems = 5;
    const spawn = function() {
        if(!PAUSED && gameVars.entities.Length() < maxEnems) {
            const x = parseInt(Dani.random([0, (lW-1)], 1)) * gameVars.level.size;
            const y = parseInt(Dani.random([0, (lH-1)], 1)) * gameVars.level.size;
            gameVars.entities.addEntity('enem', x, y);
        }
    }
    return {
        spawn
    }
}

function Drops() {
    const size = 25;
    const items = [];
    const ticker = 50;
    const drop = function(name, x, y) {
        items.push({name, x, y});
    }
    function tick() {
        for(const i in items) {
            const item = items[i];
            if(!item.ticker) item.ticker = 1;
            else (item.ticker++);
            if(item.ticker >= ticker)
                items.splice(parseInt(i), 1);

            if(nearChar(item.x, item.y, size, size)) {
                if(item.name === 'potion') {
                    items.splice(parseInt(i), 1);
                    playerHealth += 10;
                    playerHealth = Dani.lock(playerHealth, 0, playerMaxHealth);
                    continue;
                }
            }
        }
    }
    function render() {
        for(const i in items) {
            const item = items[i];
            drawImg(item.name, item.x - (size/2), item.y - (size), size, size);
        }
    }

    function nearChar(x, y, w, h) {
        var newX = playerX;
        var newY = playerY - 20;
        var xx = newX-x;
        var yy = newY-(y - h/2);
        var distance = Math.sqrt((xx * xx) + (yy * yy));
        
        var thisD = w/2;
        if(distance < (playerReach + thisD)) {
            return true
        }
        return false;
    }

    return {
        drop,
        tick,
        render
    }
}

function Score() {
    function add(val) {
        score += val;
    }
    function render() {
        drawImg('health', 195, 414, 250, 32, 0, 0, 80, 16); //health border
        drawTxt(`Score: ${score}`, 200, 409, 32);
    }
    return {
        add,
        render
    }
}

async function main() {

    gameVars.texture = await new Texture('textures/');

    gameVars.level = new Level(lW, lH);
    

    gameVars.entities = new Entity();
    gameVars.entities.addEntity('char', 250, 200, 50, 50);

    gameVars.spawner = new Spawner();
    gameVars.drops = new Drops();

    gameVars.score = new Score(); 
    
    setInterval(run, 50);
    setInterval(function() {
        gameVars.spawner.spawn();
    }, 2000);

}

function tick() {
    gameVars.level.tick();
    gameVars.drops.tick();
    gameVars.entities.tick();
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
    gameVars.score.render();
}

function run() {
    if(!PAUSED) {
        tick();
        render();
    } else {
        screen.fillStyle = 'blue';
        screen.font = '50px Arial';
        screen.fillRect(190, 200, 230, 50);
        screen.fillStyle = 'black';
        screen.fillText('PAUSED', 200, 230);
    }
}

window.onload = function() {
    main();
    stage.tabIndex = 1000;
    stage.style.outline = "none";
    stage.addEventListener("keydown", keyIsDown);
    stage.addEventListener("keyup", keyIsUp);
    // stage.addEventListener('click', function() { console.log('canvas clicked')}, false); 
}


function keyIsUp(e) {
    // console.log(e.target === stage)
    e.preventDefault();
    if(e.keyCode === 80) //P
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
        case 32: // space
            punching = cond;
            break;
        case 80: //P
            if(pressOnly)
                PAUSED = !PAUSED;
            break;
        default:
            console.log('not moving really', key )
    }
}
