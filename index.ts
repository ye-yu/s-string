function* alternate<First extends any[], Second extends any[]>(first: First, second: Second): Generator<any[]> {
    for (let i = 0, j = 0; i < first.length || j < second.length;) {
        if (i < first.length) {
            yield first[i++];
        }
        if (j < second.length) {
            yield second[j++];
        }
    }
}

const getRegex = () => /\s*@(\w+)\s*=\s*([^\n]+)/g;
export function getConfigMap(config: string): Record<string, string[] | string> {
    const regex = getRegex()
    const result: Record<string, string[] | string> = {};

    let match;
    while ((match = regex.exec(config)) !== null) {
        const key = match[1];
        const values = match[2].trim().split(/\s+/).filter(e => e);
        result[key] = !values.length ? [] : values.length === 1 ? values[0] : values;
    }

    return result
}

export const SpaceConfigMap = {
    "auto": "auto",
    "none": "none",
} as const
export const SpaceConfig = Object.keys(SpaceConfigMap) as Array<keyof (typeof SpaceConfigMap)>
export type SpaceConfig = (typeof SpaceConfig)[number]


export const TrimConfigMap = {
    "none": "none",
    "head": "head",
    "tail": "tail",
    "all": "all",
    "head-once": "head-once",
    "tail-once": "tail-once",
    "all-once": "all-once",
} as const
export const TrimConfig = Object.keys(TrimConfigMap) as Array<keyof (typeof TrimConfigMap)>
export type TrimConfig = (typeof TrimConfig)[number]

export type ReindentConfig = {
    // how many spaces " " to remove before each new line, 
    // "auto" calculates the minimum spaces trimmable for all lines
    space: SpaceConfig | `${number}`

    // allows trimming the head or the tail of the string
    trim: TrimConfig[] | TrimConfig
}
export const ReindentConfigKeys = [
    "space",
    "trim",
] satisfies (keyof ReindentConfig)[] as string[]


export function validateConfigSpace(values: string[] | string): string | null {
    values = Array.isArray(values) ? values : [values]
    let [firstValue] = values
    if (!values.length) {
        firstValue = "auto"
    }

    if (values.length > 1) {
        return `@space can only accept one value of "auto" or a valid number. received multiple of: ${values.join(", ")}`
    }

    if (firstValue === "auto") {
        return null
    }

    const isNumber = Number.isFinite(+firstValue)

    if (!isNumber) {
        return `@space can only accept "auto" or a valid number. received: ${firstValue}`
    }

    if (Math.floor(parseInt(firstValue)) !== parseFloat(firstValue)) {
        return `@space can only accept a valid integer number. received: ${firstValue}`
    }

    return null
}

export function validateTrimConfigValue(value: string): value is TrimConfig {
    return TrimConfig.includes(value as any)
}

export function validateConfig(configMap: Record<string, string[] | string>): asserts configMap is ReindentConfig {
    const assertionErrors = new Array<string>()
    for (const key in configMap) {
        if (!ReindentConfigKeys.includes(key)) continue;
        if (key === "space") {
            const notValid = validateConfigSpace(configMap[key])
            if (notValid) {
                assertionErrors.push(notValid)
            }
        }
        if (key === "trim") {
            let values = configMap[key]
            values = Array.isArray(values) ? values : [values]
            const heads: TrimConfig[] = []
            const tails: TrimConfig[] = []
            for (const value of values) {
                if (!validateTrimConfigValue(value)) {
                    assertionErrors.push(`@trim received invalid value of: ${value}`)
                    continue
                }

                if (value.startsWith("head") || value.startsWith("all")) {
                    heads.push(value)
                }

                if (value.startsWith("tail") || value.startsWith("all")) {
                    tails.push(value)
                }
            }

            if (heads.length > 1) {
                assertionErrors.push("@trim received conflicting values of: " + heads.join(", "))
            }

            if (tails.length > 1) {
                assertionErrors.push("@trim received conflicting values of: " + tails.join(", "))
            }
        }
    }

    if (assertionErrors.length) {
        throw new Error("Configuration errors:\n" + assertionErrors.join("\n"), {
            cause: {
                assertionErrors,
                source: configMap
            }
        })
    }
}


export function compileConfig(configString: string): ReindentConfig {
    const configMap = getConfigMap(configString)
    validateConfig(configMap)
    return configMap
}

const allEmpty = /^\s*$/g
const spaceStarts = /^(\s)+/
function countSpaceStart(e: string) { return e.match(spaceStarts)?.[0]?.length ?? 0 }
export function reindent(input: string, config: ReindentConfig): string {
    const lines = input.split("\n");
    const trims = new Set(Array.isArray(config.trim) ? config.trim : [config.trim])
    if (trims.has("all-once") || trims.has("head-once")) {
        if (lines[0]?.match(allEmpty)) lines.shift()
    } else if (trims.has("all") || trims.has("head")) {
        while (lines[0]?.match(allEmpty)) lines.shift()
    }

    if (trims.has("all-once") || trims.has("tail-once")) {
        if (lines.at(-1)?.match(allEmpty)) lines.pop()
    } else if (trims.has("all") || trims.has("tail")) {
        while (lines.at(-1)?.match(allEmpty)) lines.pop()
    }


    const spaces = config.space === "none" ? 0
        : config.space === "auto" ? lines.reduce((a, b) => Math.min(a, countSpaceStart(b)), Number.MAX_SAFE_INTEGER)
            : Number(config.space)

    const mapper = spaces === 0 ? (e: string) => e
        : spaces < 0 ? (e: string) => e.trimStart().padStart(Math.abs(spaces) + e.length, ' ')
            : (e: string) => e.substring(Math.min(countSpaceStart(e), spaces))

    return lines.map(mapper).join('\n')
}


export function s(template: TemplateStringsArray, ...values: any[]) {
    console.log({ arguments: arguments })
    const first = template[0].split("\n")
    const regex = getRegex()
    const reduced = first.reduce((a, shifted) => {
        if (a.done) {
            a.template.push(shifted)
            return a
        }

        // is empty line, no need to care about configs
        if (!shifted.trim()) {
            a.template.push(shifted)
            return a
        }

        if (!shifted.match(regex)) {
            a.template.push(shifted)
            a.done = true
            return a
        }

        a.configStrings.push(shifted)

        return a
    }, {
        template: new Array<string>(),
        configStrings: new Array<string>(),
        done: false,
    })

    const configString = reduced.configStrings.join('\n')
    const config = compileConfig(configString)
    const joined = [reduced.template.join("\n"), ...alternate(values.map(String), template.slice(1))].join("")
    return reindent(joined, config)
}

function makeTemplate(strings: string[]): TemplateStringsArray {
    const frozen = Object.freeze(strings)
    return Object.defineProperty(frozen, "raw", {
        get() {
            return strings
        }
    }) as TemplateStringsArray
}

s.spaceAuto = function spaceAuto([first, ...templates]: TemplateStringsArray, values: []) {
    const raw = [`@space = auto\n${first}`, ...templates]
    const template = makeTemplate(raw)
    return s(template, values)
}