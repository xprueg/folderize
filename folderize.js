"use strict";

const cap = require("./utils/console_arg_parser.js")(process.argv);
const file_copy = require("./file_copy.js");

cap.define("--input", { alias: "-i", expected_values: Infinity, is_required: true });
cap.define("--output", { alias: "-o", default: "./" });
cap.define("--locale", { alias: "-l", default: "en-US" });
cap.flag("--nofullindex", { alias: "-n" });
const args = cap.parse();

file_copy.create(args.input, args.output, args.locale, !args.nofullindex);
