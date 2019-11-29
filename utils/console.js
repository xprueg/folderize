"use strict";

const readline = require("readline");

const ansi_esc_code = {
  // Reset
  reset: "\x1B[0m",

  // Formatting
  b: "\x1B[1m",
  i: "\x1B[3m",
  u: "\x1B[4m",
  r: "\x1B[7m",

  // Color
  cblack: "\x1B[30m",
  cr: "\x1B[31m",
  cg: "\x1B[32m",
  cy: "\x1B[33m",
  cb: "\x1B[34m",
  cm: "\x1B[35m",
  cc: "\x1B[36m",
  cwhite: "\x1B[37m",

  // Background
  cblackb: "\x1B[40m",
  crb: "\x1B[41m",
  cgb: "\x1B[42m",
  cyb: "\x1B[43m",
  cbb: "\x1B[44m",
  cmb: "\x1B[45m",
  ccb: "\x1B[46m",
  cwhiteb: "\x1B[47m"
};

const constants = {
  NOOP: 0,
  LEADING_SPACE: 1 << 0,
  OVERWRITE_LINE: 1 << 1
};

const timestamp_formatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

const get_timestamp = () => {
  return timestamp_formatter.format(Date.now());
}

const log = (msg, options = constants.NOOP) => {
  const prompt = `[${get_timestamp()}]`;

  if (options & constants.LEADING_SPACE) {
    console.log("");
  }

  if (options & constants.OVERWRITE_LINE) {
    readline.moveCursor(process.stdin, 0, -1);
    readline.clearLine(process.stdin, 0);
  }

  let esc_code_stack = [];
  msg.replace(/\[(\/?[a-z]*)\]/g, (m, cmd) => {
    if (ansi_esc_code.hasOwnProperty(cmd)) {
      esc_code_stack.push(ansi_esc_code[cmd]);
      return ansi_esc_code[cmd];
    } else if (cmd[0] === "/") {
      esc_code_stack.pop();
      return `${ansi_esc_code.reset}${esc_code_stack.join("")}`;
    } else {
      return m;
    }
  }).split("\n").forEach((line, i) => {
    console.log(`${!i ? prompt : `${"\x20".repeat(prompt.length - 1)}↗`}: ${line}`);
  });
};

module.exports = {
  log: log,
  constants: constants
};
