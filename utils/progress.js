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

    this.tokens = {};
    this.token_replacer_regexp = this._get_token_replacer_regexp(this._get_tokens());
  }

  _get_token_replacer_regexp(tokens) {
    return new RegExp(`(?<!%)%(${ Object.keys(tokens).join("|") })+`, "g");
  }

  _get_tokens() {
    return Object.assign({}, {
      C: this.from,
      T: this.to,
      P: this.percentage_completed
    }, this.tokens);
  }

  msg(msg, condition) {
    this.messages.push(new ProgressMessage(msg, condition));

    return this;
  }


  set(token, val) {
    this.tokens[token] = val;
    this.token_replacer_regexp = this._get_token_replacer_regexp(this._get_tokens());

    return this;
  }

  update(token, val) {
    if (!this.tokens.hasOwnProperty(token)) {
      this.tokens[token] = 0;
    }

    this.tokens[token] += val;
    this.token_replacer_regexp = this._get_token_replacer_regexp(this._get_tokens());

    return this;
  }

  is_complete() {
    return this.percentage_completed === 100 ? true : false;
  }

  step() {
    this.from = this.from + 1;
    this.percentage_completed = Math.floor(100 / this.to * this.from);

    if (this.from - this.current_step > this.single_step || this.percentage_completed === 100) {
      cli.log(
        this.messages.reduce((acc, msg) => acc += msg.to_str(this._get_tokens(), this.token_replacer_regexp), ""),
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

  to_str(args, token_replacer_regexp) {
    if (!this.is_active(args)) return "";

    return this.msg.replace(
      token_replacer_regexp,
      (raw, key) => args.hasOwnProperty(key) ? args[key] : raw
    );
  }
}

module.exports = Progress;
