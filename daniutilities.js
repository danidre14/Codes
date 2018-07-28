var Dani = {   
    baseXVals:["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","@","#","%"],
    
    sum:function(a, b) {
        return a + b;
    },

    difference:function(a, b) {
        return a - b;
    },

    product:function(a, b) {
        return a * b;
    },

    quotient:function(a, b) {
        return a / b;
    },

    remainder:function(a, b) {
        return a % b;
    },

    random:function(a, b) {
        var result;
        if(a !== null && typeof a === "object") {
            //treat as list
            if(b === 1)
                result = a[this.random(a.length-1)];
            else
                result = this.cloneObject(a).sort(function() {
                    return Math.random()>.5?-1:1;
                });
        } else if(typeof a === "string") {
            //treat as string
            if(b === 1)
                result = a.split("")[this.random(a.length-1)];
            else
                result = a.split("").sort(function() {
                    return Math.random()>.5?-1 :1;
                }).join("");
        } else if(typeof a === "number") {
            //treat as number
            if(typeof b === "number") {
                //treat as range
                result = Math.round(Math.random() * (b - a)) + a;
            } else {
                //treat as number
                result = Math.round(Math.random() * a);
            }
        } else {
            //treat as val between 0 and 1
            result = Math.random();
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

    sortObjects:function(keys, orders) {
        var varA, varB;
        return function(a, b) {
            for(var i = 0; i < keys.length; i++) {
                if(!a.hasOwnProperty(keys[i]) || !b.hasOwnProperty(keys[i])) {
                    return 0; 
                }

                varA = (typeof a[keys[i]] === 'string') ? a[keys[i]].toUpperCase() : a[keys[i]];
                varB = (typeof b[keys[i]] === 'string') ? b[keys[i]].toUpperCase() : b[keys[i]];

                if (varA > varB)
                    return orders[i] === -1? -1 : 1;
                else if (varA < varB)
                    return orders[i] === -1? 1 : -1;
            }    
        };
    },
    
    baseTenToX:function(value, x) {
        value = String(value);
        if(x > this.baseXVals.length) {
            throw "Error: Conversion to Base " + x + " not supported.";
            return 0;
        }
        var rem = [];
        while(value != 0) {
            rem.push(this.baseXVals[(value % x)]);
            value = Math.floor(value / x);
        }
        return rem.reverse().join("");
    },
    
    baseXToTen:function(value, x) {
        value = String(value);
        if(x > this.baseXVals.length) {
            throw "Error: Conversion from Base " + x + " not supported.";
            return 0;
        }
        var digits = value.split("").reverse();
        var val = 0;
        for(var i in digits) {        
            val += (this.baseValHas(digits[i], x) * Math.pow(x, i));
        }
        return val;
    },
    
    baseXToY:function(value, x, y) {
        value = String(value);
        var decimal = this.baseXToTen(value, x);
        return this.baseTenToX(decimal, y);
    },
    
    baseValHas:function(digit, x) {
        var y = this.baseXVals.indexOf(digit);
        if(y === -1 || y >= x) {
            throw "Error: Out of Base " + x + " data range: " + digit;
            return 0;
        }
        return y;
    },
    
    fillString:function(string, filler, limit) {
        for(var i = string.length; i < limit; i++) {
            string = string.split("");
            string.unshift(filler);
            string = string.join("");
        }
        return string;
    },
    
    stringLength:function(value) {
        value = String(value);
        return value.length;
    },
    
    crypt:function(string, x, i, mode) {
        i = parseInt(this.baseXToY(i, x, 10));
        string = string.split("");
        for(var j in string) {
            string[j] = parseInt(this.baseXToY(string[j], x, 10));
            string[j] = this.shiftText(string[j], x, (mode? i : -i));
            string[j] = this.baseXToY(string[j], 10, x);
        }
        string = string.join("");
        return string;
    },
    
    encrypt:function(string, x, i) {
        return this.crypt(string, x, i, true);
    },
    
    decrypt:function(string, x, i) {
        return this.crypt(string, x, i, false);
    },
    
    shiftText:function(s, x, i) {
        s += i;
        x -= 1;
        if(s > x) s -= x;
        else if(s < 0) s += x;
        return s;
    },

    trace:function(msg) {
        console.log(msg);
    },
    
    getVersion:"Version 1.45"
};
