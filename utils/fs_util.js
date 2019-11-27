"use strict";

const fs = require("fs");
const path = require("path");

class FileSystemUtil {
  static get_folder_stats(root) {
    let stat = {
      dirs: 0,
      files: 0
    };

    const files = FileSystemUtil.get_dirents(root);
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

  static get_dirents(root) {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter(dirent => dirent.name[0] !== ".");
  }

  static copy_file(src, dst, src_stat) {
    let rename_tries = 0;
    let unique_name = dst;
    while(fs.existsSync(unique_name)) {
      const dst_parsed = path.parse(dst);
      unique_name = path.join(
        dst_parsed.dir,
        `${dst_parsed.name} (${++rename_tries})${dst_parsed.ext}`
      );
    }

    fs.copyFileSync(src, unique_name);
    fs.utimesSync(unique_name, src_stat.atime, src_stat.mtime);
  }
}

module.exports = exports = FileSystemUtil;
