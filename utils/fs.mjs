import fs from "fs";
import path from "path";

import { panic } from "./panic.mjs";

/**
 * Tests whether the file is an internal file.
 * @todo Remove this function and use .exclude to exclude internal files because sometimes internal files are wanted.
 * @param {string} filename - Filename to test.
 * @returns {bool}
 */
function is_internal_file(filename) {
  return /^\.folderize\.(cache|settings)$/.test(filename);
}

/// Utility class for iterating over directories.
///
/// {*} Create a "match" function accompanying the "exclude" function.
export class Read {
  #typemasks = Object.create(null);

  // Filetypes
  static FILE    = 1 << 0;
  static DIR     = 1 << 1;
  static SYMLINK = 1 << 2;

  // Options
  static FLAT = false;
  static RECURSIVE = true;

  #root;
  #exclude = /^[]/;
  #callbacks = Object.create(null);

  constructor(root) {
    this.#root = root;

    ["dir", "file", "symlink"].forEach(type => {
      this.#callbacks[`on_${type}`] = () => {};
      this.#typemasks[type] = Read[type.toUpperCase()];
    });
  }

  /**
   * Create a new Read instance.
   * @param {string} root - Directory to use.
   * @returns {Read}
   */
  static dir(root) {
    return new Read(root);
  }

  /**
   * Sets the exclude regex.
   * @param {RegExp} regex - Files to exclude.
   * @returns {this} 
   */
  exclude(regex) {
    this.#exclude = regex;
    return this;
  }

  /**
   * Adds a file callback.
   * @param {function} fn - Callback function.
   * @returns {this} 
   */
  on_file(fn) {
    this.#callbacks.on_file = fn;
    return this;
  }

  /**
   * Adds a dir callback.
   * @param {function} fn - Callback function.
   * @returns {this} 
   */
  on_dir(fn) {
    this.#callbacks.on_dir = fn;
    return this;
  }

  /**
   * Counts the provided types.
   * @param {number} flags - Types to count.
   * @param {boolean} [recursive=true]
   * @throws {Panic}
   * @returns {object}
   */
  count(flags, recursive = Read.RECURSIVE) {
    let count = {};

    for (let [type, tmask] of Object.entries(this.#typemasks)) {
      if ((flags & tmask) === tmask) {
        count[type] = 0;
        this[`on_${type}`](_ => count[type]++);
      }
    }

    try {
      this.iter(undefined, recursive);
    } catch(err) {
      panic(err)`Failed to count files`;
    }

    return count;
  }

  /**
   * Collects the provided types.
   * If a single type is provided an Array will be returned otherwise an Object.
   * @param {number} flags - Types to collect.
   * @param {boolean} [recursive=true]
   * @throws {Panic}
   * @returns {(string[]|object)}
   */
  collect(flags, recursive = Read.RECURSIVE) {
    let flag_count = flags.toString(2).split("").filter(bit => bit === "1").length;
    let collection = flag_count === 1 ? Array() : Object.create(null);

    for (let [type, tmask] of Object.entries(this.#typemasks)) {
      if ((flags & tmask) === tmask) {
        if (flag_count > 1)
          collection[type] = Array();

        this[`on_${type}`](
          flag_count === 1
            ? (fullname) => collection.push(fullname)
            : (fullname) => collection[type].push(fullname)
        );
      }
    }

    try {
      this.iter(undefined, recursive);
    } catch(err) {
      panic(err)`Failed to collect files`;
    }

    return collection;
  }

  /**
   * Iterate the provided directory recursively.
   * @param {string} [dir=this.#root] - Directory to iterate.
   * @param {boolean} [recursive=true]
   * @throws {Error}
   * @returns {void}
   */
  iter(dir = this.#root, recursive = true) {
    let dirents = fs.readdirSync(dir, { withFileTypes: true });

    for (let dirent of dirents) {
      if (this.#exclude.test(dirent.name)
          || is_internal_file(dirent.name))
        continue;

      const fullname = path.join(dir, dirent.name);

      if (dirent.isDirectory()) {
        this.#callbacks.on_dir(fullname);

        if (recursive) this.iter(fullname);
      } else if (dirent.isFile()) {
        this.#callbacks.on_file(fullname);
      }
    };
  }
}

/**
 * Compare equality of files byte for byte.
 * @param {string} a - Filepath a.
 * @param {string} b - Filepath b.
 * @throws {Panic}
 * @returns {bool}
 */
export function bytes_equal(a, b) {
  try {
    const buff_a = fs.readFileSync(a);
    const buff_b = fs.readFileSync(b);

    return buff_a.equals(buff_b);
  } catch(err) {
    panic(err)`Failed to byte compare ${{ $a: a }} against ${{ $b: b }}`;
  }
}

export function get_unique_filename(filepath) {
  let rename_tries = 0;
  let unique = filepath;

  while(fs.existsSync(unique)) {
    const parsed = path.parse(filepath);
    unique = path.join(
      parsed.dir,
      `${parsed.name} (${++rename_tries})${parsed.ext}`
    );
  }

  return unique;
}