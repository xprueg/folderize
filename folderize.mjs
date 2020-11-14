"use strict";

import ConsoleArgumentParser from "./utils/console_arg_parser.mjs";
import file_lookup from "./file_lookup.mjs";
import file_copy from "./file_copy.mjs";
import verify from "./utils/verify.mjs";
import { println } from "./utils/console.mjs";

const cap = new ConsoleArgumentParser(process.argv);
cap.define("--input", { alias: "-i", expected_values: Infinity, is_required: true });
cap.define("--output", { alias: "-o", default: "./" });
cap.define("--locale", { alias: "-l", default: "en-US" });
cap.define("--exclude", { alias: "-e", expected_values: Infinity });
cap.flag("--nocache", { alias: "-n" });
cap.flag("--verify", { alias: "-v" });
const args = cap.parse();

!function folderize(inputs, output, locale, exclude, use_cache) {
  println(String());

  if (args.verify) {
    verify(inputs, exclude, new file_lookup(output, true, false));
  } else {
    const lookup = new file_lookup(output, use_cache);

    println(String());

    for (let input of inputs) {
      new file_copy(input, output, locale, exclude, lookup);
      println(String());
    }

    lookup.flush();
  }
}(args.input, args.output, args.locale, args.exclude, !args.nocache);
