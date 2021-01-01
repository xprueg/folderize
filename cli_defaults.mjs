import assert from "assert";
import fs from "fs";
import path from "path";

export default {
    // The input folder(s).
    input: {
        expected_args: Infinity, is_required: true,
        assert: (dir) => assert(fs.statSync(dir).isDirectory()),
        map: (dir) => path.resolve(dir)
    },

    // The destination folder.  The current folder (./) is used as default.
    output: {
        default: "./",
        assert: (dir) => assert(fs.statSync(dir).isDirectory()),
        map: (dir) => path.resolve(dir)
    },

    // Structure that should be constructed in the output directory.
    // Every slash will create a new subdirectory.
    // The default is %Y/%B/%e which will result in 2020/February/1.
    dirstruct: {
        default: "%Y/%B/%e"
    },

    // The locale to be used for folder creation in the destination folder.
    // Locales other than english need at least node v.13 or node build with full-icu.
    // The default is en−US.
    locale: {
        default: "en-US"
    },

    // The files and/or folders names which shall not be copied.
    // The regex must not be enclosed by slashes.
    exclude: {
        default: /^[]/,
        assert: (regex) => assert(new RegExp(regex)),
        map: (regex) => new RegExp(regex)
    },

    // Enables the creation/use of the cache file `folderize.cache'.
    cache: {
        is_flag: true
    }
};