"use strict";

const cli = require("./console_util.js");
const { OVERWRITE_LINE } = cli.constants;

class Progress {
  static to(val) {
    return new Progress(0, val);
  }

  constructor(from = 0, to = 0, options = {}) {
    this.from = from;
    this.to = to;
    this.options = options;
    this.messages = [];

    this.max_steps = 20;
    this.single_step = to / this.max_steps;
    this.current_step = 0;

    this.percentage_completed = 0;

    this.user_vars = {};
  }

  get_vars() {
    return Object.assign({}, {
      C: this.from,
      T: this.to,
      P: this.percentage_completed
    }, this.user_vars);
  }

  msg(msg, condition) {
    this.messages.push(new ProgressMessage(msg, condition));

    return this;
  }

  is_complete() {
    return this.percentage_completed === 100 ? true : false;
  }

  set(kvar, val) {
    this.user_vars[kvar] = val;

    return this;
  }

  update(kvar, val) {
    if (!this.user_vars.hasOwnProperty(kvar)) {
      this.user_vars[kvar] = 0;
    }

    this.user_vars[kvar] += val;

    return this;
  }

  step() {
    this.from = this.from + 1;
    this.percentage_completed = Math.floor(100 / this.to * this.from);

    if (this.from - this.current_step > this.single_step || this.percentage_completed === 100) {
      cli.log(
        this.messages.reduce((acc, msg) => acc += msg.to_str(this.get_vars()), ""),
        this.current_step === 0 ? false : OVERWRITE_LINE
      );

      this.current_step += this.single_step;
    }
  }
}

class ProgressMessage {
  constructor(msg, is_active = args => true) {
    this.msg = msg;
    this.is_active = is_active;
  }

  to_str(args) {
    if (!this.is_active(args)) return "";

    const re = new RegExp(`(?<!%)%(${ Object.keys(args).join("|") })+`, "g");
    return this.msg.replace(re, m => {
      m = m.substr(1);

      return args.hasOwnProperty(m) ? args[m] : "$1";
    });
  }
}

module.exports = Progress;
