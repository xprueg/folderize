"use strict";

const fs = require("fs");
const path = require("path");

class fs_util {
  static get_folder_stats(root) {
    let stat = {
      dirs: 0,
      files: 0
    };

    const files = fs.readdirSync(root, { withFileTypes: true })
      .filter(dirent => dirent.name[0] !== ".")
      .map(dirent => {
        if (dirent.isDirectory()) {
          stat.dirs++;

          const {dirs, files} = fs_util.get_folder_stats(path.join(root, dirent.name));
          stat.files += files;
          stat.dirs += dirs;
        } else {
          stat.files++;
        }
      });

    return stat;
  }

  static copy_file(src, dst, src_stat) {
    let rename_tries = 0;
    while(fs.existsSync(dst)) {
      const dst_parsed = path.parse(dst);
      dst = path.join(
        dst_parsed.dir,
        `${dst_parsed.name} (${++rename_tries})${dst_parsed.ext}`
      );
    }

    fs.copyFileSync(src, dst);
    fs.utimesSync(dst, src_stat.atime, src_stat.mtime);
  }
}

module.exports = exports = fs_util;
