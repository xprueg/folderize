import { unique_filename, unique_contents } from "./unique.mjs";

export default class Testfile {
    constructor(opts = Object.create(null)) {
        this.dir = opts.dir ?? String();
        this.name = opts.name ?? unique_filename(opts.ext);
        this.mtime = new Date(opts.mtime ?? (new Date()).toGMTString());
        this.contents = opts.contents ?? unique_contents();
    }

    /// [§] Testfile::constructor
    static new(opts) {
        return new Testfile(opts);
    }
}