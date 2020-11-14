"use strict";

import fs from "fs";
import path from "path";

import progress from "./utils/progress.mjs";
const { LOADER } = progress.constants;
import { println } from "./utils/console.mjs";
import ufs from "./utils/fs.mjs";
import { hex_hash_sync } from "./utils/hash.mjs";

const constants = {
  CACHE_NAME: ".folderize.cache",
  CACHE_HIT: 1 << 0,
  CACHE_MISS: 1 << 1
}

export default class FileLookup {
  constructor(root, use_cache) {
    this.root = root;
    this.use_cache = use_cache;
    this.stats = ufs.get_folder_stats(root);

    this.indexed_dirs = [];
    this.index = {};

    if (this.use_cache) {
      const res = this._load_index_from_cache(this.root);

      if (res & constants.CACHE_HIT)
        return void println("← Restored file lookup from cache.");
    }

    if (fs.existsSync(this.root) && this.stats.files > 0) {
      this.progress = progress.to(this.stats.files)
        .loader(LOADER, "\x20\x20")
        .msg("Indexed %P% (%C/%T)")
        .msg(", done.", tokens => tokens.P === 100);

      println(`→ Creating file lookup for [u]${this.root}[/u].`);
      println(`\x20\x20Found ${this.stats.files} file(s) in ${this.stats.dirs} directories.`);

      this._index_files(this.root);
    }
  }

  _save_index_to_cache() {
    const cachefile =  path.join(this.root, constants.CACHE_NAME);
    const data = Object.entries(this.index).reduce(
      (a, f) => `${a}${f.join("\x20")}\n`,
      String()
    );

    fs.writeFileSync(cachefile, data);
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
        this.index = cache.reduce((c, line) => {
          const [hash, filepath] = line.split("\x20");
          c[hash] = filepath;
          return c;
        }, Object());

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

      this.push(path.join(root, file.name));
      this.progress.step();
    });
  }

  flush() {
    if (this.use_cache)
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

      this.push(path.join(root, file.name));
    });

    this.indexed_dirs.push(root);
  }

  /**
   * Adds the given file to the lookup if it's not included.
   * @param {string} filepath The absolute path to the file.
   * @returns {void}
   */
  push(filepath) {
    const hash = hex_hash_sync(filepath);

    if (hash in this.index === false)
      this.index[hash] = path.relative(this.root, filepath);
  }

  /**
   * Returns whether the lookup contains the hash.
   * @param {string} hash The hash to check.
   * @returns {bool}
   */
  contains(hash) {
    return hash in this.index;
  }
}