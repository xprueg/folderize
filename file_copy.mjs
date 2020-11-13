"use strict";

import fs from "fs";
import path from "path";

import progress from "./utils/progress.mjs";
const { LOADER } = progress.constants;
import { println } from "./utils/console.mjs";
import ufs from "./utils/fs.mjs";
import { hex_hash_sync } from "./utils/hash.mjs";
import glob_match from "./utils/glob.mjs";

export default class FileCopy {
  constructor(src, dst, locale, exclude, lookup) {
    this.src = src;
    this.dst = dst;
    this.exclude = exclude;
    this.dst_lookup = lookup;
    this.formatter = {
      day: new Intl.DateTimeFormat(locale, { day: "numeric" }),
      month: new Intl.DateTimeFormat(locale, { month: "long" }),
      year: new Intl.DateTimeFormat(locale, { year: "numeric" })
    };

    this.progress = null;
    this.init();
  }

  init() {
    const stats = ufs.get_folder_stats(this.src);

    this.progress = progress.to(stats.files)
      .loader(LOADER, "\x20\x20")
      .msg("Copied %P% (%C/%T)")
      .msg(", Skipped %SKP file(s)", tokens => tokens.hasOwnProperty("SKP"))
      .msg(", Excluded %EXCLF file(s)", tokens => tokens.hasOwnProperty("EXCLF"))
      .msg(", Excluded %EXCLD dir(s)", tokens => tokens.hasOwnProperty("EXCLD"))
      .msg(", done.", tokens => tokens.P === 100);

    println(`← Copying files from [u]${this.src}[/u].`);
    println(`\x20\x20Found ${stats.files} file(s) in ${stats.dirs} directories.`);

    this.copy_folder(this.src);
  }

  copy_folder(src_folder) {
    fs.readdirSync(src_folder, { withFileTypes: true }).forEach(file => {
      if (this.exclude &&
          this.exclude.filter(pattern => glob_match(pattern, file.name)).length > 0) {
        return void this.progress.update(file.isDirectory() ? "EXCLD" : "EXCLF", +1).step();
      }

      if (file.isDirectory()) {
        return void this.copy_folder(path.join(src_folder, file.name));
      }

      const src_path = path.join(src_folder, file.name);
      const src_hash = hex_hash_sync(src_path);
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

      this.dst_lookup.push(dst_path_unique);
      this.progress.step();
    });
  }
}