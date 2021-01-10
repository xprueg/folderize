import { panic } from "./panic.mjs";

export default class DateDir {
    #struct;
    #dtfmt;

    /// Creates a new `DateDir` instance.
    ///
    /// [>] struct :: string
    /// [>] locale :: string
    /// [<] DateDir
    constructor(struct, locale) {
        this.#struct = struct;
        this.#dtfmt = {
            e: new Intl.DateTimeFormat(locale, { day: "numeric" }),
            d: new Intl.DateTimeFormat(locale, { day: "2-digit" }),
            m: new Intl.DateTimeFormat(locale, { month: "2-digit" }),
            b: new Intl.DateTimeFormat(locale, { month: "short" }),
            B: new Intl.DateTimeFormat(locale, { month: "long" }),
            Y: new Intl.DateTimeFormat(locale, { year: "numeric" }),
            y: new Intl.DateTimeFormat(locale, { year: "2-digit" }),
        };
    }

    /// [§] DateDir::constructor
    static new(...args) {
        return new DateDir(...args);
    }

    /// Returns "self.#struct" with the variables replaced.
    ///
    /// [>] date: Date
    /// [!] Panic
    /// [<] string
    fmt(date) {
        if (!(date instanceof Date))
            panic`Argument "date" must be a Date instance`;

        return this.#struct.replace(
            /%(\w)/g,
            (_, opt) => this.#dtfmt[opt].format(date)
        );
    }
}