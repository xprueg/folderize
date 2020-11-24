"use strict";

import fs from "fs";
import path from "path";

export default class FileSystemUtil {
  static get_folder_stats(root) {
    let stat = {
      dirs: 0,
      files: 0
    };

    const files = fs.readdirSync(root, { withFileTypes: true });
    for (let i = 0; i < files.length; ++i) {
      const file = files[i];

      if (file.isDirectory()) {
        stat.dirs++;

        const {dirs, files} = FileSystemUtil.get_folder_stats(path.join(root, file.name));
        stat.files += files;
        stat.dirs += dirs;
      } else {
        stat.files++;
      }
    }

    return stat;
  }

  /**
   * Returns a list of all filepaths contained in the given directory.
   * @param {string} dir - The directory to query.
   * @returns {[string|null, string[]]} Error message or null on success.
   */
  static query_files(dir) {
    if (!dir)
      return ["Param <dir> is mandatory."];

    let dirents = [];
    try { dirents = fs.readdirSync(dir, { withFileTypes: true }) }
    catch (err) { return [err.code] }

    let files = Array();
    for (let dirent of dirents) {
      const fullname = path.join(dir, dirent.name);

      if (dirent.isDirectory()) {
        const [err, recursive_files] = FileSystemUtil.query_files(fullname);

        if (err)
          return [err];

        files = files.concat(recursive_files);
      } else {
        files.push(fullname);
      }
    };

    return [null, files];
  }

  /**
   * Compare equality of files byte for byte.
   * @param {string} a - Path to file a.
   * @param {string} b - Path to file b.
   * @returns {[string|null, bool]} Error message or null on success.
   */
  static bytes_equal(a, b) {
    try {
      const buff_a = fs.readFileSync(a);
      const buff_b = fs.readFileSync(b);

      return [null, buff_a.equals(buff_b)];
    } catch(err) {
      return [err.code];
    }
  }

  static get_unique_filename(filepath) {
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
}
