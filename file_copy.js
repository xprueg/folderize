"use strict";

const fs = require("fs");
const path = require("path");
const file_lookup = require("./file_lookup.js");
const util = {
     progress: require("./utils/progress.js")
};

const cli = require("./utils/console_util.js");
const { LEADING_SPACE } = cli.constants;
const ufs = require("./utils/fs.js");
const uhash = require("./utils/hash.js");

class FileCopy {
  static async create(src, dst, locale, is_full_indexed) {
    return new FileCopy(
      src, dst, locale,
      await file_lookup.create(dst, is_full_indexed)
    );
  }

  constructor(src, dst, locale, lookup) {
    this.src = src;
    this.dst = dst;
    this.formatter = {
      day: new Intl.DateTimeFormat(locale, { day: "numeric" }),
      month: new Intl.DateTimeFormat(locale, { month: "long" }),
      year: new Intl.DateTimeFormat(locale, { year: "numeric" })
    };
    this.dst_lookup = lookup;

    cli.log(
      `${this.src.map(s => `← \`${s}'`).join("\n")}\n→ \`${this.dst}'`,
      LEADING_SPACE
    );

    this.init();
  }

  init() {
    this.src.forEach(src => {
      cli.log("[b]Copying files[/b]", LEADING_SPACE);
      cli.log(`← ${src}`);

      this.folder_stats = ufs.get_folder_stats(src);
      this.progress = util.progress.to(this.folder_stats.files)
        .msg("Copied %P% (%C/%T)")
        .msg(", Skipped %SKP file(s)", args => args.hasOwnProperty("SKP"));

      cli.log(
        `Found [u]${this.folder_stats.files} file(s)[/u] in ` +
        `[u]${this.folder_stats.dirs} directories[/u].`
      );

      this.copy_folder(src);
    });
  }

  copy_folder(src_folder) {
    fs.readdirSync(src_folder, { withFileTypes: true }).forEach(file => {
      if (file.isDirectory()) {
        return void this.copy_folder(path.join(src_folder, file.name));
      }

      const src_path = path.join(src_folder, file.name);
      const src_hash = uhash.sync(src_path);
      const src_stat = fs.lstatSync(src_path);
      const src_mtime_date = new Date(src_stat.mtime);
      const src_date = {
        day: this.formatter.day.format(src_mtime_date),
        month: this.formatter.month.format(src_mtime_date),
        year: this.formatter.year.format(src_mtime_date)
      };

      const dst_folder = path.join(this.dst, src_date.year, src_date.month, src_date.day);
      const dst_path = path.join(dst_folder, file.name);

      if (!this.dst_lookup.is_full_indexed) {
        this.dst_lookup.index_dir(dst_folder);
      }

      if (this.dst_lookup.contains(src_hash)) {
        return void this.progress.update("SKP", +1).step();
      }

      if (!fs.existsSync(dst_folder)) {
        fs.mkdirSync(dst_folder, { recursive: true });
      }

      let dst_path_unique = dst_path;
      let is_copied = false;
      do {
        try {
          fs.copyFileSync(src_path, dst_path_unique, fs.constants.COPYFILE_EXCL);
          fs.utimesSync(dst_path, src_stat.atime, src_stat.mtime);
          is_copied = true;
        } catch(err) {
          if (err.code === "EEXIST") {
            dst_path_unique = ufs.get_unique_filename(dst_path);
          } else {
            throw err;
          }
        }
      } while (!is_copied);

      this.dst_lookup.add_hash(src_hash);
      this.progress.step();
    });
  }
}

module.exports = FileCopy;
