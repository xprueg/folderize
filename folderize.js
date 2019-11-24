"use strict";

const argv_util = require("./utils/argv_util.js")(process.argv);
const file_lookup = require("./file_lookup.js");
const file_copy = require("./file_copy.js");

argv_util.register("--input", "-i", { expected_values: 1, multiple: true, required: true });
argv_util.register("--output", "-o", { expected_values: 1, required: true });
argv_util.register("--locale", "-l", { expected_values: 1, default: "en-US" });
argv_util.register("--nofullindex");

new file_lookup(
  argv_util.get_value("--output"),
  file_lookup => {
    new file_copy(argv_util, file_lookup);
  },
  !argv_util.is_set("--nofullindex")
);
