import { moveCursor, clearLine } from "readline";
import fmt_ansi_esc_codes from "./fmt_ansi_esc.mjs";

/**
 * Returns a formatted timestamp.
 * @returns {string}
 */
function get_timestamp() {
    return get_timestamp.formatter.format(Date.now());
}

/** @member {DateTimeFormat} */
get_timestamp.formatter = new Intl.DateTimeFormat(
    "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }
);

/**
 * Prints to stdout.
 * A timestamp will be prepended if [msg] is defined.
 * @todo Don't throw if msg is undefined.
 * @param {string} [msg] - The message to be printed.
 */
export function println(msg) {
  if (msg)
    msg = `[f]${get_timestamp()}[/f]\x20` + msg;

  console.log(fmt_ansi_esc_codes(msg));
}

/**
 * Prints to stderr.
 * A timestamp will be prepended if [msg] is defined.
 * @todo Don't throw if msg is undefined.
 * @param {string} [msg] - The message to be printed.
 */
export function eprintln(msg) {
  if (msg)
    msg = `[f]${get_timestamp()}[/f]\x20` + msg;

  console.error(fmt_ansi_esc_codes(msg));
}

/**
 * Prints to stdout over the cleared previous line.
 * @param {string} [msg] - The message to be printed.
 */
export function printover(msg) {
  moveCursor(process.stdin, 0, -1);
  clearLine(process.stdin, 0);
  println(msg);
}