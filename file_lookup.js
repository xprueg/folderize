"use strict";

const fs = require("fs");
const path = require("path");

const progress = require("./utils/progress.js");
const cli = require("./utils/console.js");
const { LEADING_SPACE } = cli.constants;
const ufs = require("./utils/fs.js");
const uhash = require("./utils/hash.js");

class FileLookup {
  constructor(is_full_indexed) {
    this.progress = undefined;

    this.is_full_indexed = is_full_indexed;

    this.stats = undefined;
    this.indexed_dirs = [];
    this.index = [];
  }

  static async create(root, is_full_indexed) {
    const lookup = new FileLookup(is_full_indexed);

    if (!fs.existsSync(root) || !is_full_indexed) {
      return lookup;
    }

    lookup.stats = ufs.get_folder_stats(root);
    lookup.progress = progress.to(lookup.stats.files)
      .msg("\x20\x20Indexed %P% (%C/%T)")
      .msg(", done.", tokens => tokens.P === 100);

    cli.log(
      `→ Creating file lookup for [u]${root}[/u].\n` +
      `\x20\x20Found ${lookup.stats.files} file(s) in ` +
      `${lookup.stats.dirs} directories.`,
      LEADING_SPACE
    );

    return new Promise((res, rej) => {
      if (lookup.stats.files === 0) {
        return res(lookup);
      }

      lookup._index_files(root, res);
    });
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

  _index_files(root, res) {
    fs.readdir(root, { withFileTypes: true }, (err, files) => {
      if (err) {
        throw err;
      }

      files.forEach(file => {
        if (file.isDirectory()) {
          return void this._index_files(path.join(root, file.name), res);
        }

        uhash.async(path.join(root, file.name), hash => {
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
