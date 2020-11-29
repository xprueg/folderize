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
  let stat = { files: 0, dirs: 0 };
  const err = iter_files(root,
    (file) => stat.files++,
    (dir) => stat.dirs++,
  exclude);

  if (err) return [err];

  return [null, stat];
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