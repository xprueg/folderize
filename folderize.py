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
        if os.path.isdir(root):
            folderize(root)
        else:
            print("Error: The argument ``{argv}'' is not a valid path".format(argv=root), file=sys.stderr)

def iterate_files(path, callback):
    with os.scandir(path) as it:
        for file in it:
            if not file.name.startswith(".") and file.is_file():
                if callback(file.path):
                    return True

    return False

def folderize(folder):
    iterate_files(folder, lambda file: maybe_copy(file, get_dst_path(folder, file)))

def maybe_copy(src_file, dst_folder):
    basename = os.path.basename(src_file)
    splitname = os.path.splitext(basename)
    dst_file = os.path.join(dst_folder, basename)

    tmp_file_i = 0

    while True:
        # Filename exists
        if os.path.isfile(dst_file):
            
            # Same name, same contents
            if filecmp.cmp(src_file, dst_file):
                break
                
            # Same name, different contents
            else:
                dst_file = os.path.join(dst_folder, "{name}_{i}{ext}".format(name=splitname[0],
                                                                             i=tmp_file_i,
                                                                             ext=splitname[1]))
                tmp_file_i += 1
                
        # File with different name has same contents (within target folder)
        elif os.path.isdir(dst_folder) and iterate_files(dst_folder, lambda file: filecmp.cmp(src_file, file)):
            break
            
        # Neither filename nor contents match, create it
        else:
            pathlib.Path(dst_folder).mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_file, dst_file)
            break

def get_dst_path(root, file):
    cdate = datetime.datetime.fromtimestamp(os.path.getmtime(file))
    return os.path.join(root, str(cdate.year), calendar.month_name[cdate.month], str(cdate.day))

if __name__ == "__main__":
    main()
