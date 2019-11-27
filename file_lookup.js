"use strict";

const fs = require("fs");
const path = require("path");

const util = {
     progress: require("./utils/progress_util.js")
};

const cli = require("./utils/console_util.js");
const { LEADING_SPACE } = cli.constants;
const ufs = require("./utils/fs.js");
const uhash = require("./utils/hash.js");

class FileLookup {
  constructor(root, is_full_indexed) {
    this.is_full_indexed = is_full_indexed;
    this.indexed_dirs = [];
    this.index = [];
  }

  static create(root, is_full_indexed) {
    const lookup = new FileLookup(root, is_full_indexed);

    return new Promise((res, rej) => {
      if (!fs.existsSync(root) || !is_full_indexed) {
        return res(lookup);
      }

      cli.log("[b]Creating file lookup[/b]", LEADING_SPACE);
      cli.log(`→ ${root}`);

      lookup.folder_stats = ufs.get_folder_stats(root);
      lookup.progress = new util.progress(
        lookup.folder_stats,
        "Indexed __PROGRESS__% (__CURRENTCOUNT__/__TOTALCOUNT__)"
      );

      cli.log(
        `Found [u]${lookup.folder_stats.files} file(s)[/u] in ` +
        `[u]${lookup.folder_stats.dirs} directories[/u].`
      );

      if (lookup.folder_stats.files > 0) {
        lookup.index_files(root, res);
      } else {
        res(lookup);
      }
    });
  }

  index_dir(root) {
    if (!fs.existsSync(root) || this.indexed_dirs.includes(root)) {
      return;
    }

    const files = ufs.get_dirents(root);
    for (let i = 0; i < files.length; ++i) {
      const file = files[i];

      if (file.isDirectory()) {
        this.index_dir(path.join(root, file.name));
        continue;
      }

      this.add_hash(uhash.sync(path.join(root, file.name)));
    }

    this.indexed_dirs.push(root);
  }

  index_files(root, res) {
    fs.readdir(root, { withFileTypes: true }, (err, files) => {
      if (err) {
        throw err;
      }

      files.forEach(dirent => {
        if (dirent.isDirectory()) {
          this.index_files(path.join(root, dirent.name), res);
          return;
        }

        uhash.async(path.join(root, dirent.name), hash => {
          this.add_hash(hash);
          this.progress.step();

          if (this.progress.is_complete()) {
            res(this);
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

module.exports = FileLookup;
