import { randomBytes } from "crypto";

export const unique_filename = (function() {
    const names = new Set();
    return function unique(ext = ".txt", length = 10) {
        for (let n;;) {
            n = randomBytes(Math.ceil(length / 2)).toString("hex");
            n += ext;
            
            if (!names.has(n)) {
                names.add(n);
                return n;
            }
        }
    }
})();

export const unique_contents = (function() {
    const contents = new Set();
    return function unique(length = 2 ** 10) {
        for (let c;;) {
            c = randomBytes(Math.ceil(length / 2)).toString("hex");
            
            if (!contents.has(c)) {
                contents.add(c);
                return c;
            }
        }
    }
})();