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
 * @param {string} [msg=""] - The message to be printed.
 * @returns {void}
 */
export function println(msg = String()) {
  if (msg !== String())
    msg = `[f]${get_timestamp()}[/f]\x20` + msg;

  console.log(fmt_ansi_esc_codes(msg));
}

/**
 * Prints to stderr.
 * A timestamp will be prepended if [msg] is defined.
 * @param {string} [msg=""] - The message to be printed.
 * @returns {void}
 */
export function eprintln(msg = String()) {
  if (msg !== String())
    msg = `[f]${get_timestamp()}[/f]\x20` + msg;

  console.error(fmt_ansi_esc_codes(`[red]${msg}[/red]`));
}

/**
 * Prints to stdout over the cleared previous line.
 * @param {string} [msg=""] - The message to be printed.
 * @returns {void}
 */
export function printover(msg = String()) {
  moveCursor(process.stdin, 0, -1);
  clearLine(process.stdin, 0);
  println(msg);
}