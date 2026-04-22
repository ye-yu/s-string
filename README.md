# ts-reindent

A TypeScript library for reindenting multi-line strings with configurable space and trim options.

## Installation

```sh
npm install ts-reindent
```

## Usage

### Using the `s` tagged template literal

The `s` function is a tagged template literal that allows you to specify reindentation configuration directly in the template string.

```typescript
import { s } from 'ts-reindent';

const result = s`
    @space = auto
    @trim = all
    hello world
    this is nice
        let's put a new line
    and then we back again
`;

console.log(result);
// Output: "hello world\nthis is nice\n    let's put a new line\nand then we back again"
```

#### Configuration Options

- `@space`: Controls indentation removal.
  - `auto`: Automatically calculates the minimum indentation to remove.
  - A number (e.g., `4`): Removes exactly that many spaces from the start of each line.
  - Negative number (e.g., `-2`): Adds spaces instead of removing.

- `@trim`: Controls trimming of empty lines.
  - `none`: No trimming.
  - `head`: Remove empty lines from the beginning.
  - `tail`: Remove empty lines from the end.
  - `all`: Remove empty lines from both ends.
  - `head-once`, `tail-once`, `all-once`: Remove only one empty line from the respective positions.

### Using the `reindent` function

For programmatic usage, you can use the `reindent` function directly.

```typescript
import { reindent } from 'ts-reindent';

const input = `
    hello world
    this is nice
`;

const config = {
    space: 'auto',
    trim: 'all'
};

const result = reindent(input, config);
console.log(result);
// Output: "hello world\nthis is nice"
```
