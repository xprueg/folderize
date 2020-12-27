import fs from "fs";
import path from "path";
import { EventEmitter } from "events";

import { Read, get_unique_filename } from "./utils/fs.mjs";
import { panic } from "./utils/panic.mjs";

export default class Copy extends EventEmitter {
  #lookup;
  #out_dir;
  #exclude;
  #dirstruct;
  #locale;

  #formatter;

  /// Creates a new `Copy` instance.
  ///
  /// [>] lookup: Lookup
  /// [>] opts: Object{ output: string, exclude: RegExp, dirstruct: string, locale: string }
  /// [<] Copy
  constructor(lookup, opts) {
    super();

    this.#lookup = lookup;
    this.#out_dir = opts.output;
    this.#exclude = opts.exclude;
    this.#dirstruct = opts.dirstruct;
    this.#locale = opts.locale;

    this.#formatter = {
      e: new Intl.DateTimeFormat(this.#locale, { day: "numeric" }),
      d: new Intl.DateTimeFormat(this.#locale, { day: "2-digit" }),
      m: new Intl.DateTimeFormat(this.#locale, { month: "2-digit" }),
      b: new Intl.DateTimeFormat(this.#locale, { month: "short" }),
      B: new Intl.DateTimeFormat(this.#locale, { month: "long" }),
      Y: new Intl.DateTimeFormat(this.#locale, { year: "numeric" }),
      y: new Intl.DateTimeFormat(this.#locale, { year: "2-digit" })
    };
  }

  /// [§] Copy::constructor
  static new(lookup, opts) {
    return new Copy(lookup, opts);
  }

  /// Copies the files from "dir" to the destination folder specified on creation.
  /// The created folder structure depends on the "self.#dirstruct" set.
  /// 
  /// [>] dir: string
  /// [!] Panic
  /// [<] void
  from(dir) {
    try {
      Read.dir(dir)
          .exclude(this.#exclude)
          .on_file((fullname) => this.copy_file(fullname))
          .iter();
    } catch(err) {
      panic(err)`Failed to copy [u]${dir}[/u]`;
    }
  }

  /// Copies the given file to the set output folder.
  /// Two events can be emitted during this function, namely:
  ///   · skip: A file is skipped because it is already indexed.
  ///   · file_copied: A file is successfully copied. 
  ///
  /// [>] fullname: string
  /// [!] Panic
  /// [e] skip?(fullname: string)
  /// [e] file_copied?(void)
  /// [<] void
  copy_file(fullname) {
    try {
      if (this.#lookup.contains(fullname))
        return void this.emit("skip", fullname);

      const stat = fs.lstatSync(fullname);
      const folder_out = this.mkdir_formatted(stat.mtime);
      let fullname_out = path.join(folder_out, path.basename(fullname));

      for(;;) {
        try {
          fs.copyFileSync(fullname, fullname_out, fs.constants.COPYFILE_EXCL);
          fs.utimesSync(fullname_out, stat.atime, stat.mtime);
          break;
        } catch (err) {
          if (err.code === "EEXIST")
            fullname_out = get_unique_filename(fullname_out);
          else throw err;
        }
      }

      this.#lookup.push(fullname_out);
      this.emit("file_copied");
    } catch(err) {
      panic(err)`Could not copy file [u]${fullname}[/u]`;
    }
  }

  /// Returns a formatted directory path based on the given "date"
  /// and the "self.#dirstruct" set. Recursively creates the path
  /// if it does not exist.
  ///
  /// [>] date: Date
  /// [!] Panic
  /// [<] string
  mkdir_formatted(date) {
    try {
      let dir = this.#out_dir;

      if (this.#dirstruct === String())
        return dir;

      this.#dirstruct
          .replace(/%(\w)/g, (_, opt) => this.#formatter[opt].format(date))
          .split("/")
          .forEach(segment => {
            const folder = Read.dir(dir).exclude(this.#exclude).collect(Read.DIR);

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