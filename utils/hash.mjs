import { readFileSync } from "fs";
import { createHash } from "crypto";

import { panic } from "./panic.mjs";

/// Returns a md5 hash digest for a given file.
///
/// [>] path :: string
///     File to hash.
/// [>] algorithm[? = "md5"] :: string
/// [>] encoding[? = "hex"] :: string
///     Encoding of the returned hash.
/// [!] Panic
/// [<] string
export function get_filehash(path, algorithm = "md5", encoding = "hex") {
  try {
    const buffer = readFileSync(path);
    const hash = createHash(algorithm);

    return hash.update(buffer).digest(encoding);
  } catch(err) {
    panic(err)`Failed to hash ${{ path }} with ${{ algorithm }}`;
  }
};
