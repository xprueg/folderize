import assert from "assert";
import fs from "fs";
import path from "path";

import Lookup from "../file_lookup.mjs";

describe('Lookup', function() {
  describe('.generate()', function() {
    it('should handle hash collisions', () => {
      const root = "test/sha1_collision";
      const lookup = Lookup.new(root);
      const err = lookup.generate();

      assert.strictEqual(err, null);

      fs.readdirSync("test/sha1_collision").forEach(filename => {
        assert(lookup.contains(path.join(root, filename)));
      });
    });
  });
});