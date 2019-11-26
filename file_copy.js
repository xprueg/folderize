"use strict";

const fs = require("fs");
const path = require("path");
const file_lookup = require("./file_lookup.js");
const util = {
  create_hash: require("./utils/hash_util.js"),
         date: require("./utils/date_util.js"),
      console: require("./utils/console_util.js"),
           fs: require("./utils/fs_util.js"),
     progress: require("./utils/progress_util.js")
};

class FileCopy {
  constructor(src, dst, locale, lookup) {
    this.src = src;
    this.dst = dst;
    this.date_util = util.date(locale);
    this.dst_file_lookup = lookup;

    util.console.log(
      `${this.src.map(s => `← \`${s}'`).join("\n")}\n→ \`${this.dst}'.`,
      util.console.constants.LEADING_SPACE
    );

    this.init();
  }

  static async create(src, dst, locale, is_full_indexed) {
    return new FileCopy(
      src, dst, locale,
      await file_lookup.create(dst, is_full_indexed)
    );
  }

  init() {
    this.src.forEach(src => {
      util.console.log("[b]Copying files[/b]", util.console.constants.LEADING_SPACE);
      util.console.log(`← ${src}`);

      this.folder_stats = util.fs.get_folder_stats(src);
      this.progress = new util.progress(
        this.folder_stats,
        "Copied __PROGRESS__% (__CURRENTCOUNT__/__TOTALCOUNT__)" +
        "__IF:SKIPPED=, Skipped __SKIPPED__ file(s):FI__"
      );

      util.console.log(
        `Found [u]${this.folder_stats.files} file(s)[/u] in ` +
        `[u]${this.folder_stats.dirs} directories[/u].`
      );

      this.copy_folder(src);
    });
  }

  copy_folder(root) {
    const files = util.fs.get_dirents(root);

    for (let i = 0; i < files.length; ++i) {
      const file = files[i];

      if (file.isDirectory()) {
        this.copy_folder(path.join(root, file.name));
        continue;
      }

      const src_file = path.join(root, file.name);
      const filehash = util.create_hash.sync(src_file);
      const filestat = fs.lstatSync(src_file);
      const datestat = this.date_util.extract(filestat.mtime);

      const dst_folder = path.join(this.dst, datestat.year, datestat.month, datestat.day);

      if (!this.dst_file_lookup.is_full_indexed) {
        this.dst_file_lookup.index_dir(dst_folder);
      }

      if (this.dst_file_lookup.contains(filehash)) {
        this.progress.step({ SKIPPED: +1 });
        continue;
      }

      if (!fs.existsSync(dst_folder)) {
        fs.mkdirSync(dst_folder, { recursive: true });
      }

      util.fs.copy_file(src_file, path.join(dst_folder, file.name), filestat);

      this.dst_file_lookup.add_hash(filehash);
      this.progress.step();
    }
  }
}

module.exports = exports = FileCopy;