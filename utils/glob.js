// https://github.com/torvalds/linux/blob/6f0d349d922ba44e4348a17a78ea51b7135965b1/lib/glob.c
function glob_match(pattern, string) {
  let pattern_pos = 0;
  let string_pos = 0;
  let backtrack_pattern_pos = false;
  let backtrack_string_pos = false;

  for (;;) {
    const pattern_char = pattern[pattern_pos++];
    const string_char = string[string_pos++];
    const next_pattern_char = pattern[pattern_pos];
    const next_string_char = string[string_pos];

    switch(pattern_char) {
      case "?":
        if (string_char === undefined) {
          return false;
        }

        break;

      case "*":
        if (next_pattern_char === undefined) {
          return true;
        }

        backtrack_pattern_pos = pattern_pos;
        backtrack_string_pos = --string_pos;

        break;

      default:
        if (pattern_char === string_char) {
          if (pattern_char === undefined) {
            return true;
          }

          break;
        }

        if (!backtrack_pattern_pos || string_char === undefined) {
          return false;
        }

        pattern_pos = backtrack_pattern_pos;
        string_pos = ++backtrack_string_pos;
    }
  }
}

module.exports = glob_match;
