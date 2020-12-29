import fs from "fs";
import path from "path";
import { EventEmitter } from "events";

import { Read, get_unique_filename } from "./utils/fs.mjs";
import { panic } from "./utils/panic.mjs";
import DateDir from "./utils/datedir.mjs";

export default class Copy extends EventEmitter {
  #lookup;
  #out_dir;
  #exclude;
  #datedir;

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
    this.#datedir = DateDir.new(opts.dirstruct, opts.locale);
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
      const folder_out = this.#datedir.mkdir(this.#out_dir, stat.mtime);
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
}