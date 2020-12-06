class Option {
    static #UNDEF = Symbol();

    #self = Object.create(null);

    constructor(option, props) {
        Object.assign(this.#self, Option.#get_base(), props, Option.#get_defaults(option));

        // Set the expected arguments to 0 for flags.
        if (this.#self.is_flag)
            this.#self.expected_args = 0;

        // Automatically set the `alias' to the first letter of the `name' if none is defined.
        if (this.#self.alias === Option.#UNDEF)
            this.#self.alias = this.#self.name[0];

        // Prefix `name' and `alias' to match the command line inputs.
        this.#self.name = `--${this.#self.name}`;
        this.#self.alias = `-${this.#self.alias}`;
    }

    static new(name, data) {
        const err = Option.#validate_props(data);
        if (err) return [err];

        return [null, new Option(name, data)];
    }

    static #validate_props(props) {
        const allowed = Option.#get_base();

        for (let prop of Object.keys(props))
            if (allowed[prop] === undefined)
                return `Unkown property (${prop})`;

        return null;
    }

    static #get_base() {
        return Object.assign(Object.create(null), {
            alias: Option.#UNDEF,
            assert: () => true,
            default: Option.#UNDEF,
            expected_args: 1,
            is_flag: false,
            is_required: false,
            process: (v) => v
        });
    }

    static #get_defaults(option) {
        return Object.assign(Object.create(null), {
            is_set: false,
            name: option,
            args: Array()
        });
    }

    get name() {
        return this.#self.name;
    }

    get alias() {
        return this.#self.alias;
    }

    set is_set(bool) {
        this.#self.is_set = bool;
    }

    get args() {
        if (this.#self.is_flag)
            return this.#self.is_set;

        if (this.#self.is_set)
            return this.#self.expected_args > 1
                ? this.#self.args
                : this.#self.args[0];
        
        if (this.#self.default !== Option.#UNDEF)
            return this.#self.default;
        
        return null;
    }

    set args(value) {
        this.#self.args = value;
    }

    assert() {
        // Assert that required options are set.
        if (this.#self.is_required && this.#self.is_set === false)
            throw Error(`Required option ${this.#self.name} is not set.`);

        // Assert the expected argument count.
        if (this.#self.default === Option.#UNDEF
            && this.#self.args.length < this.#self.expected_args
            && this.#self.expected_args === Infinity && this.#self.args.length === 0)
            throw Error(
                `Excpected ${this.#self.expected_args === Infinity ? "at least 1" : this.#self.expected_args} ` +
                `argument(s) for ${this.#self.name}, received ${this.#self.args.length}.`
            );

        // Assert custom user function.
        this.#self.args.forEach(this.#self.assert);
    }

    process() {
        this.#self.args = this.#self.args.map(this.#self.process);
    }
}

/** Utility class for parsing command line arguments. */
export default class Argv {
    node_exec;
    src_file;
    #argv;

    // Raw option definitions from the user.
    #options;

    // Parsed options.
    #args = Object.create(null);

    constructor(argv) {
        this.node_exec = argv.shift();
        this.src_file = argv.shift();
        this.#argv = argv;
    }

    static new(argv = process.argv) {
        return new Argv(argv);
    }

    /**
     * Sets the options.
     * @param {object} options - CLI options.
     * @returns {this}
     */
    options(options) {
        this.#options = options;
        return this;
    }

    /**
     * Parses and returns the options.
     * @returns {Array.<{err: ?string, args: ?object}>}
     */
    parse() {
        let err = null;
    
        if (err = this.#parse_options())
            return [err];

        if (err = this.#extract_cli_values())
            return [err];

        try {
            Object.values(this.#args).forEach(option => {
                option.assert();
                option.process();
            });
        } catch (err) {
            return [err.toString()];
        }

        for (let [key, option] of Object.entries(this.#args))
            this.#args[key] = option.args;

        return [null, this.#args];
    }

    /**
     * Parse user defined options.
     * @returns {?string} Error message or null on success.
     */
    #parse_options() {
        for (let [option, props] of Object.entries(this.#options)) {
            const [err, opt] = Option.new(option, props);
            if (err === null) this.#args[option] = opt;
            else return err;
        }

        return null;
    }

    #is_option(str) {
        return this.#is_name(str) || this.#is_alias(str);
    }

    #is_name(str) {
        return /^--[^-]/.test(str);
    }

    #is_alias(str) {
        return /^-[^-]/.test(str);
    }

    /**
     * Groups argv tokens into groups of option and their argument(s).
     * [-i ./ -o /foo -o /bar /baz -c] → [[-i ./][-o /foo /bar /baz][-c]]
     * @returns {string[][]}
     */
    #group_cli_tokens() {
        let groups = Array();

        for (let start = 0, end = 0; end < this.#argv.length + 1; ++end) {
            const cli_token = this.#argv[end];
            const is_option =
                // Ignore first entry.
                start !== end && this.#is_option(cli_token)
                // Loop out of bounds to handle last entry.
                || cli_token === undefined;

            if (is_option) {
                const command = this.#argv.slice(start, end); 
                const exists = groups.filter(group => {
                    if (group[0] === command[0])
                        return group.push(...command.slice(1));

                    return false;
                });

                if (exists.length === 0)
                    groups.push(command);

                start = end;
            }
        }

        return groups;
    }

    /**
     * Extracts the options and arguments from argv.
     * @returns {?string} Error message or null on success.
     */
    #extract_cli_values() {
        const grouped_cli_tokens = this.#group_cli_tokens();

        for (let [option, ...args] of grouped_cli_tokens) {
            const defined_option = this.#get_defined_option(option);

            if (defined_option === false)
                return `Unkown option (${option})`;

            defined_option.is_set = true;
            defined_option.args = args;
        }

        return null;
    }

    /**
     * Returns an user defined <Option> if defined.
     * @param {string} option - Option to return.
     * @returns {?object}
     */
    #get_defined_option(option) {
        for (let arg of Object.values(this.#args)) {
            if (this.#is_name(option) && option === arg.name ||
                this.#is_alias(option) && option === arg.alias)
                return arg;
        }

        return false;
    }
}