"use strict";

const fs = require("fs");
const path = require("path");

const progress = require("./utils/progress.js");
const { LOADER } = progress.constants;
const cli = require("./utils/console.js");
const { LEADING_SPACE } = cli.constants;
const ufs = require("./utils/fs.js");
const uhash = require("./utils/hash.js");

class FileLookup {
  constructor(root, is_full_indexed) {
    this.is_full_indexed = is_full_indexed;
    this.stats = ufs.get_folder_stats(root);

    this.indexed_dirs = [];
    this.index = [];

    if (fs.existsSync(root) && this.stats.files > 0 && is_full_indexed) {
      this.progress = progress.to(this.stats.files)
        .loader(LOADER, "\x20\x20")
        .msg("Indexed %P% (%C/%T)")
        .msg(", done.", tokens => tokens.P === 100);

      cli.log(
        `→ Creating file lookup for [u]${root}[/u].\n` +
        `\x20\x20Found ${this.stats.files} file(s) in ` +
        `${this.stats.dirs} directories.`,
        LEADING_SPACE
      );

      this._index_files(root);
    }
  }

  index_dir(root) {
    if (!fs.existsSync(root) || this.indexed_dirs.includes(root)) {
      return;
    }

    fs.readdirSync(root, { withFileTypes: true }).forEach(file => {
      if (file.isDirectory()) {
        return void this.index_dir(path.join(root, file.name));
      }

      this.add_hash(uhash.sync(path.join(root, file.name)));
    });

    this.indexed_dirs.push(root);
  }

  _index_files(root) {
    fs.readdirSync(root, { withFileTypes: true }).forEach(file => {
      if (file.isDirectory()) {
        return void this._index_files(path.join(root, file.name));
      }

      this.add_hash(uhash.sync(path.join(root, file.name)));
      this.progress.step();
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
