# folderize
The folderize utility copies files from multiple sources into a single destination folder.&nbsp;&nbsp;In the destination folder the files are sorted in a folder tree created by their last modification time (`mtime`).

## Synopsis
<pre><b>folderize</b> <b>--input</b> <ins>PATH</ins> <ins>...</ins> <b>--output</b> <ins>PATH</ins> [<b>--locale</b> <ins>LOCALE</ins>] [<b>--nofullindex</b>]</pre>

## Options

<div><code><b>--input</b>, <b>-i</b> <ins>PATH</ins> <ins>...</ins></code></div>
<dl><dd>The input folder(s).</dd></dl>

<div><code><b>--output</b>, <b>-o</b> <ins>PATH</ins></code></div>
<dl><dd>The destination folder.</dd></dl>

<div><code><b>--locale</b>, <b>-l</b> <ins>LOCALE</ins></code></div>
<dl><dd>The locale to be used for folder creation in the destination folder.&nbsp;&nbsp;Locales other than english need at least node v.13 or node build with full-icu.&nbsp;&nbsp;The default is en−US.</pre></dd></dl>

<div><code><b>--nofullindex</b>, <b>-n</b></code></div>
<dl><dd>Prevent indexing of the complete destination folder, folders are indexed when needed.&nbsp;&nbsp;Useful to speed up execution if you only need to add a few files.&nbsp;&nbsp;This will not prevent duplicates across the whole destination folder.</dd></dl>
