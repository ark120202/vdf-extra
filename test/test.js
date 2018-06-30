const tape = require('tape');
const vdf = require('../');

tape('Normal parsing cases', t => {
  t.plan(5);
  t.deepEqual(
    vdf.parseSync(`"Root"
		{
			"key1"	"value"
		}`),
    { key1: 'value' },
    'simple key values parsing',
  );

  t.deepEqual(
    vdf.parseSync('"Root"{"key1""value"}'),
    { key1: 'value' },
    'parsing minimized key values',
  );

  t.deepEqual(
    vdf.parseSync('"Root"{"key1""value""key2"{"k""v"}}'),
    { key1: 'value', key2: { k: 'v' } },
    'parsing deep levels of key values',
  );

  t.deepEqual(
    vdf.parseSync('"Root"{"key1""val\\"ue\\""}'),
    { key1: 'val"ue"' },
    'parsing escaped quotes',
  );

  t.deepEqual(
    vdf.parseSync(`"Root"
		{
			"int"	"10"
			"float" "1.25000000"
			"infinity" "Infinity"
		}`),
    {
      int: 10,
      float: 1.25,
      infinity: 'Infinity',
    },
    'parsing numbers',
  );
});

tape('Parsing with options', t => {
  t.plan(5);

  t.deepEqual(
    vdf.parseSync('"root" { "k"  "v" }', { mergeRoots: false }),
    { root: { k: 'v' } },
    'options.mergeRoots',
  );

  t.deepEqual(
    vdf.parseSync('"root" { "k" v }', { parseUnquotedStrings: true }),
    { k: 'v' },
    'options.parseUnquotedStrings',
  );

  t.deepEqual(
    vdf.parseSync('"root" { "k" "v1"  "k" "v2" }', {
      handleMultipleKeys: true,
    }),
    { k: ['v1', 'v2'] },
    'options.handleMultipleKeys',
  );

  t.deepEqual(
    vdf.parseSync('"root" { "k" "1" }', { parseNumbers: false }),
    { k: '1' },
    'options.parseNumbers',
  );

  vdf
    .parse(
      `#base "buffer"
	"root" { "k"  "v" }`,
      {
        getBaseFile: file => {
          if (file === 'buffer') return '"root2" { "k2"  "v2" }';
        },
      },
    )
    .then(value => {
      t.deepEqual(value, { k: 'v', k2: 'v2' }, 'options.getBaseFile');
    })
    .catch(err => {
      t.fail(err);
    });
});

tape('Handling exceptions', t => {
  t.plan(4);
  t.throws(
    () => vdf.parse('"root" {"k"   "v"}}'),
    "Throwns an exception when kv has excess '}'",
  );
  t.throws(
    () => vdf.parse('"root" {{"k"   "v"}'),
    "Throwns an exception when kv has excess '{'",
  );
  t.throws(
    () => vdf.parse('"root" {"k   "v" }'),
    'Throwns an exception when kv has unclosed quotes',
  );
  t.throws(
    () => vdf.parse('"root" {"k"}'),
    'Throwns an exception when kv has a key without value',
  );
});

tape('Stringify', t => {
  t.plan(5);
  t.equal(
    vdf.stringify({ key: 'value' }),
    '"key"\t\t"value"\n',
    'standard object',
  );
  t.equal(
    vdf.stringify({ root: { key: 'value' } }),
    '"root"\n{\n\t"key"\t\t"value"\n}\n',
    'deep object',
  );
  t.equal(
    vdf.stringify({ key: ['v1', 'v2'] }),
    '"key"\n{\n\t"v1"\t\t"1"\n\t"v2"\t\t"1"\n}\n',
    'object with array',
  );
  t.equal(
    vdf.stringify({ root: { key: 'value' } }, 0),
    '"root" { "key" "value" } ',
    'minimized dump',
  );
  t.equal(
    vdf.stringify({ root: { key: 'value' } }, -1, '  '),
    '"root"\n{\n  "key"    "value"\n}\n',
    '2 spaces for indent',
  );
});
