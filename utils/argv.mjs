import { panic } from "./panic.mjs";

/// <T> OptionProps :: Object{
///     short[?, len = 1] :: string,
///     assert[?] :: Fn(v: string) -> bool,
///     default[?] :: *,
///     expected_args[? = 1] :: uint|Infinity,
///     is_flag[? = false] :: bool
///     is_required[? = false] :: bool,
///     map[? = Fn(v: string) -> v] :: Fn(v: string) -> *
/// }

/// Represents a single command line option.
class Option {
    static #UNDEF = Symbol();
    static #PROPS = Object.assign(Object.create(null), {
        WRITEABLE: {
            short: Option.#UNDEF,
            assert: Option.#UNDEF,
            default: Option.#UNDEF,
            expected_args: 1,
            is_flag: false,
            is_required: false,
            map: (v) => v
        }
    });

    #is_set = false;
    #args = Array();

    /// Creates a new Option.
    ///
    /// [>] option :: string
    ///     The name of the option.
    /// [>] props :: OptionProps
    /// [!] Panic
    /// [<] Option
    constructor(option, props) {
        try {
            this.#validate(props);
            Object.assign(this, Option.#PROPS.WRITEABLE, props);

            // Set |expected_args| to zero for flags.
            if (this.is_flag)
                this.expected_args = 0;

            // Assign option as |long|.
            this.long = option;

            // Automatically set |short| to the first char of |long| if none is defined.
            if (this.short === Option.#UNDEF)
                this.short = this.long[0];

            // Prefix |long| and |short| to match the command line inputs.
            this.long = `--${this.long}`;
            this.short = `-${this.short}`;
        } catch(err) {
            panic(err)`Could not create ${{ option }}`;
        }
    }

    /// [§] Option::constructor
    static new(option, props) {
        return new Option(option, props);
    }

    /// Validates the Options properties.
    ///
    /// {xprueg} Assert not only the keys but also the types of the values.
    /// [>] props :: OptionProps
    /// [!] Panic
    /// [<] void
    #validate(props) {
        try {
            // Assert that all properties exist and are writable.
            for (let prop of Object.keys(props))
                if (!Object.keys(Option.#PROPS.WRITEABLE).includes(prop))
                    panic`[u]${prop}[/u] is an [u]invalid property[/u]`;
        } catch(err) {
            panic(err)`Could not validate properties`;
        }
    }

    /// Returns the Objects value.
    /// The return value will vary depending on the properties set.
    ///
    /// [<] *
    get args() {
        this.#assert();

        return this.is_flag
            ? this.#is_set
            : this.#is_set
                ? this.expected_args > 1
                    ? this.#args.map(this.map)
                    : this.map(this.#args[0])
                : this.default === Option.#UNDEF
                    ? undefined
                    : this.default;
    }

    /// Set if the Option is set.
    ///
    /// [>] b[? = true] :: bool
    /// [<] self
    is_set(b = true) {
        this.#is_set = b;

        return this;
    }

    /// Append a value to the Options arguments.
    ///
    /// [>] v :: string
    /// [<] void
    push(v) {
        this.#args.push(v);
    }

    /// Asserts that all requirements are met.
    ///
    /// [!] Panic
    /// [<] void
    #assert() {
        try {
            // Assert that required options are set.
            if (this.is_required && this.#is_set === false)
                panic`Required Option not set`;

            // Assert the argument count.
            if (this.#is_set) {
                if (this.#args.length > this.expected_args)
                    panic`Too many arguments,
                        expected ${this.expected_args},
                        received ${this.#args.length}
                    `;

                if (this.#args.length < this.excpected
                    || this.expected_args === Infinity && this.#args.length === 0)
                    panic`Too few arguments,
                        expected ${this.expected_args},
                        received ${this.#args.length}
                    `;
            }

            // Assert a custom user function.
            if (this.assert !== Option.#UNDEF)
                this.#args.forEach(this.assert);
        } catch(err) {
            panic(err)`Could not assert option ${this.long}`;
        }
    }
}

/// Utility class for parsing command line arguments.
export default class Argv {
    node_exec;
    src_file;
    #argv;
    #opts = Object.create(null);

    constructor(argv) {
        try {
            if (!Array.isArray(argv))
                panic`The "argv" argument must be of type array.`;

            if (argv.length < 2)
                panic`The "argv" argument must have a length of at least two`;

            this.#argv = Array.from(argv);
            this.node_exec = this.#argv.shift();
            this.src_file = this.#argv.shift();
        } catch(err) {
            panic(err)`Argv failed to construct`
        }
    }

    /// [§] Argv::constructor
    static new(argv = process.argv) {
        return new Argv(argv);
    }

    /// Returns the "opts" argument with their properties
    /// replaced by the argument(s) from the command line.
    ///
    /// [>] opts[? = Object] :: Object{ OptionProps }
    ///     Options with their properties.
    /// [!] Panic
    /// [<] Object{*}
    parse(opts = Object()) {
        try {
            // Create Options
            for (let [option, props] of Object.entries(opts))
                this.#opts[option] = Option.new(option, props);

            // Parse command line arguments
            this.#ungroup_compound_options();
            this.#parse_option();

            // Return options with their values assigned.
            return Object.entries(this.#opts).reduce(
                (out, [k, opt]) => Object.assign(out, { [k]: opt.args }),
                Object.create(null)
            );
        } catch(err) {
            panic(err)`Argv failed to parse the command line arguments`;
        }
    }

    /// Returns the given `Option` if defined.
    ///
    /// [>] o :: string
    ///     Long or short option including the dashes.
    /// [!] Panic
    /// [<] Option
    #get_option(o) {
        for (let option of Object.values(this.#opts))
            if (this.#is_long(o) && o === option.long ||
                this.#is_short(o) && o === option.short)
                return option;

        panic`Unkown ${{ option: o }}`;
    }

    /// Tests whether the string is an option, long or short.
    ///
    /// [>] s :: string
    /// [<] bool
    #is_option(s) {
        return this.#is_long(s) || this.#is_short(s);
    }

    /// Tests whether the string is a long option.
    ///
    /// [>] s :: string
    /// [<] bool
    #is_long(s) {
        return /^--[^-]/.test(s);
    }

    /// Tests whether the string is a short option.
    ///
    /// [>] s :: string
    /// [<] bool
    #is_short(s) {
        return /^-[^-]/.test(s);
    }

    /// Ungroup compound short options.
    /// -xyz → -x -y -z
    ///
    /// [<] void
    #ungroup_compound_options() {
        for (let i = 0, t = this.#argv[i]; i < this.#argv.length; ++i, t = this.#argv[i])
            if (this.#is_short(t))
                try { this.#get_option(t) } catch {
                    const split = t.substr(1).split(String()).map(t => `-${t}`);
                    this.#argv.splice(i, 1, ...split);
                }
    }

    #parse_option(pos = 0) {
        for (let i = pos; i < this.#argv.length; ++i) {
            const token = this.#argv[i];

            if (!this.#is_option(token))
                panic`Unexpected value [u]${token}[/u], expected an option`;

            const option = this.#get_option(token).is_set();
            return void this.#parse_arguments(option, i + 1);
        }
    }

    #parse_arguments(option, pos) {
        for (let i = pos; i < this.#argv.length; ++i) {
            const token = this.#argv[i];

            if (this.#is_option(token))
                return void this.#parse_option(i);

            option.push(token);
        }
    }
}