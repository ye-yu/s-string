import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    getConfigMap,
    validateConfigSpace,
    validateTrimConfigValue,
    validateConfig,
    compileConfig,
    TrimConfig,
    s,
} from "./index.ts";

describe("getConfigMap", () => {
    it("getConfigMap parses single values correctly", () => {
        const config = "@space = auto\n@trim = head";
        const result = getConfigMap(config);

        assert.deepEqual(result, {
            space: "auto",
            trim: "head",
        });
    });

    it("getConfigMap parses multiple values into array", () => {
        const config = "@trim = head tail all";
        const result = getConfigMap(config);

        assert.deepEqual(result, {
            trim: ["head", "tail", "all"],
        });
    });

    it("getConfigMap handles empty values gracefully", () => {
        const config = "@space =   ";
        const result = getConfigMap(config);

        assert.deepEqual(result, {
            space: [],
        });
    });
})

describe("validateConfigSpace", () => {
    it("validateConfigSpace accepts 'auto'", () => {
        assert.equal(validateConfigSpace("auto"), null);
    });

    it("validateConfigSpace accepts numeric string", () => {
        assert.equal(validateConfigSpace("4"), null);
    });

    it("validateConfigSpace rejects non-numeric string", () => {
        const error = validateConfigSpace("abc");
        assert.match(error!, /received: abc/);
    });

    it("validateConfigSpace rejects multiple values", () => {
        const error = validateConfigSpace(["auto", "4"]);
        assert.match(error!, /received multiple/);
    });

    it("validateConfigSpace accepts integer string", () => {
        assert.equal(validateConfigSpace("10"), null);
    });

    it("validateConfigSpace rejects float string", () => {
        const error = validateConfigSpace("10.5");
        assert.match(error!, /valid integer number/);
    });

    it("validateConfigSpace rejects scientific notation", () => {
        const error = validateConfigSpace("1e2");
        assert.match(error!, /valid integer number/);
    });

    it("validateConfigSpace rejects negative float", () => {
        const error = validateConfigSpace("-3.14");
        assert.match(error!, /valid integer number/);
    });

    it("validateConfigSpace accepts negative integer", () => {
        assert.equal(validateConfigSpace("-3"), null);
    });
})

describe("validateTrimConfigValue", () => {
    it("validateTrimConfigValue accepts valid trims", () => {
        for (const value of TrimConfig) {
            assert.equal(validateTrimConfigValue(value), true);
        }
    });

    it("validateTrimConfigValue rejects invalid trims", () => {
        assert.equal(validateTrimConfigValue("invalid"), false);
    });
})

describe("validateConfig", () => {
    it("validateConfig throws on invalid space", () => {
        const badConfig = { space: "abc", trim: "head" };
        assert.throws(() => validateConfig(badConfig), /Configuration errors/);
    });

    it("validateConfig throws on conflicting trim values (head)", () => {
        const badConfig = { trim: ["head", "head-once"] };
        assert.throws(() => validateConfig(badConfig), /conflicting values/);
    });

    it("validateConfig throws on conflicting trim values (tail)", () => {
        const badConfig = { trim: ["tail", "tail-once"] };
        assert.throws(() => validateConfig(badConfig), /conflicting values/);
    });

    it("validateConfig throws on invalid trim value", () => {
        const badConfig = { trim: "bogus" };
        assert.throws(() => validateConfig(badConfig), /invalid value/);
    });
})

describe("compileConfig", () => {
    it("compileConfig returns valid ReindentConfig", () => {
        const configString = "@space = auto\n@trim = head";
        const result = compileConfig(configString);

        assert.deepEqual(result, {
            space: "auto",
            trim: "head",
        });
    });

    it("compileConfig throws on invalid config", () => {
        const configString = "@space = abc\n@trim = bogus";
        assert.throws(() => compileConfig(configString), /Configuration errors/);
    });
})

describe("s``", () => {
    it("reindent with negative space inserts blank lines", () => {
        const actual = s`
            @space = -2
            @trim = none
            hello world
            another line
        `

        const expected = "  \n              hello world\n              another line\n          ";
        assert.equal(actual, expected, new Error("not equal", { cause: { actual, expected } }));
    });

    it("reindent with negative space and tail trim removes trailing whitespace", () => {
        const actual = s`
            @space = -1
            @trim = tail
            hello world
        `

        const expected = " \n             hello world";
        assert.equal(actual, expected, new Error("not equal", { cause: { actual, expected } }));
    });

    it("reindent with auto space and all trim", () => {
        const actual = s`
            @space = auto
            @trim = all
            hello world
            this is nice
                let's put a new line
            and then we back again
        `;

        const expected = "hello world\nthis is nice\n    let's put a new line\nand then we back again";
        assert.equal(actual, expected, new Error("not equal", { cause: { actual, expected } }));
    });

    it("reindent with negative space and all trim", () => {
        const actual = s`
            @space = auto
            @trim = all
            hello world
            this is nice
        `;

        const expected = "hello world\nthis is nice";
        assert.equal(actual, expected, new Error("not equal", { cause: { actual, expected } }));
    });

    it("reindent with auto space and all trim", () => {
        const actual = s`
            @space = auto
            @trim = head tail-once


            hello world
            this is nice
                let's put a new line
            and then we back again
        `;
        const expected = "hello world\nthis is nice\n    let's put a new line\nand then we back again";
        assert.equal(actual, expected, new Error("not equal", { cause: { actual, expected } }));
    })

    it("reindent with auto space and all trim", () => {
        const actual = s`
            @space = 12
            @trim = head tail-once


            hello world
            this is nice
                let's put a new line
        but then we reverse back again
        `;
        const expected = "hello world\nthis is nice\n    let's put a new line\nbut then we reverse back again";
        assert.equal(actual, expected, new Error("not equal", { cause: { actual, expected } }));
    })

    it('should still interpolate variables correctly', () => {
        const data = ["string", 1, true, [], {}]
        const actual = s`
            @space = auto
            @trim = all
            hello world
            this is nice
            ${data[0]} ${data[1]} ${data[2]} ${data[3]} ${data[5]}
        `;

        const expected = `hello world\nthis is nice\n${data[0]} ${data[1]} ${data[2]} ${data[3]} ${data[5]}`;
        assert.equal(actual, expected, new Error("not equal", { cause: { actual, expected } }));
    })
})