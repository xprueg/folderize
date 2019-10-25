"use strict";

const date = new Intl.DateTimeFormat("en-us", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

const timestamp = new Intl.DateTimeFormat("en-us", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

module.exports = exports = {
  extract: mtime => date.formatToParts(new Date(mtime))
    .filter(x => x.type !== "literal")
    .reduce((acc, x) => Object.assign(acc, { [x.type]: x.value }), {}),
  get_timestamp: () => timestamp.format(Date.now())
};
