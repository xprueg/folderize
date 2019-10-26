"use strict";

const fs = require("fs");
const path = require("path");
const argv_util = require("./argv_util.js");
const { create_file_hash, create_file_hash_sync } = require("./hash_util.js");
const date_util = require("./date_util.js");
const { log, constants: log_constants } = require("./console_util.js");
const fs_util = require("./fs_util.js");
const progress_util = require("./progress_util.js");

class FileLookup {
  constructor(root, emit_init) {
    this.index = [];

    if (!fs.existsSync(root)) {
      emit_init(this);
      return;
    }

    log("[b]Creating file lookup[/b]", log_constants.LEADING_SPACE);

    this.folder_stats = fs_util.get_folder_stats(root);
    this.progress = new progress_util(this.folder_stats, "Indexed __PROGRESS__% (__CURRENTCOUNT__/__TOTALCOUNT__)");

    log(`Found [u]${this.folder_stats.files} files[/u] in [u]${this.folder_stats.dirs} directories[/u].`);

    this.index_files(root, emit_init);
  }

  index_files(root, emit_init) {
    fs.readdir(root, { withFileTypes: true }, (err, files) => {
      if (err) {
        throw err;
      }

      files.forEach(dirent => {
        if (dirent.name[0] == ".") {
          return;
        }

        if (dirent.isDirectory()) {
          this.index_files(path.join(root, dirent.name), emit_init);
          return;
        }

        create_file_hash(path.join(root, dirent.name), hash => {
          this.add_hash(hash);
          this.progress.step();

          if (this.index.length === this.folder_stats.files) {
            emit_init(this);
          }
        });
      });
    });
  }

  add_hash(hash) {
    if (!this.index.includes(hash)) {
      this.index.push(hash);
    }
  }

  contains(hash) {
    return this.index.includes(hash);
  }
}

class FileCopy {
  constructor(argv_util) {
    this.src = argv_util.get_value("--input");
    this.dst = argv_util.get_value("--output");
    this.dst_file_lookup;

    log(`← \`${this.src}'\n→ \`${this.dst}'.`, log_constants.LEADING_SPACE);

    new FileLookup(this.dst, file_lookup => {
      this.dst_file_lookup = file_lookup;

      log("[b]Copying files[/b]", log_constants.LEADING_SPACE);

      this.folder_stats = fs_util.get_folder_stats(this.src);
      this.progress = new progress_util(
        this.folder_stats,
        "Copied __PROGRESS__% (__CURRENTCOUNT__/__TOTALCOUNT__)__IF:SKIPPED=, Skipped __SKIPPED__ files:FI__"
      );

      log(`Found [u]${this.folder_stats.files} files[/u] in [u]${this.folder_stats.dirs} directories[/u].`);

      this.copy_folder(this.src);
    });
  }

  copy_folder(root) {
    fs.readdirSync(root, { withFileTypes: true })
      .filter(dirent => dirent.name[0] !== ".")
      .filter(dirent => !(dirent.isDirectory() && !this.copy_folder(path.join(root, dirent.name))))
      .map(file => {
        const filepath = path.join(root, file.name);
        const filehash = create_file_hash_sync(filepath);

        if (this.dst_file_lookup.contains(filehash)) {
          this.progress.step({ SKIPPED: +1 });
          return;
        }

        const lstat = fs.lstatSync(filepath);
        const ldate = date_util.extract(lstat.mtime);
        const dst_folder = path.join(this.dst, ldate.year, ldate.month, ldate.day);
        let dst_file = path.join(dst_folder, file.name);

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

const argvu = new argv_util(process.argv);
argvu.register("--input", "-i", { expected_values: 1, required: true });
argvu.register("--output", "-o", { expected_values: 1, required: true });

new FileCopy(argvu);
