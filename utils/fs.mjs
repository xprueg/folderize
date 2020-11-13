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
