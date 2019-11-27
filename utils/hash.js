"use strict";

const fs = require("fs");
const crypto = require("crypto");

const create_hash = (path, callback, algorithm = "sha1") => {
  const hash = crypto.createHash(algorithm);
  const stream = fs.createReadStream(path);

  stream.on("end", () => {
    callback(hash.digest("hex"));
    stream.destroy();
  }).pipe(hash);
};

const create_hash_sync = (path, algorithm = "sha1") => {
  const hash = crypto.createHash(algorithm);
  const buffer = fs.readFileSync(path);

  hash.update(buffer);

  return hash.digest("hex");
};

module.exports = {
  async: create_hash,
  sync: create_hash_sync
};
