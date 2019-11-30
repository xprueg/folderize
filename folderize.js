"use strict";

const cap = require("./utils/console_arg_parser.js")(process.argv);
const file_copy = require("./file_copy.js");

cap.define("--input", { alias: "-i", expected_values: Infinity, is_required: true });
cap.define("--output", { alias: "-o", default: "./" });
cap.define("--locale", { alias: "-l", default: "en-US" });
cap.define("--exclude", { alias: "-e", expected_values: Infinity });
cap.flag("--nofullindex", { alias: "-n" });
const args = cap.parse();

function folderize(input, output, locale, exclude, is_full_indexed) {
  file_copy.create(input, output, locale, exclude, is_full_indexed);
}

folderize(
  args.input, args.output,
  args.locale,
  args.exclude,
  !args.nofullindex
);
