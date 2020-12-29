import path from "path";
import fs from "fs";

import { panic } from "./panic.mjs";
import { Read } from "./fs.mjs";

export default class DateDir {
    #struct;
    #dtfmt;

    constructor(struct, locale) {
        this.#struct = struct;
        this.#dtfmt = {
            e: new Intl.DateTimeFormat(locale, { day: "numeric" }),
            d: new Intl.DateTimeFormat(locale, { day: "2-digit" }),
            m: new Intl.DateTimeFormat(locale, { month: "2-digit" }),
            b: new Intl.DateTimeFormat(locale, { month: "short" }),
            B: new Intl.DateTimeFormat(locale, { month: "long" }),
            Y: new Intl.DateTimeFormat(locale, { year: "numeric" }),
            y: new Intl.DateTimeFormat(locale, { year: "2-digit" })
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

    /// Recursively creates the formatted "self.#struct" path for the given date.
    ///
    /// [>] date: Date
    /// [!] Panic
    /// [<] string
    mkdir(root, date) {
        let dir = root;
        
        if (this.#struct === String())
            return dir;

        try {
            this.fmt(date)
                .split("/")
                .forEach(segment => {
                    const folder = Read.dir(dir).collect(Read.DIR);

                    // Search and return existing folder.
                    for (let f of folder)
                        if (path.basename(f).normalize().startsWith(segment))
                            return void ((dir = f));

                    // Create non existing folder.
                    fs.mkdirSync((dir = path.join(dir, segment)));
                });

            return dir;
        } catch(err) {
            panic(err)`Could not create formatted directory`;
        }
    }
}