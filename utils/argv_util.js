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
    let cli_pos = keys.map(k => this.argv.indexOf(k)).filter(f => f !== -1);

    switch(cli_pos.length) {
      case 0:
        if (arg.required) {
          throw new Error(`Missing required argument \`${keys.join(", ")}'.`);
        }
        break;

      case 1: {
        cli_pos = Number(cli_pos.shift());
        arg.is_set = true;

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
      } break;

      default:
        throw new Error(`Same argument found multiple times: \`${keys.join(", ")}'.`);
    }
  }

  is_set(arg) {
    return this.args[arg].is_set;
  }

  get_value(arg) {
    if (this.args[arg].value) {
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
  value: undefined,

  required: false,
  is_set: false
};

module.exports = exports = argv => {
  return new ArgvUtil(argv);
};
