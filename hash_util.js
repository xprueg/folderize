"use strict";

const fs = require("fs");
const crypto = require("crypto");

const default_algo = "sha256";

const create_file_hash = (filepath, callback, algo = default_algo) => {
  const hash = crypto.createHash(algo);
  const stream = fs.createReadStream(filepath)
    .on("end", () => {
      callback(hash.digest("hex"));
      stream.destroy();
    })
    .pipe(hash);
};

const create_file_hash_sync = (filepath, algo = default_algo) => {
  const buffer = fs.readFileSync(filepath);

  return crypto.createHash(algo).update(buffer).digest("hex");
};

module.exports = exports = {
  create_file_hash: create_file_hash,
  create_file_hash_sync: create_file_hash_sync
};
