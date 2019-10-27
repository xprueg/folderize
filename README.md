# folderize
Copy files from multiple sources into a single folder sorted by creation date while preventing duplicate content.

### Synopsis
`node folderize.js --input ./in [--input ./in, …] --output ./out [--locale en-US] [--noindex]`

### Description
<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>-i</code>, <code>--input</code></td>
      <td>The source folder(s)</td>
    </tr>
    <tr>
      <td><code>-o</code>, <code>--output</code></td>
      <td>The destination folder</td>
    </tr>
    <tr>
      <td><code>-l</code>, <code>--locale</code></td>
      <td>
        <p>The locale to be used for folder creation in the destination folder.<br/>:warning: Requires node v.13.0.0 (or higher), or node build with full-icu support, for locales other than english.</p>
        <p><code>Default: en-US</code></p>
        <table>
          <thead>
            <tr>
              <th>en-US (Default)</th>
              <th>ja-JA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><pre>./out
└── 2019
    └── October
        └── 18</pre></td>
              <td><pre>./out
└── 2019年
    └── 10月
        └── 18日</pre></td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
    <tr>
      <td><code>--noindex</code></td>
      <td>Prevents indexing of the complete destination folder, folders are indexed when needed. Useful to speed up execution if you only need to add a few files.</td>
    </tr>
  </tbody>
</table>

---

### Todo
- [x] Prevent duplicates with `--noindex`
- [x] Properly parse arguments…
  - [x] to handle multiple inputs.
  - [x] to allow for extra options:
    - [x] Disable complete indexing of the output path.
    - [x] Set locale for folder creation.
