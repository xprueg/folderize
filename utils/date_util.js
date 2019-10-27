"use strict";

module.exports = exports = (locale => {
  let formatter = {
    day: new Intl.DateTimeFormat(locale, { day: "numeric" }),
    month: new Intl.DateTimeFormat(locale, { month: "long" }),
    year: new Intl.DateTimeFormat(locale, { year: "numeric" })
  };

  return class DateUtil {
    static extract(mtime) {
      mtime = new Date(mtime);

      return {
        day: formatter.day.format(mtime),
        month: formatter.month.format(mtime),
        year: formatter.year.format(mtime)
      };
    }
  };
});
