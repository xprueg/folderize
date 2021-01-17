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
  static new(...args) {
    return new Copy(...args);
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
  /// {*} Replace inverted exclude with match function if available.
  /// [>] fullname: string
  /// [!] Panic
  /// [e] skip?(fullname: string)
  /// [e] file_copied?(void)
  /// [<] void
  copy_file(fullname) {
    try {
      if (this.#lookup.contains(fullname))
        return void this.emit("skip", fullname);

      // Create/Find the destination folder
      const stat = fs.lstatSync(fullname);
      const datedir_segments = this.#datedir.fmt(stat.mtime).split("/");
      let folder_out = this.#out_dir;
      datedir_segments.forEach(segment => {
        // Exists, foldername not changed.
        if (fs.existsSync(path.join(folder_out, segment)))
          return ((folder_out = path.join(folder_out, segment)));

        // Exists, foldername changed.
        for (let folder of Read.dir(folder_out).collect(Read.DIR, Read.FLAT)) {
          for (let inode of Read.dir(folder).exclude(/^(?!.*\.folderize\.inode)/).collect(Read.FILE, Read.FLAT)) {
            if (segment === fs.readFileSync(inode, "utf8"))
              return ((folder_out = folder));
          };
        };

        // Does not exist, create.
        fs.mkdirSync((folder_out = path.join(folder_out, segment)));
        fs.writeFileSync(path.join(folder_out, ".folderize.inode"), segment);
      });

      // Copy file.
      for(let fullname_out = path.join(folder_out, path.basename(fullname));;) {
        try {
          fs.copyFileSync(fullname, fullname_out, fs.constants.COPYFILE_EXCL);
          fs.utimesSync(fullname_out, stat.atime, stat.mtime);
          this.#lookup.push(fullname_out);
          break;
        } catch (err) {
          if (err.code === "EEXIST")
            fullname_out = get_unique_filename(fullname_out);
          else throw err;
        }
      }

      this.emit("file_copied");
    } catch(err) {
      panic(err)`Could not copy file [u]${fullname}[/u]`;
    }
  }
}