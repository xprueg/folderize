import { moveCursor, clearLine } from "readline";
import { EOL } from "os";

import fmt_ansi_esc_codes from "./fmt_ansi_esc.mjs";

/// Returns a formatted timestamp.
///
/// [<] string
function get_timestamp() {
    return get_timestamp.formatter.format(Date.now());
}

/// The static formatter of the `get_timestamp` function.
///
/// <T> DateTimeFormat
get_timestamp.formatter = new Intl.DateTimeFormat(
    "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }
);

/// Prints either to stdout or stderr depending on the argument "fn".
/// A timestamp will be prepended if "msg" is defined,
/// otherwise an empty line will be printed.
///
/// [>] fn[val = log|error] :: string
/// [>] msg :: string
/// [<] void
function __print(fn, msg) {
  if (msg === String())
    return void console[fn](msg);

  msg = msg
    .split(EOL)
    .map(line => `[f]${get_timestamp()}[/f]\x20${line}`)
    .join(EOL);

  if (fn === "error")
    msg = `[red]${msg}[/red]`;

  console[fn](fmt_ansi_esc_codes(msg));
}

/// Prints to stdout.
/// A timestamp will be prepended if "msg" is defined,
/// otherwise an empty line will be printed.
///
/// [>] msg[? = ""] :: string
/// [<] void
export function println(msg = String()) {
  __print("log", msg);
}

/// Prints to stderr.
/// A timestamp will be prepended if "msg" is defined,
/// otherwise an empty line will be printed.
///
/// [>] msg[? = ""] :: string
/// [<] void
export function eprintln(msg = String()) {
  __print("error", msg);
}

/// Prints over the cleared prevoius line to stdout.
///
/// [>] msg[? = ""] :: string
/// [<] void
export function printover(msg = String()) {
  moveCursor(process.stdin, 0, -1);
  clearLine(process.stdin, 0);
  __print("log", msg);
}