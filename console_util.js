"use strict";

const date_util = require("./date_util.js");

const ttyf = {
  clear: "\x1B[0m",
  bold: "\x1B[1m",
  underline: "\x1B[4m",
  reverse: "\x1B[7m"
};

const constants = {
  LEADING_SPACE: 0x0
};

const log = (msg, opts) => {
  const prompt = `[${date_util.get_timestamp()}]`;

  if (opts === constants.LEADING_SPACE) {
    console.log("");
  }

  msg
    .replace(/\[\/?[a-z]\]/g, cmd => {
      switch(cmd) {
        case "[b]": return ttyf.bold;
        case "[r]": return ttyf.reverse;
        case "[u]": return ttyf.underline;
        default:
          if (cmd.substr(1, 1) === "/") {
            return ttyf.clear;
          }

          return cmd;
      };
    })
    .split("\n")
    .forEach((line, i) => {
      console.log(`${!i ? prompt : `${"\x20".repeat(prompt.length - 1)}↗`}: ${line}`);
    });
};

module.exports = exports = {
  log: log,
  constants: constants
}
