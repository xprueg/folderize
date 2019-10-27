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

module.exports = exports = class FileCopy {
  constructor(argv_util) {
    this.src = argv_util.get_value("--input");
    this.dst = argv_util.get_value("--output");
    this.index_dst_completely = !argv_util.is_set("--noindex");
    this.date_util = util.date(argv_util.get_value("--locale"));
    this.dst_file_lookup;

    util.console.log(
      `${this.src.map(s => `← \`${s}'`).join("\n")}\n→ \`${this.dst}'.`,
      util.console.constants.LEADING_SPACE
    );

    new file_lookup(this.dst, file_lookup => {
      this.dst_file_lookup = file_lookup;

      this.src.forEach(src => {
        util.console.log("[b]Copying files[/b]", util.console.constants.LEADING_SPACE);
        util.console.log(`← ${src}`);

        this.folder_stats = util.fs.get_folder_stats(src);
        this.progress = new util.progress(
          this.folder_stats,
          "Copied __PROGRESS__% (__CURRENTCOUNT__/__TOTALCOUNT__)__IF:SKIPPED=, Skipped __SKIPPED__ file(s):FI__"
        );

        util.console.log(`Found [u]${this.folder_stats.files} file(s)[/u] in [u]${this.folder_stats.dirs} directories[/u].`);

        this.copy_folder(src);
      });
    }, this.index_dst_completely);
  }

  copy_folder(root) {
    fs.readdirSync(root, { withFileTypes: true })
      .filter(dirent => dirent.name[0] !== ".")
      .filter(dirent => !(dirent.isDirectory() && !this.copy_folder(path.join(root, dirent.name))))
      .map(file => {
        const filepath = path.join(root, file.name);
        const filehash = util.create_hash.sync(filepath);

        const lstat = fs.lstatSync(filepath);
        const ldate = this.date_util.extract(lstat.mtime);
        const dst_folder = path.join(this.dst, ldate.year, ldate.month, ldate.day);
        let dst_file = path.join(dst_folder, file.name);

        if (!this.index_dst_completely) {
          this.dst_file_lookup.index_dir(dst_folder);
        }

        if (this.dst_file_lookup.contains(filehash)) {
          this.progress.step({ SKIPPED: +1 });
          return;
        }

        if (!fs.existsSync(dst_folder)) {
          fs.mkdirSync(dst_folder, { recursive: true });
        }

        let rename_tries = 0;
        while(fs.existsSync(dst_file)) {
          const dst_file_parsed = path.parse(dst_file);
          dst_file = path.join(
            dst_file_parsed.dir,
            `${dst_file_parsed.name} (${++rename_tries})${dst_file_parsed.ext}`
          );
        }

        fs.copyFileSync(filepath, dst_file);
        fs.utimesSync(dst_file, lstat.atime, lstat.mtime);

        this.dst_file_lookup.add_hash(filehash);
        this.progress.step();
      });
  }
}
