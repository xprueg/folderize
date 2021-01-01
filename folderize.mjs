import fs from "fs";
import { EOL } from "os";

import cli_defaults from "./cli_defaults.mjs";
import Argv from "./utils/argv.mjs";
import Lookup from "./file_lookup.mjs";
import Copy from "./file_copy.mjs";
import { println, eprintln } from "./utils/console.mjs";
import { Read } from "./utils/fs.mjs";
import Progress, { done, perm, symb } from "./utils/progress.mjs";

process.on("uncaughtException", (err) => {
  eprintln(`${err.toString().split(EOL).map(line => `! ${line}`).join(EOL)}`);
  println();
  console.log(err);
  println();
  process.exit(1);
});

println();

const progress = Progress.new();
const settings = Argv.new().parse(cli_defaults);
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

  progress.resize(stats.file).msg([
    done("\x20".repeat(2)),
    perm("Cached $progress% ($current/$total)"),
    done(", done.")
  ]);

  println(`→ Creating in-memory cache for [u]${settings.output}[/u].`);
  println(`\x20\x20Found ${stats.file} file(s) in ${stats.dir} directories.`);

  lookup.generate(progress.step.bind(progress));
}

println();

const copy = Copy.new(lookup, settings)
  .on("skip", (fullname) => { progress.increase("skipped").step() })
  .on("file_copied", progress.step.bind(progress));

settings.input.forEach((dir) => {
    const stats = Read.dir(dir).exclude(settings.exclude).count(Read.FILE | Read.DIR);
    println(`← Copying files from [u]${dir}[/u].`);
    println(`\x20\x20Found ${stats.file} file(s) in ${stats.dir} directories.`);

    progress.resize(stats.file).msg([
        done("\x20".repeat(2)),
        perm("Copied $progress% ($current/$total)"),
        symb(", Skipped $skipped file(s)"),
        done(", done.")
    ]);

    copy.from(dir);
    println();
});

if (settings.cache) {
  lookup.save_cachefile();
  println(`→ Saved cachefile.`);
  println();
}
