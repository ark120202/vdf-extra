const _ = { merge: require('lodash.merge'), flatMap: require('lodash.flatmap') };
const EXTRA_VALUES = require('./extra-values');

module.exports = function stringify(obj, options, level) {
	const { space, align, tabSize } = options;
	const preLineIndent = typeof space === 'number' ? ' '.repeat(space * level) : space.repeat(level);
	const pretty = space !== '';
	const newline = pretty ? '\n' : ' ';

	let pairs = Array.isArray(obj) ? obj.map((value, index) => [index + 1, value]) : Object.entries(obj);
	if (!Array.isArray(obj) && obj[EXTRA_VALUES]) {
		pairs = _.flatMap(pairs, ([key, value]) => [
			...(obj[EXTRA_VALUES][key] || []).map(v => [key, v]),
			[key, value],
		]);
	}

	return _.flatMap(pairs, ([key, value]) => {
		const firstLinePart = preLineIndent + '"' + key + '"';
		if (typeof value === 'object') {
			const dumpedValue = stringify(value, options, level + 1);
			return [
				firstLinePart,
				preLineIndent + '{',
				dumpedValue,
				preLineIndent + '}',
			];
		}

		let keyValueIndent = '';
		if (pretty) {
			if (align === -1) {
				keyValueIndent += space.repeat(2);
			} else {
				while ((firstLinePart + keyValueIndent).replace(/\t/g, ' '.repeat(tabSize)).length < align) {
					keyValueIndent += space;
				}
			}
		} else {
			keyValueIndent = ' ';
		}

		value = String(value)
			.replace(/\\/g, '\\\\')
			.replace(/"/g, '\\"')
			.replace(/\n/g, '\\n')
			.replace(/\t/g, '\\t');
		return firstLinePart + keyValueIndent + '"' + value + '"';
	}).join(newline);
}
