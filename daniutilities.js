var Dani = {
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

    trace:function(msg) {
        console.log(msg);
    }
};
