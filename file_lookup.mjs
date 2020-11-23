import fs from "fs";
import path from "path";
import os from "os";

import ufs from "./utils/fs.mjs";
import { hex_hash_sync } from "./utils/hash.mjs";

export default class Lookup {
  static #CACHEFILENAME = ".folderize.cache";

  #root;
  #cachefile;
  #index = new Map();

  constructor(root) {
    this.#root = path.resolve(root);
    this.#cachefile = path.join(root, Lookup.#CACHEFILENAME);
  }

  /**
   * Returns a new Lookup instance.
   * @param {string} root - The directory to cache.
   * @returns {Lookup}
   */
  static new(root) {
    return new Lookup(root);
  }

  /**
   * Returns the absolute path to the cachefile.
   * @returns {string}
   */
  get_cachefile() {
    return this.#cachefile;
  }

  /**
   * Load and parse the cachefile.
   * Overwrites the index.
   * @returns {string|null} Error message or null on success.
   */
  load_cachefile() {
    let tmp = new Map();
    let cachefile_lines;
    let malformed_lines = Array();

    try {
      cachefile_lines = fs.readFileSync(this.#cachefile, "utf-8")
                          .split(os.EOL)
                          .filter(l => l.length > 0);
    } catch (err) {
      return err.code;
    }

    for (let line = 0; line < cachefile_lines.length; ++line) {
      const [hash, rel_path] = cachefile_lines[line].split("\x20");

      if (hash && rel_path)
        tmp.set(hash, rel_path);
      else
        malformed_lines.push(`#${line + 1}`);
    }

    if (malformed_lines.length === 0) {
      this.#index = tmp;
      return null;
    } else {
      return "Malformed entries at line(s): " + malformed_lines.join(", ");
    }
  }

  /**
   * Generate an index from all files in root.
   * @param {function} [cb] - Will be called for every file.
   * @returns {string|null} Error message or null on success.
   */
  generate(cb) {
    return this.#index_files(this.#root, cb ? cb : () => {});
  }

  /**
   * Index all files in root.
   * @param {string} root
   * @param {function} cb - Will be called for every file.
   * @returns {string|null} Error message or null on success.
   */
  #index_files(root, cb) {
    try {
      const files = fs.readdirSync(root, { withFileTypes: true });

      for (let file of files) {
        const fullname = path.join(root, file.name);

        if (file.isDirectory()) {
          this.#index_files(fullname, cb);
        } else {
          cb(file.name);
          this.push(fullname);
        }
      };
    } catch(err) { return err.code; }

    return null;
  }

  /**
    * Update index against live folder.
    * @todo Also remove files if their hash doesn't match anymore, i. e. the path hasn't changed but the contents were changed. Only compare hashes if mtime is different.
    * @returns {[string|null, object]} Error message or null on success.
    */
  update() {
    let diff = { added: [], removed: [], total: 0 };
    let [err, live_dir] = ufs.query_files(this.#root);

    if (err)
      return [err];

    // Filter live_dir to keep only files that are not in the index yet.
    // Remove files from the index that cannot be found in the live directory anymore.
    for (let [hash, rel_path] of this.#index) {
      const search = live_dir.indexOf(path.join(this.#root, rel_path));

      if (search !== -1) {  // Filepath exists.
        live_dir.splice(search, 1);
      } else {  // Filepath is invalid.
        this.remove(hash);
        diff.removed.push(rel_path);
      }
    };

    // Add the new files to the index.
    for (let abs_path of live_dir) {
      this.push(abs_path);
      diff.added.push(abs_path);
    }

    diff.total = diff.added.length + diff.removed.length;

    return [null, diff];
  }

  /**
   * Adds the given file to the lookup if it's not included.
   * @todo This might throw, handle this.
   * @param {string} abs_path - The absolute path to the file.
   * @returns {void}
   */
  push(abs_path) {
    const hash = hex_hash_sync(abs_path);

    if (!this.#index.has(hash))
      this.#index.set(hash, path.relative(this.#root, abs_path));
  }

  /**
   * Removes an entry from the lookup.
   * @param {string} hash - The hash to remove.
   * @returns {void}
   */
  remove(hash) {
    this.#index.delete(hash);
  }

  /**
   * Returns whether the lookup contains the hash.
   * @param {string} hash - The hash to check.
   * @returns {bool}
   */
  contains(hash) {
    return this.#index.has(hash);
  }

  /**
   * Saves the in-memory cache to disk.
   * @returns {string|null} Error message or null on success.
   */
  save_cachefile() {
    let data = String();

    for (let [hash, rel_path] of this.#index)
      data += (hash + "\x20" + rel_path + os.EOL);

    try { fs.writeFileSync(this.#cachefile, data);
    } catch (err) { return err.code; }

    return null;
  }
}