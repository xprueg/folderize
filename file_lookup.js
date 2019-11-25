"use strict";

const fs = require("fs");
const path = require("path");

const util = {
  create_hash: require("./utils/hash_util.js"),
      console: require("./utils/console_util.js"),
           fs: require("./utils/fs_util.js"),
     progress: require("./utils/progress_util.js")
};

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

      util.console.log(
        "[b]Creating file lookup[/b]",
        util.console.constants.LEADING_SPACE
      );

      lookup.folder_stats = util.fs.get_folder_stats(root);
      lookup.progress = new util.progress(
        lookup.folder_stats,
        "Indexed __PROGRESS__% (__CURRENTCOUNT__/__TOTALCOUNT__)"
      );

      util.console.log(
        `Found [u]${lookup.folder_stats.files} file(s)[/u] in ` +
        `[u]${lookup.folder_stats.dirs} directories[/u].`
      );

      lookup.index_files(root, res);
    });
  }

  index_dir(root) {
    if (!fs.existsSync(root) || this.indexed_dirs.includes(root)) {
      return;
    }

    const files = util.fs.get_dirents(root);
    for (let i = 0; i < files.length; ++i) {
      const file = files[i];

      if (file.isDirectory()) {
        this.index_dir(path.join(root, file.name));
        continue;
      }

      this.add_hash(util.create_hash.sync(path.join(root, file.name)));
    }

    this.indexed_dirs.push(root);
  }

  index_files(root, res) {
    fs.readdir(root, { withFileTypes: true }, (err, files) => {
      if (err) {
        throw err;
      }

      files.forEach(dirent => {
        if (dirent.name[0] == ".") {
          return;
        }

        if (dirent.isDirectory()) {
          this.index_files(path.join(root, dirent.name), res);
          return;
        }

        util.create_hash.async(path.join(root, dirent.name), hash => {
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

module.exports = exports = FileLookup;
