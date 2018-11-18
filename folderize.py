import sys
import os
import argparse
import filecmp
import datetime
import pathlib
import locale
import calendar
import shutil

def main():
    parser = argparse.ArgumentParser(description="Sort files into folders by creation date")
    parser.add_argument("-i", "--input", required=True, action="append", help="The source folder(s)")
    parser.add_argument("-o", "--output", required=True, help="The destination folder")
    parser.add_argument("-l", "--locale", required=False, help="The locale to be used for folder creation", default="en_US")
    args = parser.parse_args()

    locale.setlocale(locale.LC_TIME, "{locale}.UTF-8".format(locale=args.locale))

    lookup = BuildFileLookup(args.output)

    for input in args.input:
        Folderize(input, args.output, lookup)

def BuildFileLookup(path):
    lookup = dict()

    filecount = GetFileCount(path)
    current_index = 0
    for root, _, files in os.walk(path):
        for file in files:
            if not file.startswith("."):
                ProgressBar.Log("Building file lookup", current_index, filecount)
                current_index += 1

                fileobj = File(os.path.join(root, file))
                if fileobj not in lookup:
                    lookup[fileobj] = fileobj

    return lookup

class File:
    def __init__(self, path):
        self.path = path
        self.hashed_filecontent = File.CreateFilecontentHash(self.path)

    @staticmethod
    def CreateFilecontentHash(path):
        return hash(File.Read(path))

    @staticmethod
    def Read(path):
        with open(path, mode="rb") as file:
            return file.read()

    def __hash__(self):
        return self.hashed_filecontent

    def __eq__(self, other):
        return filecmp.cmp(self.path, other.path)

class Folderize:
    def __init__(self, root, output, lookup):
        self.root = root
        if not os.path.isdir(root):
            raise ValueError("-i: `{argv}' is not a valid directory".format(argv=root))

        self.output = output
        if not os.path.isdir(output):
            raise ValueError("-o: `{argv}' is not a valid directory".format(argv=output))

        self.lookup = lookup
        self.filecount = GetFileCount(self.root)
        self.current_index = 0
        self.progressbar_length = 10

        self.IterateFiles(self.root, self.MaybeCopy, self.UpdateProgressbar)

    def IterateFiles(self, path, func, callback=None):
        with os.scandir(path) as it:
            for file in it:
                if file.is_dir():
                    self.IterateFiles(file.path, func, callback)
                elif not file.name.startswith(".") and file.is_file():
                    if callback is not None:
                        callback(file.path)

                    if func(file.path):
                        return True

    def UpdateProgressbar(self, file_path):
        ProgressBar.Log(
            "{root} -> {output}".format(root=self.root, output=self.output),
            self.current_index,
            self.filecount
        )
        self.current_index += 1

    def MaybeCopy(self, src):
        fileobj = File(src)

        # Another file with same contents exists
        if fileobj in self.lookup:
            return

        # No other file with the same contents exists
        self.lookup[fileobj] = fileobj

        src_base = os.path.basename(src)
        src_splitname = os.path.splitext(src_base)
        dst_folder = self.GetDstFolder(src)
        dst = os.path.join(dst_folder, src_base)

        tmp_file_i = 0

        while True:
            # Filename does not exists
            if not os.path.isfile(dst):
                pathlib.Path(dst_folder).mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                break

            # Filename exists already, find new name
            else:
                tmp_filename = "{name}_{i}{ext}".format(
                    name=src_splitname[0],
                    i=tmp_file_i,
                    ext=src_splitname[1]
                )
                dst = os.path.join(dst_folder, tmp_filename)
                tmp_file_i += 1

    def GetDstFolder(self, file):
        cdate = datetime.datetime.fromtimestamp(os.path.getmtime(file))
        return os.path.join(
            self.output,
            str(cdate.year),
            calendar.month_name[cdate.month],
            str(cdate.day)
        )

class ProgressBar:
    length = 20
    char_loaded = "@"
    char_unloaded = "."

    @staticmethod
    def Log(info, index, total):
        if index == 0:
            print(info)

        index += 1
        current_progress = int(100 / total * index)
        current_progressbar_length = int(ProgressBar.length / total * index)
        print("\r  {progress:3}% [{loaded}{unloaded}] {i} of {total}".format(
            progress=current_progress,
            loaded=ProgressBar.char_loaded * current_progressbar_length,
            unloaded=ProgressBar.char_unloaded * (ProgressBar.length - current_progressbar_length),
            i=index,
            total=total
        ), end="" if (index < total) else "\n\n")

def GetFileCount(path):
    filecount = 0
    for _, _, files in os.walk(path):
        for file in files:
            if not file.startswith("."):
                filecount += 1

    return filecount

if __name__ == "__main__":
    main()
