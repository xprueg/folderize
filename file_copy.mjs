import fs from "fs";
import path from "path";

import progress from "./utils/progress.mjs";
const { LOADER } = progress.constants;
import { println } from "./utils/console.mjs";
import { get_unique_filename, Read } from "./utils/fs.mjs";

export default class FileCopy {
  constructor(src, dst, locale, exclude, lookup, dirstruct) {
    this.src = src;
    this.dst = dst;
    this.exclude = exclude;
    this.dst_lookup = lookup;
    this.dirstruct = dirstruct;
    this.formatter = {
      e: new Intl.DateTimeFormat(locale, { day: "numeric" }),
      d: new Intl.DateTimeFormat(locale, { day: "2-digit" }),
      m: new Intl.DateTimeFormat(locale, { month: "2-digit" }),
      b: new Intl.DateTimeFormat(locale, { month: "short" }),
      B: new Intl.DateTimeFormat(locale, { month: "long" }),
      Y: new Intl.DateTimeFormat(locale, { year: "numeric" }),
      y: new Intl.DateTimeFormat(locale, { year: "2-digit" })
    };

    this.progress = null;
    this.init();
  }

  init() {
    const stats = Read.dir(this.src).exclude(this.exclude).count(Read.FILE | Read.DIR);

    this.progress = progress.to(stats.file)
      .loader(LOADER, "\x20\x20")
      .msg("Copied %P% (%C/%T)")
      .msg(", Skipped %SKP file(s)", tokens => tokens.hasOwnProperty("SKP"))
      .msg(", done.", tokens => tokens.P === 100);

    println(`← Copying files from [u]${this.src}[/u].`);
    println(`\x20\x20Found ${stats.file} file(s) in ${stats.dir} directories.`);

    const copy_err = Read.dir(this.src).on_file((fullname) => {
      const err = this.copy_file(fullname);
    }).exclude(this.exclude).iter();
  }

  get_dst_folder(mtime) {
    const mtime_date = new Date(mtime);
    const struct = this.dirstruct.replace(/%(\w)/g, (_, match) => {
      return this.formatter[match].format(mtime_date);
    })

    return path.join(this.dst, struct);
  }

  /**
   * Copies the provided file from src to dst.
   * @todo Handle all possible errors. (lstatSync, mkdirSync, …)
   * @param {string} fullname - File to copy.
   * @returns {?string} Error message or null on success. 
   */
  copy_file(fullname) {
    const contains = this.dst_lookup.contains(fullname);

    if (contains)
      return void this.progress.update("SKP", +1).step();

    const src_stat = fs.lstatSync(fullname);
    const dst_folder = this.get_dst_folder(src_stat.mtime);
    if (!fs.existsSync(dst_folder))
      fs.mkdirSync(dst_folder, { recursive: true });

    let dst_fullname = path.join(dst_folder, path.basename(fullname));
    let is_copied = false;
    do {
      try {
        fs.copyFileSync(fullname, dst_fullname, fs.constants.COPYFILE_EXCL);
        fs.utimesSync(dst_fullname, src_stat.atime, src_stat.mtime);
        is_copied = true;
      } catch(err) {
        if (err.code === "EEXIST") {
          dst_fullname = get_unique_filename(dst_fullname);
        } else {
          return err.code;
        }
      }
    } while (!is_copied);

    const push_err = this.dst_lookup.push(dst_fullname);
    if (push_err) return push_err;

    this.progress.step();
  }
}