import test from 'ava';
import dedent from 'dedent';
import { parse, parseSync, stringify } from '.';

const parses = (t, input, expected, options) => t.deepEqual(parseSync(input, options), expected);

test(
  'parses simple pair',
  parses,
  `
    ""
    {
      "_"	"value"
    }
  `,
  { _: 'value' },
);
test('parses without depending on code style', parses, '""{"_""value"}', { _: 'value' });
test(
  'parses deeply',
  parses,
  `
    ""
    {
      "_"
      {
        "_" "value"
      }
    }
  `,
  { _: { _: 'value' } },
);
test('parses escaped quotes', parses, '""{"_""val\\"ue\\""}', { _: 'val"ue"' });

test('parses integer numbers', parses, '""{"_" "10"}', { _: 10 });
test('parses float numbers', parses, '""{"_" "1.25000000"}', { _: 1.25 });
test('parses infinity as a string', parses, '""{"_" "Infinity"}', { _: 'Infinity' });
test('always parses keys as strings', parses, '""{"1" "_"}', { '1': '_' });

test(
  'parses with options.mergeRoots',
  parses,
  '"root"{"k" "v"}',
  { root: { k: 'v' } },
  { mergeRoots: false },
);
test(
  'parses with options.parseUnquotedStrings',
  parses,
  '"" { "k" v }',
  { k: 'v' },
  { parseUnquotedStrings: true },
);
test(
  'parses with options.handleMultipleKeys',
  parses,
  '"" { "k" "v1"  "k" "v2" }',
  { k: ['v1', 'v2'] },
  { handleMultipleKeys: true },
);
test(
  'parses with options.parseNumbers',
  parses,
  '"" { "k" "1" }',
  { k: '1' },
  { parseNumbers: false },
);

test('parses asynchronously', async t => {
  t.deepEqual(
    await parse(
      `
        #base "buffer"
        "" { "k"  "v" }
      `,
      { getBaseFile: () => '"root2" { "k2"  "v2" }' },
    ),
    { k: 'v', k2: 'v2' },
  );
});

const notParses = (t, input) => t.throws(() => parseSync(input));
test('not parses with extra }', notParses, '""{"k" "v"}}');
test('not parses with extra {', notParses, '""{{"k" "v"}');
test('not parses with unpaired key', notParses, '""{"k"}');
test('not parses with unclosed quote', notParses, '""{"k "v" }');

const stringifies = (t, input, expected, options) =>
  t.is(stringify(input, options).trim(), expected.trim());

test(
  'stringifies object',
  stringifies,
  { root: { key: 'value' } },
  dedent`
    "root"
    {
      "key"    "value"
    }
  `.replace(/  /g, '\t'),
);
test(
  'stringifies arrays',
  stringifies,
  { root: ['v1', 'v2'] },
  dedent`
    "root"
    {
      "v1"    "1"
      "v2"    "1"
    }
  `.replace(/  /g, '\t'),
);
test(
  'stringifies minified',
  stringifies,
  { root: { _: 'value' } },
  '"root" { "_" "value" } ',
  { align: 0 },
);
test(
  'stringifes with custom indent',
  stringifies,
  { root: { _: 'value' } },
  dedent`
    "root"
    {
      "_"    "value"
    }
  `,
  { space: '  ' },
);
