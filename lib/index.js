const parse = require('./parse');
const stringify = require('./stringify');
const { EXTRA_VALUES, entries, set } = require('./extra-values');

module.exports.EXTRA_VALUES = EXTRA_VALUES;
module.exports.entries = entries;
module.exports.set = set;

const parseDefaults = {
  getBaseFile(file) {
    throw new Error(`Couldn't resolve #base to ${file}. Provide getBaseFile option.`);
  },
  mergeRoots: true,
  parseUnquotedStrings: false,
  parseNumbers: true,
};

module.exports.parse = function (string, options = {}) {
  options = { ...parseDefaults, ...options };
  const parsed = parse(string, null, options.getBaseFile, options.mergeRoots, options.parseUnquotedStrings, options.parseNumbers);
  if (parsed.then != null) throw new Error('getBaseFile returned a promise');
  return parsed[0];
};

module.exports.parseAsync = function (string, options = {}) {
  options = { ...parseDefaults, ...options };
  const parsed = parse(string, null, options.getBaseFile, options.mergeRoots, options.parseUnquotedStrings, options.parseNumbers);
  return Promise.resolve(parsed).then(v => v[0]);
};

const stringifyDefaults = {
  align: -1,
  space: '\t',
  tabSize: 4,
};

module.exports.stringify = function (obj, options = {}) {
  options = { ...stringifyDefaults, ...options };
  if (typeof options.space === 'number') options.space = ' '.repeat(options.space);

  if (options.align > 0 && options.space === '\t' && options.align % options.tabSize !== 0) {
    throw new Error('options.align must be dividable by options.tabSize');
  }

  return stringify(obj, options, 0);
};
