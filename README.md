# folderize
Copy files into a folder sorted by creation date while preventing duplicate content.

### Synopsis
`node folderize.js --input ./in --output ./out`

### Description
|Argument|Description|
|--------|-----------|
|`-i`, `--input`|The source folder|
|`-o`, `--output`|The output folder|

---

### Todo
- [x] Properly parse arguments…
  - [ ] to handle multiple inputs.
  - [ ] to allow for extra options:
    - [ ] Disable complete indexing of the output path.
    - [ ] Set locale for folder creation.
