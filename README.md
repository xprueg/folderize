# folderize
Copy files into a folder sorted by creation date while preventing duplicate content.

### Synopsis
`node folderize.js --input ./in --output ./out [--locale en-US]`

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
      <td><code>-i</code>, <code>--&nbsp;input</code></td>
      <td>The source folder</td>
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
  </tbody>
</table>

---

### Todo
- [x] Properly parse arguments…
  - [ ] to handle multiple inputs.
  - [ ] to allow for extra options:
    - [ ] Disable complete indexing of the output path.
    - [x] Set locale for folder creation.
