const _ = require('lodash');

const EXTRA_VALUES = (module.exports.EXTRA_VALUES = Symbol('extra values'));

module.exports.entries = function entries(o) {
  let pairs = Array.isArray(o)
    ? o.map((value, index) => [index + 1, value])
    : Object.entries(o);

  if (!Array.isArray(o) && o[EXTRA_VALUES]) {
    const keys = _.union(Object.keys(o), Object.keys(o[EXTRA_VALUES]));
    pairs = _
      .flatMap(keys, key => [
        ...(o[EXTRA_VALUES][key] || []).map(v => [key, v]),
        o[key] != null ? [key, o[key]] : null,
      ])
      .filter(x => x != null);
  }

  return pairs;
};

module.exports.set = function set(o, key, values) {
  if (values.length === 0) return;
  if (values.length > 1) {
    if (!o[EXTRA_VALUES]) o[EXTRA_VALUES] = {};
    o[EXTRA_VALUES][key] = drop(values, 1);
  }
  o[key] = values[0];
};
