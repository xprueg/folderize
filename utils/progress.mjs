import { println, printover } from "./console.mjs";
import { panic } from "./panic.mjs";

class ProgressMessage {
  #msg;
  #should_print;

  /// Creates a new `ProgressMessage`. If the argument "should_print" is omitted,
  /// the message will always be printed.
  ///
  /// [>] message: string
  /// [?] should_print=undefined: Fn(Object{uint}, RegExp) -> bool
  /// [<] ProgressMessage
  constructor(message, should_print) {
    this.#msg = message;
    this.#should_print = should_print;
  }

  /// [§] ProgressMessage::constructor
  static new (message, should_print) {
    return new ProgressMessage(message, should_print);
  }

  /// Returns the formatted message if it should be printed or an empty string elsewise.
  ///
  /// [>] tokens: Object{uint}
  /// [>] re: RegExp
  /// [<] string 
  fmt(tokens, re) {
    if (this.#should_print === undefined || this.#should_print(tokens))
      return this.#msg.replace(re, (_, t) => tokens[t]);

    return String();
  }
}

/// Creates a `ProgressMessage` which will only print if the `Progress` has completed.
///
/// [>] msg: string
/// [<] ProgressMessage
export function done(msg) {
  return ProgressMessage.new(msg, (tokens) => tokens.progress === 100);
}

/// Creates a `ProgressMessage` which will always print.
///
/// [>] msg: string
/// [<] ProgressMessage
export function perm(msg) {
  return ProgressMessage.new(msg);
};

/// Creates a `ProgressMessage` which will only print if the `Progress`
/// contains the token used in the "msg" argument.
///
/// [>] msg: string
/// [<] ProgressMessage
export function symb(msg) {
  return ProgressMessage.new(msg, function(tokens) {
    return tokens.hasOwnProperty(msg.replace(/[^$]*\$(?<token>[^\s]+).*/, "$<token>"));
  });
};

export default class Progress {
  #from;
  #to;

  #steps = 100;
  #single_step;
  #current_step;

  #messages;

  #tokens;
  #tokens_re;

  #loader = function*(pattern) {
    for (let index = 0;;++index)
      yield pattern[index % pattern.length] + "\x20";
  }(["⠻", "⠽", "⠾", "⠷", "⠯", "⠟"]);

  /// Creates a new `Progress` instance with `to` steps.
  ///
  /// [>] to: uint
  /// [<] Progress
  constructor(to) {
    this.resize(to);
  }

  /// [§] Progress::constructor
  static to(to) {
    return new Progress(to);
  }

  /// Creates a new empty `Progress` instance.
  /// It must be resized before doing anything else than attaching a listener to it.
  ///
  /// [<] Progress
  static new() {
    return new Progress(0);
  }

  /// Resets the internal state, while keeping the messages,
  /// making the rueuse of the instance possible.
  ///
  /// [>] to: uint
  /// [!] Panic
  /// [<] self
  resize(to) {
    if (typeof to !== "number")
      panic`The argument "to" is mandatory`;

    this.#from = 0;
    this.#to = to;

    this.#current_step = 0;
    this.#single_step = this.#to / this.#steps;

    this.#tokens = Object();
    this.#update_tokens();
    this.#compile_token_regex();

    return this;
  }

  /// Sets the messages to print on each step.
  ///
  /// [>] message: Array<ProgressMessage>
  /// [!] Panic
  /// [<] self
  msg(messages) {
    if (!Array.isArray(messages))
      panic`The mandatory argument "messages" must be of type Array, received ${typeof messages}`;

    for(let m of messages)
      if (!(m instanceof ProgressMessage))
        panic`The argument "messages" must only contain ProgressMessage instances,
              found ${typeof m}:${m}`;

    this.#messages = messages;
    return this;
  }

  /// Increases a custom `token` by `amount`;
  ///
  /// [>] token: string
  /// [?] amount=1: uint[1..]
  /// [<] self
  increase(token, amount = 1) {
    if (!this.#tokens.hasOwnProperty(token)) {
      this.#tokens[token] = 0;
      this.#compile_token_regex();
    }

    this.#tokens[token] += amount;
    return this;
  }

  /// Updates the dynamic tokens.
  ///
  /// [<] void
  #update_tokens() {
    Object.assign(this.#tokens, {
      current: this.#from,
      total: this.#to,
      progress: this.percentage()
    });
  }

  /// Updates the regex for matching the tokens.
  /// This must be called everytime the keys on `self#tokens` change.
  ///
  /// [<] void
  #compile_token_regex() {
    this.#tokens_re = new RegExp(
      String.raw`\$(${ Object.keys(this.#tokens).join("|") })`,
      String.raw`g`
    );
  }

  /// Returns a number between 0 and 100 indicating how much the progress is completed.
  ///
  /// [<] uint[..100]
  percentage() {
    return this.#to === this.#from
      ? 100
      : Math.floor(100 / this.#to * this.#from);
  }

  /// Advances the progress by one step.
  /// Emits a "msg" event if there is a message to print.
  ///
  /// [<] void
  step() {
    this.#from += 1;

    if (this.#from - this.#current_step > this.#single_step || this.percentage() === 100) {
      this.#update_tokens();

      const message = this.#messages.reduce((out, m, i, a) => {
        if (i === 0 && this.percentage() !== 100) {
          out += this.#loader.next().value;
          out += "[r]";
        };

        out += m.fmt(this.#tokens, this.#tokens_re);
        if (i === a.length - 1 && this.percentage() !== 100) out += "[/r]";

        return out;
      }, String());

      this.#current_step === 0
        ? println(message)
        : printover(message);

      this.#current_step += this.#single_step;
    }
  }
}
