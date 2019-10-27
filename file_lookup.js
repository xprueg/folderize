"use strict";

const fs = require("fs");
const path = require("path");

const util = {
  create_hash: require("./utils/hash_util.js"),
  console: require("./utils/console_util.js"),
  fs: require("./utils/fs_util.js"),
  progress: require("./utils/progress_util.js")
};

module.exports = exports = class FileLookup {
  constructor(root, emit_init, index_dst_completely) {
    this.indexed_dirs = [];
    this.index = [];

    if (!fs.existsSync(root) || !index_dst_completely) {
      emit_init(this);
      return;
    }

    util.console.log("[b]Creating file lookup[/b]", util.console.constants.LEADING_SPACE);

    this.folder_stats = util.fs.get_folder_stats(root);
    this.progress = new util.progress(this.folder_stats, "Indexed __PROGRESS__% (__CURRENTCOUNT__/__TOTALCOUNT__)");

    util.console.log(`Found [u]${this.folder_stats.files} file(s)[/u] in [u]${this.folder_stats.dirs} directories[/u].`);

    this.index_files(root, emit_init);
  }

  index_dir(root) {
    if (!fs.existsSync(root) || this.indexed_dirs.includes(root)) {
      return;
    }

    this.indexed_dirs.push(root);

    fs.readdirSync(root, { withFileTypes: true })
      .forEach(dirent => {
        if (dirent.name[0] == ".") {
          return;
        }

        if (dirent.isDirectory()) {
          this.index_dir(path.join(root, dirent.name));
          return;
        }

        this.add_hash(util.create_hash.sync(path.join(root, dirent.name)));
      });
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

        util.create_hash.async(path.join(root, dirent.name), hash => {
          this.add_hash(hash);
          this.progress.step();

          if (this.progress.is_complete()) {
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
