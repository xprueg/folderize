"use strict";

import ConsoleArgumentParser from "./utils/console_arg_parser.mjs";
import file_lookup from "./file_lookup.mjs";
import file_copy from "./file_copy.mjs";
import verify from "./utils/verify.mjs";

const cap = new ConsoleArgumentParser(process.argv);
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
