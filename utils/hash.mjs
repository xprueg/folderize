import { readFileSync } from "fs";
import { createHash } from "crypto";

/**
 * Returns the specified hash digest for a given file.
 * @param {string} path - Path to the file to hash. 
 * @param {string} [algorithm=sha1] - Algorithm to use.
 * @param {string} [encoding=hex] - Encoding of the returned hash.
 * @returns {Array.<{err: ?string, digest: string}>} 
 */
export function get_filehash(path, algorithm = "sha1", encoding = "hex") {
  try {
    const buffer = readFileSync(path);
    const hash = createHash(algorithm);

    return [null, hash.update(buffer).digest(encoding)];
  } catch(err) {
    return [err.code];
  }
};
