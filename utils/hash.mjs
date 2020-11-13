import { readFileSync, createReadStream } from "fs";
import { createHash } from "crypto";

/**
 * Asynchronously creates a hash and calls the callback with the hex representation.
 * @param {string} path - Path to the file to hash.
 * @param {function} callback - Function that will be called with the hash.
 * @param {string} [algorithm=sha1] - The algorithm to use.
 * @returns {void}
 */
export function hex_hash_async(path, callback, algorithm = "sha1") {
  const hash = createHash(algorithm);
  const stream = createReadStream(path);

  stream.on("end", () => {
    callback(hash.digest("hex"));
    stream.destroy();
  }).pipe(hash);
}

/**
 * Returns a hash in hex form.
 * @param {string} path - Path to the file to hash. 
 * @param {string} [algorithm=sha1] - The algorithm to use.
 * @returns {string} 
 */
export function hex_hash_sync(path, algorithm = "sha1") {
  const hash = createHash(algorithm);
  const buffer = readFileSync(path);

  return hash
    .update(buffer)
    .digest("hex");
};
