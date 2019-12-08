"use strict";

const cap = require("./utils/console_arg_parser.js")(process.argv);
const file_lookup = require("./file_lookup.js");
const file_copy = require("./file_copy.js");
const verify = require("./utils/verify.js");

cap.define("--input", { alias: "-i", expected_values: Infinity, is_required: true });
cap.define("--output", { alias: "-o", default: "./" });
cap.define("--locale", { alias: "-l", default: "en-US" });
cap.define("--exclude", { alias: "-e", expected_values: Infinity });
cap.flag("--nofullindex", { alias: "-n" });
cap.flag("--cacheindex", { alias: "-c" });
cap.flag("--verify", { alias: "-v" });
const args = cap.parse();

!function folderize(input, output, locale, exclude, is_full_indexed, is_index_cached) {
  if (args.verify) {
    verify(input, exclude, new file_lookup(output, true, false));
  } else {
    const lookup = new file_lookup(output, is_full_indexed, is_index_cached);
    const copy = new file_copy(input, output, locale, exclude, lookup);

    lookup.flush();
  }

  console.log(String());
}(args.input, args.output, args.locale, args.exclude, !args.nofullindex, args.cacheindex);
