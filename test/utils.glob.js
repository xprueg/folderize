const assert = require("assert");
const glob_match = require("../utils/glob.js");

const RESULT = 0;
const PATTERN = 1;
const STRING = 2;

// https://github.com/torvalds/linux/blob/6f0d349d922ba44e4348a17a78ea51b7135965b1/lib/globtest.c
const test_patterns = {
  "patternless": [
    [true, "a", "a"],
    [false, "a", "b"],
    [false, "a", "aa"],
    [false, "a", ""],
    [true, "", ""],
    [false, "", "a"]
  ],
  "fixed width wildcard": [
    [true, "?", "a"],
    [false, "?", "aa"],
    [false, "??", "a"],
    [true, "?x?", "axb"],
    [false, "?x?", "abx"],
    [false, "?x?", "xab"]
  ],
  "wildcard": [
    [true, "*b", "b"],
    [true, "*b", "ab"],
    [false, "*b", "ba"],
    [true, "*b", "bb"],
    [true, "*b", "abb"],
    [true, "*b", "bab"],
    [true, "*bc", "abbc"],
    [true, "*bc", "bc"],
    [true, "*bc", "bbc"],
    [true, "*bc", "bcbc"],
    [true, "*abcd*", "abcabcabcabcdefg"],
    [true, "*ab*cd*", "abcabcabcabcdefg"],
    [true, "*abcd*abcdef*", "abcabcdabcdeabcdefg"],
    [false, "*abcd*", "abcabcabcabcefg"],
    [false, "*ab*cd*", "abcabcabcabcefg"]
  ],
  "mixed": [
    [false, "*??", "a"],
    [true, "*??", "ab"],
    [true, "*??", "abc"],
    [true, "*??", "abcd"],
    [false, "??*", "a"],
    [true, "??*", "ab"],
    [true, "??*", "abc"],
    [true, "??*", "abcd"],
    [false, "?*?", "a"],
    [true, "?*?", "ab"],
    [true, "?*?", "abc"],
    [true, "?*?", "abcd"]
  ]
}

describe("glob_match()", function() {
  for (const [pattern_type, cases] of Object.entries(test_patterns)) {
    describe(`${pattern_type} pattern`, function() {
      cases.forEach(c => {
        it(`should${c[RESULT] ? "" : " not"} match \`${c[PATTERN]}' on \`${c[STRING]}'.`, function() {
          assert.equal(glob_match(c[PATTERN], c[STRING]), c[RESULT]);
        });
      });
    });
  }
});
