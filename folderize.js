"use strict";

const argv_util = require("./utils/argv_util.js")(process.argv);
const file_copy = require("./file_copy.js");

argv_util.register("--input", "-i", { expected_values: 1, multiple: true, required: true });
argv_util.register("--output", "-o", { expected_values: 1, required: true });
argv_util.register("--locale", "-l", { expected_values: 1, default: "en-US" });

new file_copy(argv_util);
