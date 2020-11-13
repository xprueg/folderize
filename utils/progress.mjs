import { println, printover } from "./console.mjs";

export default class Progress {
  static to(val, options = {}) {
    return new Progress(0, val, options);
  }

  constructor(from = 0, to = 0, options = {}) {
    this.from = from;
    this.to = to;
    this.options = options;
    this.messages = [];

    this.loader_msg = { loading: String(), done: String() };
    this.loader_gen = function* (loader) {
      let index = 0;

      while(true) {
        yield `${loader[index++ % loader.length]}\x20`;
      }
    }(["⠻", "⠽", "⠾", "⠷", "⠯", "⠟"]);

    this.max_steps = 100;
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

  loader(loading, done = String()) {
    this.loader_msg = {
      loading: loading,
      done: done
    };

    return this;
  }

  msg(msg, is_active) {
    this.messages.push(new ProgressMessage(msg, is_active));

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
    this.percentage_completed = this.to === this.from ? 100 : Math.floor(100 / this.to * this.from);

    if (this.from - this.current_step > this.single_step || this.percentage_completed === 100) {
      let message = this.messages.reduce(
        (acc, msg) => acc += msg.to_str(this._get_tokens(), this.token_replacer_regexp),
        String()
      );

      if (this.percentage_completed !== 100) {
        const load_msg = this.loader_msg.loading & Progress.constants.LOADER
          ? this.loader_gen.next().value
          : this.loader_msg.loading;

        message = `${load_msg}[r]${message}[/r]`;
      } else {
        message = this.loader_msg.done + message;
      }

      this.current_step === 0
        ? println(message)
        : printover(message);

      this.current_step += this.single_step;
    }
  }
}

Progress.constants = {
  LOADER: 1 << 0
}

class ProgressMessage {
  constructor(msg, is_active = tokens => true) {
    this.msg = msg;
    this.is_active = is_active;
  }

  to_str(tokens, token_replacer_regexp) {
    if (this.is_active(tokens)) {
      return this.msg.replace(
        token_replacer_regexp,
        (m, t) => tokens.hasOwnProperty(t) ? tokens[t] : m
      );
    } else {
      return String();
    }
  }
}
