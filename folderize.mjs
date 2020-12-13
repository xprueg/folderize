import fs from "fs";
import path from "path";
import { assert } from "console";
import { EOL } from "os";

import Argv from "./utils/argv.mjs";
import Lookup from "./file_lookup.mjs";
import file_copy from "./file_copy.mjs";
import { println, eprintln } from "./utils/console.mjs";
import { Read } from "./utils/fs.mjs";
import Progress from "./utils/progress.mjs";

const cli_options = {
  // The input folder(s).
  input: {
      expected_args: Infinity, is_required: true,
      assert: (dir) => assert(fs.statSync(dir).isDirectory()),
      process: (dir) => path.resolve(dir)
  },

  // The destination folder.  The current folder (./) is used as default.
  output: {
      default: "./",
      assert: (dir) => assert(fs.statSync(dir).isDirectory()),
      process: (dir) => path.resolve(dir)
  },

  // Structure that should be constructed in the output directory.
  // Every slash will create a new subdirectory.
  // The default is %Y/%B/%e which will result in 2020/February/1.
  dirstruct: { default: "%Y/%B/%e" },

  // The locale to be used for folder creation in the destination folder.
  // Locales other than english need at least node v.13 or node build with full-icu.
  // The default is en−US.
  locale: { default: "en-US" },

  // The files and/or folders names which shall not be copied.
  // The regex must not be enclosed by slashes.
  exclude: {
      default: /^[]/,
      assert: (regex) => assert(new RegExp(regex)),
      process: (regex) => new RegExp(regex)
  },

  // Enables the creation/use of the cache file `folderize.cache'.
  cache: { is_flag: true }
};

process.on("uncaughtException", (err) => {
  eprintln(`${err.toString().split(EOL).map(line => `! ${line}`).join(EOL)}`);
  println();
  process.exit(1);
});

println();

const settings = Argv.new().parse(cli_options);
const lookup = Lookup.new(settings.output, settings.exclude);

if (settings.cache && fs.existsSync(lookup.get_cachefile())) {
  // Load cachefile
  lookup.load_cachefile();
  println("← Restored cache from cachefile.");

  // Update index
  const diff = lookup.update();
  if (diff.total === 0) {
    println("\x20\x20Cache is up to date with the live folder.");
  } else {
    const diff_indicator_length = Math.min(20, diff.total);
    const plus = "+".repeat(Math.floor(diff_indicator_length / diff.total * diff.added.length));
    const minus = "-".repeat(Math.floor(diff_indicator_length / diff.total * diff.removed.length));

    println(
      "\x20\x20Updated cache against the live folder." +
      `\x20[green]${plus}[/green][red]${minus}[/red]`
    );
  }
} else {
  // (Re)build index
  const stats = Read.dir(settings.output).exclude(settings.exclude).count(Read.FILE | Read.DIR);
  const progress = Progress.to(stats.file)
    .loader(Progress.constants.LOADER, "\x20\x20")
    .msg("Cached %P% (%C/%T)")
    .msg(", done.", t => t.P === 100);

  println(`→ Creating in-memory cache for [u]${settings.output}[/u].`);
  println(`\x20\x20Found ${stats.file} file(s) in ${stats.dir} directories.`);

  lookup.generate(progress.step.bind(progress));
}

println();

settings.input.forEach(src => {
  new file_copy(
    src, settings.output,
    settings.locale, settings.exclude, lookup, settings.dirstruct
  );

  println();
});

if (settings.cache) {
  lookup.save_cachefile();
  println(`→ Saved cachefile.`);
  println();
}