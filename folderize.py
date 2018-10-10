import sys
import os
import filecmp
import datetime
import pathlib
import locale
import calendar
import shutil

def main():
    # Make sure months will always be in the same language
    locale.setlocale(locale.LC_ALL, "en_US.UTF-8")

    if len(sys.argv) < 2:
        print("Error: No path argument specified!", file=sys.stderr)
    else:
        root = sys.argv[1]
        Folderize(root)

class Folderize:
    def __init__(self, root):
        self.root = root
        if not os.path.isdir(root):
            raise ValueError("Error: The argument `{argv}' is not a valid directory".format(argv=root))

        self.filecount = self.get_file_count(self.root)
        self.current_index = 0

        self.iterate_files(self.root, self.maybe_copy, self.update_progressbar)

    def iterate_files(self, path, func, callback=None):
        with os.scandir(path) as it:
            for file in it:
                if not file.name.startswith(".") and file.is_file():
                    if callback is not None:
                        callback(file.path)

                    if func(file.path):
                        return True

    def update_progressbar(self, file):
        self.current_index += 1
        print("\rCopied {i} of {filecount} files @ {progress} %".format(
            i=self.current_index,
            filecount=self.filecount,
            progress=int(100 / self.filecount * (self.current_index))
        ), end="" if (self.current_index < self.filecount) else "\n")

    def maybe_copy(self, src):
        src_base = os.path.basename(src)
        src_splitname = os.path.splitext(src_base)
        dst_folder = self.get_dst_folder(src)
        dst = os.path.join(dst_folder, src_base)

        tmp_file_i = 0

        while True:
            # Filename exists
            if os.path.isfile(dst):

                # Same name, same contents
                if filecmp.cmp(src, dst):
                    break

                # Same name, different contents
                else:
                    tmp_filename = "{name}_{i}{ext}".format(
                        name=src_splitname[0],
                        i=tmp_file_i,
                        ext=src_splitname[1]
                    )
                    dst = os.path.join(dst_folder, tmp_filename)
                    tmp_file_i += 1

            # File with different name has same contents (within target folder)
            elif os.path.isdir(dst_folder) and self.iterate_files(dst_folder, lambda file: filecmp.cmp(src, file)):
                break

            # Filename nor contents match, create it
            else:
                pathlib.Path(dst_folder).mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                break

    def get_file_count(self, path):
        with os.scandir(path) as it:
            return len([x for x in it if not x.name.startswith(".") and x.is_file()])

    def get_dst_folder(self, file):
        cdate = datetime.datetime.fromtimestamp(os.path.getmtime(file))
        return os.path.join(
            self.root,
            str(cdate.year),
            calendar.month_name[cdate.month],
            str(cdate.day)
        )

if __name__ == "__main__":
    main()
