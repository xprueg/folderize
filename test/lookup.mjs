import assert from "assert";
import fs from "fs";

import Lookup from "../file_lookup.mjs";

describe('Lookup', function() {
  describe('.generate()', function() {
    it('should handle hash collisions', () => {
      const test_files = "test/sha1_collision";
      const lookup = Lookup.new(test_files);
      const err = lookup.generate();

      assert.strictEqual(err, null);

      fs.readdirSync("test/sha1_collision")
        .forEach(filename => assert(lookup.contains(filename)));
    });
  });
});