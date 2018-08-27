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
        var random = this.pseudo.random();
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
    
   pseudo:{
        s:Math.round(Math.random()*999999999),
        index:4
    },
    
    pRandom:function() {
        var s = this.pseudo.s + Date.now();
        var a = s.toString().split("");
        var b = 0;
        for(var i in a)
            b += parseInt(a[i]);
        var c = s * b;
        this.pseudo.s = parseInt(c.toString().substr(0, this.pseudo.index)) + 1;
        var d = Math.pow(10, this.pseudo.s.toString().length);
        var e = "0." + this.fillString((this.pseudo.s / d).toString().substr(2), "0", this.pseudo.index);
        return parseFloat(e);
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
        if(this.isInteger(x)) 
            x = parseInt(x);
        else {
            throw "Error: Base " + x + " ILLEGAL";
            return value;
        }
        value = String(value).trim();
        if(!this.baseXSupported(x)) {
            throw "Error: Base " + x + " not supported.";
            return value;
        } else if(x === 1) {
            if(value == 0 || value === "")
                return "";
            else
                return this.fillString(this.fillString("", "0", value), "0", 1);
        }
        if(value === "")
            return "";
        var rem = [];
        do {
            rem.push(this.baseXVals[(value % x)]);
            value = Math.floor(value / x);
        } while(value != 0);
        return rem.reverse().join("");
    },
    
    baseXToTen:function(value, x) {
        if(this.isInteger(x)) 
            x = parseInt(x);
        else {
            throw "Error: Base " + x + " ILLEGAL";
            return value;
        }
        value = String(value);
        if(!this.baseXSupported(x)) {
            throw "Error: Base " + x + " not supported.";
            return value;
        }       
        if(x === 1) {
            if(value === "")
                return 0;
            else if(this.isInteger(value) && parseInt(value)===0)
                return this.stringLength(value);
            else {
                throw "Error: Base 1 should only contain 0s ";
                return value;
            }
        }        
        var digits = value.split("").reverse();
        var val = (value === "")? "" : 0;
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
    
    baseXSupported:function(x) {
        return (x <= this.baseXVals.length && x >= 1);
    },
    
    baseXDataRange:function(x) {
        if(this.isInteger(x)) 
            x = parseInt(x);
        else {
            throw "Error: Base " + x + " ILLEGAL";
            return x;
        }
        var dataRange = [];   
        if(!this.baseXSupported(x)) {
            throw "Error: Base " + x + " not supported.";
            return x;
        } else {
            for(var i = 0; i < x; i++)
                dataRange.push(this.baseXVals[i]);
        }
        return this.cloneObject(dataRange);
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
        if(isNaN(parseInt(limit))) {
            throw "Error: Cannot fill string " + limit + " times.";
            return string;
        }
        limit = parseInt(limit);
        for(var i = this.stringLength(string); i < limit; i++) {
            string = filler + "" + string;
        }
        return string;
    },
    
    stringLength:function(value) {
        value = String(value);
        return value.length;
    },
    
    isNumber:function(value) {
        return /^[0-9]+(\.)?[0-9]*$/.test(value);
    },
    
    isInteger:function(value) {
        return /^\d+$/.test(value);
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
        if(s > (x-1)) s -= x;
        else if(s < 0) s += x;
        return this.fillString(s, "0", 1);
    },
    
    sign:function(x) {
        return ((x > 0) - (x < 0)) || +x;
    },
   
    trace:function(msg) {
        console.log(msg);
    },
    
    getVersion:function() {
        return "Version 0.690";
    }
};
