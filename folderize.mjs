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
settings.exclude = [settings.exclude, /^\.folderize\.(cache|inode)$/];

const lookup = Lookup.new(settings.output, settings.exclude);

if (settings.cache && lookup.load_cachefile()) {
  println("← Restored cache from cachefile.");

  const diff = lookup.update();
  if ((diff.added.length + diff.removed.length) === 0) {
    println("\x20\x20Cache is up to date with the live folder.");
  } else {
    println("\x20\x20Updated cache against the live folder.");
    println(`\x20\x20${diff.added.length} insertions(+), ${diff.removed.length} deletions(-).`);
  }
} else {
  const stats = Read.dir(settings.output)
                    .exclude(settings.exclude)
                    .count(Read.FILE | Read.DIR);

  println(`→ Creating in-memory cache for [u]${settings.output}[/u].`);
  println(`\x20\x20Found ${stats.file} file(s) in ${stats.dir} directories.`);

  progress.resize(stats.file).msg([
    done("\x20\x20"),
    perm("Cached $progress% ($current/$total)"),
    done(", done.")
  ]);

  lookup.generate(progress.step.bind(progress));
}

println();

const copy = Copy.new(lookup, settings)
  .on("skip", (fullname) => { progress.increase("skipped").step() })
  .on("file_copied", progress.step.bind(progress));

settings.input.forEach((dir) => {
    const stats = Read.dir(dir)
                      .exclude(settings.exclude)
                      .count(Read.FILE | Read.DIR);

    println(`← Copying files from [u]${dir}[/u].`);
    println(`\x20\x20Found ${stats.file} file(s) in ${stats.dir} directories.`);

    progress.resize(stats.file).msg([
        done("\x20\x20"),
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
