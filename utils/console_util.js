"use strict";

const ttyf = {
  clear: "\x1B[0m",
  bold: "\x1B[1m",
  underline: "\x1B[4m",
  reverse: "\x1B[7m"
};

const constants = {
  LEADING_SPACE: 0x0
};

const get_timestamp = () => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return formatter.format(Date.now());
}

const log = (msg, opts) => {
  const prompt = `[${get_timestamp()}]`;

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
};
