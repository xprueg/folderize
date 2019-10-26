"use strict";

const default_arg = {
  expected_values: 0,
  value: undefined,

  required: false,
  is_set: false
};

module.exports = exports = class ArgvUtil {
  constructor(argv) {
    this.argv = argv.slice(2);
    this.args = {};
  }

  register(...vals) {
    let arg = JSON.parse(JSON.stringify(default_arg));
    let names = [];

    vals.forEach(v => {
      if (typeof v === "string") {
        names.push(v);
      } else if (typeof v === "object") {
        Object.assign(arg, v);
      }
    });

    this.parse_argv(arg, names);

    names.forEach(n => this.args[n] = arg);
  }

  parse_argv(arg, keys) {
    let cli_pos = keys.map(k => this.argv.indexOf(k)).filter(f => f !== -1);

    if (cli_pos.length === 0) {
      if (arg.required) {
        throw new Error(`Missing required argument \`${keys.join(", ")}'.`);
      }
    } else if (cli_pos.length >= 2) {
      throw new Error(`Same argument found multiple times: \`${keys.join(", ")}'.`);
    } else {
      cli_pos = Number(cli_pos.shift());
      arg.is_set = true;
    }

    for (let i = 0; i < arg.expected_values; ++i) {
      let next_cli_arg = this.argv[++cli_pos];

      if (!next_cli_arg) {
        throw new Error(`Too few arguments, \`${keys.join(", ")}' expects ${arg.expected_values} argument(s).`);
      }

      if (arg.expected_values === 1) {
        arg.value = next_cli_arg;
      } else {
        if (!arg.value) {
            arg.value = [];
        }

        arg.value.push(next_cli_arg);
      }
    }
  }

  is_set(arg) {
    return this.args[arg].is_set;
  }

  get_value(arg) {
    return this.args[arg].value;
  }

  get_arg(arg) {
    return this.is_set(arg) && this.args[arg];
  }
}
