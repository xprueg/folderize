import fs from "fs";
import path from "path";

import ConsoleArgumentParser from "./utils/console_arg_parser.mjs";
import Lookup from "./file_lookup.mjs";
import file_copy from "./file_copy.mjs";
import { println, eprintln } from "./utils/console.mjs";
import ufs from "./utils/fs.mjs";
import Progress from "./utils/progress.mjs";

const cap = new ConsoleArgumentParser(process.argv);
cap.define("--input", { alias: "-i", expected_values: Infinity, is_required: true });
cap.define("--output", { alias: "-o", default: "./" });
cap.define("--dirstruct", { alias: "-d", default: "%Y/%B/%e" })
cap.define("--locale", { alias: "-l", default: "en-US" });
cap.define("--exclude", { alias: "-e", default: "^[]" });
cap.flag("--nocache", { alias: "-n" });
const args = cap.parse();

(() => {
  println();

  const settings = {
    locale: args.locale,
    use_cachefile: !args.nocache,
    dirstruct: args.dirstruct
  };
  
  try { settings.exclude = new RegExp(args.exclude) }
  catch (err) { return void eprintln(`Failed to compile --exclude regex. ${err}\n`) }

  const sources = args.input.map(i => path.resolve(i));
  const destination = path.resolve(args.output);
  const lookup = Lookup.new(destination, settings.exclude);

  if (settings.use_cachefile && fs.existsSync(lookup.get_cachefile())) {
    const err = lookup.load_cachefile();
    if (!err) {
      println("← Restored cache from cachefile.");

      const [err, diff] = lookup.update();
      if (!err) {
        const diff_indicator_length = Math.min(20, diff.total);
        const plus = "+".repeat(Math.floor(diff_indicator_length / diff.total * diff.added.length));
        const minus = "-".repeat(Math.floor(diff_indicator_length / diff.total * diff.removed.length));

        if (diff.total === 0) {
          println("\x20\x20Cache is up to date with the live folder.");
        } else {
          println(
            "\x20\x20Updated cache against the live folder." +
            `\x20[green]${plus}[/green][red]${minus}[/red]`
          );
        }
      } else {
        return void eprintln(`! Failed to update cache against live folder. (${err})\n`);
      }
    } else {
      return void eprintln(`! Failed to load the cachefile. (${err})\n`);
    }
  } else {
    const [err, stats] = ufs.get_folder_stats(destination, settings.exclude);
    if (err) return void eprintln(`! Failed to stat ${destination}. (${err})\n`);

    const progress = Progress.to(stats.files)
      .loader(Progress.constants.LOADER, "\x20\x20")
      .msg("Cached %P% (%C/%T)")
      .msg(", done.", t => t.P === 100);

    println(`→ Creating in-memory cache for [u]${destination}[/u].`);
    println(`\x20\x20Found ${stats.files} file(s) in ${stats.dirs} directories.`);

    const lookup_err = lookup.generate(progress.step.bind(progress));
    if (lookup_err)
      return void eprintover(`! Failed to generate the in-memory cache. (${err})\n`);
  }

  println();

  sources.forEach(src => {
    new file_copy(
      src, destination,
      settings.locale, settings.exclude, lookup, settings.dirstruct
    );

    println();
  });

  if (settings.use_cachefile) {
    const err = lookup.save_cachefile();

    if (!err) {
      println(`→ Saved cachefile.`);
    } else {
      eprintln(`! Failed to save the cachefile. (${err})`);
    }
  }

  println();
})();