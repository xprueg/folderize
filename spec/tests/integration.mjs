import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { panic } from "../../utils/panic.mjs";
import Lookup from "../../file_lookup.mjs";
import DateDir from "../../utils/datedir.mjs";
import Testfile from "../utils/testfile.mjs";
import cli_defaults from "../../cli_defaults.mjs";
import Argv from "../../utils/argv.mjs";
import { get_filehash } from "../../utils/hash.mjs";

/// const<T> Object{Array<Testfile>}
const testfiles = {
    basic: Array.from({ length: 20 }).map(_ => Testfile.new()),
    mtime: Array.from({ length: (new Date().getUTCFullYear()) - 1970 })
                .map((_, i) => Testfile.new({ mtime: `${(new Date().getUTCFullYear()) - i}-01-01T00:00:00.000Z`})),
    dotfile: [
        Testfile.new({ name: ".hidden" }),
        Testfile.new({ dir: "A", name: ".hidden" }),
        Testfile.new({ dir: "B/.hidden", name: ".hidden" }),
    ],
    emoji: [
        Testfile.new({ name: "👩‍👩‍👦‍👦.emoji" }),
        Testfile.new({ name: "👩‍👩‍👦‍👦.🛸" }),
        Testfile.new({ contents: "💿🏳️‍🌈" }),
        Testfile.new({ dir: "emoji/🗂/🎆" ,contents: "😀👉🧪👀" }),
    ],
    name_collision: [
        Testfile.new({ dir: "A", name: "collis.ion" }),
        Testfile.new({ dir: "B", name: "collis.ion" }),
        Testfile.new({ dir: "A/B", name: "collis.ion" }),
    ],
    content_collision: [
        Testfile.new({ contents: "identical content" }),
        Testfile.new({ contents: "identical content" }),
        Testfile.new({ dir: "A", contents: "identical content" }),
        Testfile.new({ dir: "A/B", contents: "identical content" }),
    ],
    md5_hash_collision: [
        // https://marc-stevens.nl/research/md5-1block-collision/
        Testfile.new({ contents: Buffer.from("4dc968ff0ee35c209572d4777b721587d36fa7b21bdc56b74a3dc0783e7b9518afbfa200a8284bf36e8e4b55b35f427593d849676da0d1555d8360fb5f07fea2", "hex") }),
        Testfile.new({ contents: Buffer.from("4dc968ff0ee35c209572d4777b721587d36fa7b21bdc56b74a3dc0783e7b9518afbfa202a8284bf36e8e4b55b35f427593d849676da0d1d55d8360fb5f07fea2", "hex") }),
        // https://eprint.iacr.org/2010/643
        Testfile.new({ contents: Buffer.from("0e306561559aa787d00bc6f70bbdfe3404cf03659e704f8534c00ffb659c4c8740cc942feb2da115a3f4155cbb8607497386656d7d1f34a42059d78f5a8dd1ef", "hex") }),
        Testfile.new({ contents: Buffer.from("0e306561559aa787d00bc6f70bbdfe3404cf03659e744f8534c00ffb659c4c8740cc942feb2da115a3f415dcbb8607497386656d7d1f34a42059d78f5a8dd1ef", "hex") }),
    ]
};

function test_if_copied(testfile) {
    const src = path.join(this.testsrc, testfile.dir, testfile.name);
    const dst = path.join(this.testdst, this.datedir.fmt(testfile.mtime), testfile.name);

    expect(this.lookup.contains(src)).withContext(`File [[${src}]] should exist in the lookup`).toBeTrue();
    expect(fs.existsSync(dst)).withContext(`File [[${dst}]] should exist in dst`).toBeTrue();
}

function test_if_mtime_is_copied(testfile) {
    const dst = path.join(this.testdst, this.datedir.fmt(testfile.mtime), testfile.name);

    expect(fs.statSync(dst).mtime.getTime()).toEqual(testfile.mtime.getTime());
}

describe("Folderize", function() {
    beforeAll(function() {
        this.testroot = "./spec/tests";
        this.testsrc = path.join(this.testroot, "src");
        this.testdst = path.join(this.testroot, "dst");

        // Create test directories.
        fs.mkdirSync(this.testsrc);
        fs.mkdirSync(this.testdst);

        // Prepare argv.
        if (!process.argv.includes("--"))
            panic`Usage: npx jasmine -- [folderize options]`;

        for (let arg of ["-i", "--input", "-o", "--output"])
            if (process.argv.includes(arg))
                panic`Don't use input/output for tests as they are created dynamically`;

        // argv == npx jasmine -- [args]
        this.argv = Array.from(process.argv);
        // argv == node folderize.mjs -- [args]
        this.argv[0] = "node";
        this.argv[1] = "folderize.mjs";
        // argv == node folderize.mjs -i src -o dst [args]
        this.argv.splice(this.argv.indexOf("--"), 1, "-i", this.testsrc, "-o", this.testdst);
        const opts = Argv.new(this.argv).parse(cli_defaults);

        // Init DateDir.
        this.datedir = DateDir.new(opts.dirstruct, opts.locale);

        // Spawn testfiles.
        for (let files of Object.values(testfiles)) {
            files.forEach(testfile => {
                if (testfile.dir)
                    fs.mkdirSync(path.join(this.testsrc, testfile.dir), { recursive: true });

                const fullname = path.join(this.testsrc, testfile.dir, testfile.name);
                fs.writeFileSync(fullname, testfile.contents);
                fs.utimesSync(fullname, new Date(), testfile.mtime);
            });
        }

        // Run folderize.
        console.log(`\x1B[4m${this.argv.join("\x20")}\x1B[0m`);
        execSync(this.argv.join("\x20"), { stdio: "pipe" });  // Don't print folderize output to the test console.

        // Init Lookup.
        this.lookup = Lookup.new(this.testdst);
        this.lookup.generate();
    });

    afterAll(function() {
        // Clean up.
        fs.rmSync(this.testsrc, { recursive: true });
        fs.rmSync(this.testdst, { recursive: true });
    });

    describe("files with content collision and different name", function() {
        it("should have skipped files with identical contents", function() {
            testfiles.content_collision =
                testfiles.content_collision.filter(testfile =>
                    fs.existsSync(path.join(this.testdst, this.datedir.fmt(testfile.mtime), testfile.name)));

            expect(testfiles.content_collision.length).toBe(1);
        });
    });

    describe("files with md5 hash collision", function() {
        it("should have the same hash", function() {
            const f = testfiles.md5_hash_collision;
            for (let i = 0; i < f.length; i += 2) {
                const a = path.join(this.testsrc, f[i + 0].dir, f[i + 0].name);
                const b = path.join(this.testsrc, f[i + 1].dir, f[i + 1].name);

                expect(get_filehash(a)).toEqual(get_filehash(b));
            }
        });
    });

    Array.of(
        ["basic", "files"],
        ["mtime", "files with varying mtime"],
        ["dotfile", "dotfiles"],
        ["emoji", "files with emoji name/content"],
        ["name_collision", "files with colliding names"],
        ["content_collision", "files with colliding content"],
        ["md5_hash_collision", "files with colliding md5 hashes"]
    ).forEach(([type, desc]) => {
        describe(desc, function() {
            it("should have been copied", function() {
                for (let testfile of testfiles[type])
                    test_if_copied.call(this, testfile);
            });
    
            it("should have had their mtime updated", function() {
                for (let testfile of testfiles[type])
                    test_if_mtime_is_copied.call(this, testfile);
            });
        });
    });
});