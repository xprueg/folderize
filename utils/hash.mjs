import { readFileSync } from "fs";
import { createHash } from "crypto";

import { panic } from "./panic.mjs";

/**
 * Returns the specified hash digest for a given file.
 * @param {string} path - Path to the file to hash. 
 * @param {string} [algorithm=sha1] - Algorithm to use.
 * @param {string} [encoding=hex] - Encoding of the returned hash.
 * @throws {Panic}
 * @returns {string} 
 */
export function get_filehash(path, algorithm = "sha1", encoding = "hex") {
  try {
    const buffer = readFileSync(path);
    const hash = createHash(algorithm);

    return hash.update(buffer).digest(encoding);
  } catch(err) {
    panic(err)`Failed to hash ${{ path }} with ${{ algorithm }}`;
  }
};
