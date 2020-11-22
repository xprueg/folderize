/**
 * A lookup table between tags and ansi escape codes.
 * @const {object}
 */
const codes = {
    // Reset
    reset: "\x1B[0m",
    
    // Formatting
    b: "\x1B[1m",
    f: "\x1B[2m",
    i: "\x1B[3m",
    u: "\x1B[4m",
    r: "\x1B[7m",
    
    // Foreground
    black:   "\x1B[30m",
    red:     "\x1B[31m",
    green:   "\x1B[32m",
    yellow:  "\x1B[33m",
    blue:    "\x1B[34m",
    magenta: "\x1B[35m",
    cyan:    "\x1B[36m",
    white:   "\x1B[37m",
    
    // Background
    bblack:   "\x1B[40m",
    bred:     "\x1B[41m",
    bgreen:   "\x1B[42m",
    byellow:  "\x1B[43m",
    bblue:    "\x1B[44m",
    bmagenta: "\x1B[45m",
    bcyan:    "\x1B[46m",
    bwhite:   "\x1B[47m"
};

/**
 * A regular expression to match the tags from 'codes',
 * in the form of [tag]text[/tag].
 * @const {RegExp}
 */
const regex = new RegExp(
  "\\[" +       // Opening square bracket
    "(" +       // Capture group
      "\\/?" +  // Optional forward slash
      "(?:" +   // Non capturing group of tags
        Object.keys(codes).join("|") +
      "))\\]",
  "g"
);

/**
 * Replaces tags with the appropriate ansi escape sequence.
 * @param {string} [msg=""] - The message to be formatted.
 * @returns {string}
 */
export default function fmt_ansi_esc_codes(msg = String()) {
  let stack = [];
  return msg.replace(regex, (_, tag) => {
    if (tag[0] !== "/") {
      stack.push(codes[tag]);
      return codes[tag];
    } else {
      stack.pop();
      return codes.reset + stack.join(String());
    }
  });
}