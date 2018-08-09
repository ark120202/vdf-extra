const { flatMap } = require('lodash');
const { entries } = require('./extra-values');

module.exports = function stringify(obj, options, level) {
  const { space, align, tabSize } = options;
  const preLineIndent = space.repeat(level);
  const pretty = space !== '';
  const newline = pretty ? '\n' : ' ';

  return flatMap(entries(obj), ([key, value]) => {
    if (value == null) return [];

    const firstLinePart = preLineIndent + '"' + key + '"';
    if (typeof value === 'object') {
      const dumpedValue = stringify(value, options, level + 1);
      return [firstLinePart, preLineIndent + '{', dumpedValue, preLineIndent + '}'];
    }

    let keyValueIndent = '';
    if (pretty) {
      if (align === -1) {
        keyValueIndent += space.repeat(2);
      } else {
        while (
          (firstLinePart + keyValueIndent).replace(/\t/g, ' '.repeat(tabSize)).length < align
        ) {
          keyValueIndent += space;
        }
      }
    } else {
      keyValueIndent = ' ';
    }

    if (typeof value === 'boolean') value = value ? 1 : 0;

    value = String(value)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');
    return firstLinePart + keyValueIndent + '"' + value + '"';
  }).join(newline);
};
