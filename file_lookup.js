"use strict";

const fs = require("fs");
const path = require("path");

const progress = require("./utils/progress.js");
const { LOADER } = progress.constants;
const cli = require("./utils/console.js");
const { LEADING_SPACE } = cli.constants;
const ufs = require("./utils/fs.js");
const uhash = require("./utils/hash.js");

const constants = {
  CACHE_NAME: ".folderize.cache",
  CACHE_HIT: 1 << 0,
  CACHE_MISS: 1 << 1
}

class FileLookup {
  constructor(root, is_full_indexed, is_index_cached) {
    this.root = root;
    this.is_full_indexed = is_full_indexed;
    this.is_index_cached = is_index_cached;
    this.stats = ufs.get_folder_stats(root);

    this.indexed_dirs = [];
    this.index = [];

    if (this.is_index_cached) {
      const res = this._load_index_from_cache(this.root);

      if (res & constants.CACHE_HIT) {
        cli.log(`← Restored file lookup from cache.`, LEADING_SPACE);
        return;
      }
    }

    if (fs.existsSync(this.root) && this.stats.files > 0 && this.is_full_indexed) {
      this.progress = progress.to(this.stats.files)
        .loader(LOADER, "\x20\x20")
        .msg("Indexed %P% (%C/%T)")
        .msg(", done.", tokens => tokens.P === 100);

      cli.log(
        `→ Creating file lookup for [u]${this.root}[/u].\n` +
        `\x20\x20Found ${this.stats.files} file(s) in ` +
        `${this.stats.dirs} directories.`,
        LEADING_SPACE
      );

      this._index_files(this.root);
    }
  }

  _save_index_to_cache() {
    if (this.is_index_cached) {
      const cache = this.index.join("\n");
      fs.writeFileSync(path.join(this.root, constants.CACHE_NAME), cache);
    }
  }

  _load_index_from_cache(root) {
    try {
      const cache = fs
        .readFileSync(path.join(root, constants.CACHE_NAME), { encoding: "utf-8" })
        .split("\n")
        .filter(line => line.length);

      // Remove the cache file from the total output count.
      --this.stats.files;

      if (cache.length > 0 && cache.length === this.stats.files) {
        this.index = cache;
        return constants.CACHE_HIT;
      } else {
        fs.unlinkSync(path.join(root, constants.CACHE_NAME));
        return constants.CACHE_MISS;
      }
    } catch(e) {
      if (e.code === "ENOENT") {
        return constants.CACHE_MISS;
      }

      throw e;
    }
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

  flush() {
    this._save_index_to_cache();
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
