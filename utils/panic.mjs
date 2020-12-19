import { EOL } from "os";

export default class Panic extends Error {
    constructor(strings, props, cause = undefined) {
        super(Panic.#message(strings, props));

        this.name = this.constructor.name;
        this.cause = cause;

        // Assign props to the Error object.
        props.forEach(prop => {          
            if (Object.prototype.toString.call(prop) === "[object Object]")
                for (let [k, v] of Reflect.ownKeys(prop))
                    this[k.replace(/^\$/, String())] = v;
        });
    }

    static #message(strings, props) {
        return strings.reduce((m, str, i) => {
            let property = props[i - 1];
            if (Object.prototype.toString.call(property) === "[object Object]") {
                const [key, value] = Object.entries(property).shift();

                if (/^\$/.test(key))
                    property = value;
                else
                    property = `${key} ${value}`;
            }

            return m.concat(property, str);
        })
        .replace(/\n/g, String())
        .replace(/\s{2,}/g, String("\x20"))
        .trim();
    }

    toString() {
        let out = [this.message + "."];
        let error = this;
        while ((error = error.cause))
            out.push(error.message + ".");

        return out.join(EOL);
    }
}

/**
 * Throws a Panic error, optionally wraps another Error instance.
 * 
 * (1) panic(Error)
 *     Returns (2) with Error wrapped.
 * 
 * (2) panic`template ${literal}`
 *     Throws a Panic Error.
 * 
 * @throws {Panic}
 * @returns {(function|void)}
 */
export function panic(...params) {
    if (params.length === 0)
        panic`panic() requires at least one argument`;

    // (1)
    if (params[0] instanceof Error)
        return (strings, ...props) => {
            throw new Panic(strings, props, params[0]);
        }

    // (2)
    throw new Panic(params[0], params.slice(1));
}
