const fs = require("fs");
const path = require("path");

const cli = require("./console.js");
const { LEADING_SPACE } = cli.constants;
const uhash = require("./hash.js");
const glob_match = require("./glob.js");

function verify(input, exclude, lookup) {
  let files_not_copied = [];

  input.forEach(root => {
    verify_dir(root, exclude, lookup, files_not_copied);
  });

  if (files_not_copied.length === 0) {
    cli.log(
      "○\x20All files from the input(s) exist in the output.",
      LEADING_SPACE
    );
  } else {
    cli.log(
      `\x20\x20Missing the following ${files_not_copied.length} file(s) in the output folder:\n` +
      `× ${files_not_copied.join("\n •")}`,
      LEADING_SPACE
    );
  }
}

function verify_dir(root, exclude, lookup, files_not_copied) {
  fs.readdirSync(root, { withFileTypes: true }).forEach(file => {
    const file_path = path.join(root, file.name);

    if (exclude &&
        exclude.filter(pattern => glob_match(pattern, file.name)).length > 0) {
      return;
    }

    if (file.isDirectory()) {
      return void verify_dir(file_path, exclude, lookup, files_not_copied);
    }

    if (!lookup.contains(uhash.sync(file_path))) {
      files_not_copied.push(file_path);
    }
  });
}

module.exports = verify;
