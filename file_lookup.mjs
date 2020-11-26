import fs from "fs";
import path from "path";

import ufs from "./utils/fs.mjs";
import { hex_hash_sync } from "./utils/hash.mjs";

export default class Lookup {
  static #CACHEFILENAME = ".folderize.cache";

  #root;
  #cachefile;
  #index = new Map();

  constructor(root) {
    this.#root = path.resolve(root);
    this.#cachefile = path.join(this.#root, Lookup.#CACHEFILENAME);
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
   * Generate an index from all files in root.
   * @param {function} [callback] - Will be called for every file.
   * @returns {string|null} Error message or null on success.
   */
  generate(callback) {
    return this.#index_files(this.#root, callback ?? (() => {}));
  }

  /**
   * Index all files in root.
   * @param {string} root - Directory to index.
   * @param {function} callback - Will be called for every file.
   * @returns {string|null} Error message or null on success.
   */
  #index_files(root, callback) {
    let dirents;
    try { dirents = fs.readdirSync(root, { withFileTypes: true }) }
    catch (err) { return err.code; }

    for (let dirent of dirents) {
      const fullname = path.join(root, dirent.name);

      if (dirent.isDirectory()) {
        const err = this.#index_files(fullname, callback);
        if (err) return err;
      } else {
        callback(fullname);
        this.push(fullname);
      }
    }

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
    if (err) return [err];

    // Filter live_dir to keep only files that are not in the index yet.
    // Remove files from the index that cannot be found in the live directory anymore.
    for (let [hash, rel_paths] of this.#index) {
      for (let rel_path of rel_paths) {
        const search = live_dir.indexOf(path.join(this.#root, rel_path));

        if (search !== -1) {  // Filepath exists.
          live_dir.splice(search, 1);
        } else {  // Filepath is invalid.
          const err = this.remove(hash, rel_path);
          if (err) return [err];

          diff.removed.push(rel_path);
        }
      }
    };

    // Add the new files to the index.
    for (let fullname of live_dir) {
      this.push(fullname);
      diff.added.push(fullname);
    }

    diff.total = diff.added.length + diff.removed.length;

    return [null, diff];
  }

  /**
   * Adds the given file to the lookup if it's not indexed.
   * @todo hex_hash_sync might throw, handle this.
   * @param {string} fullname - The path to the file.
   * @returns {void}
   */
  push(fullname) {
    const hash = hex_hash_sync(fullname);
    const rel_path = path.relative(this.#root, fullname);

    if (!this.contains(rel_path)) {
      let entries = this.#index.get(hash) ?? Array();
      this.#index.set(hash, entries.concat(rel_path));
    }
  }

  /**
   * Removes an entry from the index.
   * @param {string} hash - Hash of the file.
   * @param {string} rel_path - Relative path to the file.
   * @returns {string|null} Error message or null on success.
   */
  remove(hash, rel_path) {
    const entries = this.#index.get(hash);

    if (entries === undefined || !entries.includes(rel_path))
      return `<${rel_path} (${hash})> cannot be removed because it does not exist.`;

    if (entries.length === 1)
      this.#index.delete(hash);
    else
      this.#index.set(hash, entries.filter(entry => entry !== rel_path));

    return null;
  }

  /**
   * Returns whether the index contains a file with the same contents.
   * @todo Bubble <err> gracefully up.
   * @todo Handle potential error in hex_hash_sync.
   * @param {string} rel_path - Relative path to the file to check.
   * @returns {bool}
   */
  contains(rel_path) {
    const hash = hex_hash_sync(path.join(this.#root, rel_path));
    const paths = this.#index.get(hash);

    if (paths === undefined) return false;

    for (let indexed_rel_path of paths) {
      // Literally the same file.
      if (indexed_rel_path === rel_path) return true;

      const [err, equal] = ufs.bytes_equal(
        path.join(this.#root, indexed_rel_path),
        path.join(this.#root, rel_path)
      );
      if (err) throw err;

      // Different path but contents match.
      if (equal) return true;
    }

    // Hash collision, hash exists but contents do not.
    return false;
  }

  /**
   * Load and parse the cachefile.
   * Overwrites the index.
   *
   * 1. Let $index be an empty map,
   *        $hash, $file_count be undefined,
   *        $files be an empty array.
   * 2. Read until <#>, store in $hash, eat <#>.
   * 3. Read until <;>, store in $file_count, eat <;>.
   * 4. Read $file_count files.
   *    1. Read until <:>, store in $file_size, eat <:>.
   *    2. Read $file_size bytes, push into $files.
   * 5. Set $hash in $index to $files.
   *
   * @returns {string|null} Error message or null on success.
   */
  load_cachefile() {
    let index = new Map();

    let buffer;
    try { buffer = fs.readFileSync(this.#cachefile) }
    catch (err) { return err.code }

    for (let i = 0; i < buffer.length;) {
      // 1.
      let hash;
      let file_count;
      let files = Array();

      { // 2.
        const start = i;
        while(buffer[i] !== "#".charCodeAt()) ++i;
        hash = buffer.slice(start, i).toString();
        ++i;
      }

      { // 3.
        const start = i;
        while(buffer[i] !== ";".charCodeAt()) ++i;
        file_count = parseInt(buffer.slice(start, i).toString(), 10);
        ++i;
      }

      { // 4.
        for (let n = 0; n < file_count; ++n) {
          // 4.1
          const start = i;
          while(buffer[i] !== ":".charCodeAt()) ++i;
          const file_size = parseInt(buffer.slice(start, i), 10);
          ++i;

          // 4.2
          files.push(buffer.slice(i, i + file_size).toString());
          i += file_size;
        }
      }

      // 5.
      index.set(hash, files);
    }

    this.#index = index;
  }

  /**
   * Saves the in-memory cache to disk.
   *
   * Cachefile format:
   * hash # files.count ; path.length : path ...
   * e1cde3a#2;10:foobar.txt7:bar.jpg
   *
   * @returns {string|null} Error message or null on success.
   */
  save_cachefile() {
    let data = String();

    for (let [hash, rel_paths] of this.#index) {
      data += `${hash}#${rel_paths.length};`;

      for (let rel_path of rel_paths)
        data += `${Buffer.byteLength(rel_path)}:${rel_path}`;
    }

    try { fs.writeFileSync(this.#cachefile, data) }
    catch (err) { return err.code }

    return null;
  }
}