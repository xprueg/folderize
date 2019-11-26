"use strict";

class ConsoleArgument {
  constructor(name, options = {}) {
    Object.assign(this, {
      default: null,
      is_required: false,
      expected_values: 1,
      is_flag: false
    }, options, {
      name: name,
      value: [],
      is_set: false
    });
  }

  get_value() {
    if (this.is_flag) {
      return null;
    }

    if (this.is_set) {
      if (this.expected_values > 1) {
        return this.value;
      } else {
        return this.value[0];
      }
    } else if (this.default !== null) {
      return this.default;
    } else {
      return null;
    }
  }
}

class ConsoleArgumentParser {
  constructor(argv) {
    this.node_exec = argv.shift();
    this.src_file = argv.shift();
    this.argv = argv;
    this.argc = this.argv.length;

    // Split arguments like `-fLaG' into `-f -L -a -G'.
    // This will be disabled if a single dash argument, longer
    // than a single character, is defined (e. g. `-Flag').
    this.normalize_single_dash_arguments = true;

    this.args = {};
  }

  define(name, options = {}) {
    this._assert_name(name);
    const arg = new ConsoleArgument(name, options);

    if (/^-[^-]/.test(name) && name.length > 2 ||
        arg.alias && /^-[^-]/.test(arg.alias) && arg.alias.length > 2) {
      this.normalize_single_dash_arguments = false;
    }

    this.args[name] = arg;
    if (arg.alias) {
    	this._assert_name(arg.alias);
      this.args[arg.alias] = arg;
    }
  }

  flag(name, options = {}) {
    this.define(
      name,
      Object.assign(options, { is_flag: true, expected_values: 0 })
    );
  }

  _get_defined_arg(name) {
    return this.args.hasOwnProperty(name) && this.args[name];
  }

  parse() {
    if (this.normalize_single_dash_arguments) {
      this.argv = this._normalize_argv(this.argv);
      this.argc = this.argv.length;
    }

    let current_defined_arg = null;

    for (let cli_pos = 0; cli_pos < this.argc; ++cli_pos) {
      const cli_arg = this.argv[cli_pos];

      // Add values to the current argument unless the value is a defined argument itself.
      if (current_defined_arg && !this._get_defined_arg(cli_arg) &&
          current_defined_arg.expected_values > current_defined_arg.value.length) {
        current_defined_arg.value.push(cli_arg);
        continue;
      }

      this._assert_val_count(current_defined_arg);

      // Set the current argument.
      if (current_defined_arg = this._get_defined_arg(cli_arg)) {
        if (current_defined_arg.is_set) {
          throw new Error(
            `${current_defined_arg.name}` +
            `${current_defined_arg.alias ? ` [${current_defined_arg.alias}]` : ""} ` +
						`is specified multiple times.`);
        }

      	current_defined_arg.is_set = true;
      } else {
        throw new Error(`Undefined argument \`${cli_arg}'.`);
      }
    }

    this._assert_val_count(current_defined_arg);
    this._assert_required();
    this._make_arg_values_readily_available();

    return this.args;
  }

  _make_arg_values_readily_available() {
    for (let [name, defined_arg] of Object.entries(this.args)) {
      this.args[name.replace(/^-{1,2}/, "")] = defined_arg.is_flag ? defined_arg.is_set : defined_arg.get_value();
    }
  }

  _normalize_argv(argv) {
    for (let cli_pos = 0; cli_pos < argv.length; ++cli_pos) {
      let cli_arg = argv[cli_pos];

      if (/^-[^-]{2,}$/.test(cli_arg)) {
        cli_arg = cli_arg.substr(1)
          .split("")
          .map(arg => `-${arg}`);

        argv.splice(cli_pos, 1, ...cli_arg);
        cli_pos += (cli_arg.length - 1);
      }
    }

    return argv;
  }

  _assert_name(name) {
    let err = false;

    if (!/^-/.test(name)) {
      err = "Arguments must start with a dash.";
    } else if (name.length < 2) {
      err = "Arguments, including the preceding dash, must be at least two characters long.";
    } else if (/^--/.test(name) && name.length === 2) {
      err = "Empty double dash arguments are not allowed.";
    } else  if (this._get_defined_arg(name)) {
      err = "Argument already defined.";
    }

    if (err) {
      throw new Error(`${err} Invalid argument \`${name}'.`);
    }
  }

  _assert_required() {
    const missing_required_args = Object.entries(this.args).filter(entry => {
      const [name, defined_arg] = entry;

      return defined_arg.is_required && !defined_arg.is_set && defined_arg.default === null;
    }).map(entry => entry[0]);

    if (missing_required_args.length > 0) {
      throw new Error(`Missing required arguments ${missing_required_args.join(", ")}.`);
    }
  }

  _assert_val_count(defined_arg) {
    if (defined_arg &&
        defined_arg.value.length < defined_arg.expected_values &&
        defined_arg.expected_values !== Infinity) {
      throw new Error(
        `Expected ${defined_arg.expected_values} value(s) for ${defined_arg.name}, ` +
        `received ${defined_arg.value.length}.`);
    }
  }
}

module.exports = exports = argv => {
  return new ConsoleArgumentParser(argv);
};
