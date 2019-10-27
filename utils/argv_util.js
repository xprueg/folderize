"use strict";

class ArgvUtil {
  constructor(argv) {
    this.argv = argv.slice(2);
    this.args = {};
  }

  register(...vals) {
    let arg = JSON.parse(JSON.stringify(ArgvUtil.default_arg));
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
    let cli_positions = [];
    for (let [cli_pos, cli_arg] of this.argv.entries()) {
      if (keys.includes(cli_arg)) {
        cli_positions.push(cli_pos);
      }
    }

    if (cli_positions.length === 0) {
      if (arg.required) {
        throw new Error(`Missing required argument \`${keys.join(", ")}'.`);
      }
    } else {
      if (cli_positions.length >= 2) {
        if (!arg.multiple) {
          throw new Error(`Same argument found multiple times: \`${keys.join(", ")}'.`);
        }
      }

      arg.is_set = true;
      arg.value = this.extract_arg_value(cli_positions, arg.expected_values, arg.multiple);
    }
  }

  extract_arg_value(cli_positions, expected_values, multiple) {
    let value;

    if (expected_values > 1 || multiple) {
      value = [];
    }

    for (const cli_position of cli_positions) {
      let cli_pos = cli_position;

      for (let i = 0; i < expected_values; ++i) {
        let next_cli_arg = this.argv[++cli_pos];

        if (!next_cli_arg) {
          throw new Error(`Too few arguments, \`${this.argv[cli_position]}' expects ${expected_values} argument(s).`);
        }

        if (expected_values === 1 && !multiple) {
          value = next_cli_arg;
        } else {
          value.push(next_cli_arg);
        }
      }
    }

    return value;
  }

  is_set(arg) {
    return this.args[arg].is_set;
  }

  get_value(arg) {
    if (!this.args[arg]) {
      throw new Error(`Unkown argument \`${arg}'.`);
    } else if (this.args[arg].value) {
      return this.args[arg].value;
    } else if (this.args[arg].default) {
      return this.args[arg].default;
    } else {
      return undefined;
    }
  }

  get_arg(arg) {
    return this.is_set(arg) && this.args[arg];
  }
}

ArgvUtil.default_arg = {
  expected_values: 0,
  multiple: false,
  value: undefined,

  required: false,
  is_set: false
};

module.exports = exports = argv => {
  return new ArgvUtil(argv);
};
