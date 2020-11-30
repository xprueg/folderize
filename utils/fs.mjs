import fs from "fs";
import path from "path";

/**
 * Tests whether the file is an internal file.
 * @param {string} filename - The filename to test.
 * @returns {bool}
 */
function is_internal_file(filename) {
  if (!filename)
    throw Error("<filename> is mandatory.");

  return /^\.folderize\.(cache|settings)$/.test(filename);
}

/**
 * Returns the count of files and folders.
 * @param {string} root - Directory to calculate stats for.
 * @param {RegExp} [exclude] - Files to exclude.
 * @return {[string|null, object]} Error message or null on success.
 */
export function get_folder_stats(root, exclude = /^[]/) {
  return Read.dir(root).exclude(exclude).count(Read.FILE | Read.DIR);
}

export class Read {
  #typemasks = Object.create(null);
  static FILE    = 1 << 0;
  static DIR     = 1 << 1;
  static SYMLINK = 1 << 2;

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

  static dir(root) {
    return new Read(root);
  }

  exclude(regex) {
    this.#exclude = regex;
    return this;
  }

  on_file(fn) {
    this.#callbacks.on_file = fn;
    return this;
  }

  on_dir(fn) {
    this.#callbacks.on_dir = fn;
    return this;
  }

  count(flags) {
    let count = {};

    for (let [type, tmask] of Object.entries(this.#typemasks)) {
      if ((flags & tmask) === tmask) {
        count[type] = 0;
        this[`on_${type}`](_ => count[type]++);
      }
    }

    const err = this.iter();
    if (err) return [err];

    return [null, count];
  }

  collect(flags) {
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

    const err = this.iter();
    if (err) return [err];

    return [null, collection];
  }

  iter(dir = this.#root) {
    let dirents = [];
    try { dirents = fs.readdirSync(dir, { withFileTypes: true }) }
    catch (err) { return err.code }

    for (let dirent of dirents) {
      if (this.#exclude.test(dirent.name)
          || is_internal_file(dirent.name))
        continue;

      const fullname = path.join(dir, dirent.name);

      if (dirent.isDirectory()) {
        this.#callbacks.on_dir(fullname);

        const err = this.iter(fullname);
        if (err) return err;
      } else if (dirent.isFile()) {
        this.#callbacks.on_file(fullname);
      }
    };

    return null;
  }
}


/**
 * Iterate all files and call user supplied functions for each file.
 * @param {string} dir - The directory to iterate.
 * @param {function} [filecb] - Will be called for every file.
 * @param {function} [dircb] - Will be called for every directory.
 * @param {RegExp} [exclude] - Files to exclude.
 * @returns {string|null} Error message or null on success.
 */
export function iter_files(dir, filecb = (() => {}), dircb = (() => {}), exclude = /^[]/) {
  if (!dir) return "Param <dir> is mandatory.";

  let dirents = [];
  try { dirents = fs.readdirSync(dir, { withFileTypes: true }) }
  catch (err) { return err.code }

  for (let dirent of dirents) {
    const fullname = path.join(dir, dirent.name);

    if (exclude.test(dirent.name) || is_internal_file(dirent.name))
      continue;

    if (dirent.isDirectory()) {
      dircb(fullname);

      const err = iter_files(fullname, filecb, dircb, exclude);
      if (err) return err;
    } else {
      filecb(fullname);
    }
  };

  return null;
}

/**
 * Returns a list of all filepaths contained in the given directory.
 * @param {string} dir - The directory to query.
 * @param {RegExp} [exclude] - Files to exclude.
 * @returns {[string|null, string[]]} Error message or null on success.
 */
export function query_files(dir, exclude = /^[]/) {
  if (!dir) return ["Param <dir> is mandatory."];

  let files = Array();
  const err = iter_files(dir,
    (file) => files.push(file),
    (dir) => {},
  exclude);
  if (err) return [err];

  return [null, files];
}

/**
 * Compare equality of files byte for byte.
 * @param {string} a - Path to file a.
 * @param {string} b - Path to file b.
 * @returns {[string|null, bool]} Error message or null on success.
 */
export function bytes_equal(a, b) {
  try {
    const buff_a = fs.readFileSync(a);
    const buff_b = fs.readFileSync(b);

    return [null, buff_a.equals(buff_b)];
  } catch(err) {
    return [err.code];
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