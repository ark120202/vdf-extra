/*
VDF (de)serialization
Copyright (c) 2010-2013, Anthony Garcia <anthony@lagg.me>
Distributed under the ISC License (see LICENSE)

Ported to node.js by Rob Jackson - rjackson.me.

Modified by ark120202
*/

/* eslint global-require: 0 */
const _ = { merge: require('lodash.merge'), flatMap: require('lodash.flatmap') };
const isNumber = require('is-number');

const STRING = '"',
	NODE_OPEN = '{',
	NODE_CLOSE = '}',
	BR_OPEN = '[',
	BR_CLOSE = ']',
	COMMENT = '/',
	CR = '\r',
	LF = '\n',
	SPACE = ' ',
	TAB = '\t',
	WHITESPACE = [SPACE, '\t', '\r', '\n'],
	BASE = '#base ';

function _parseNumber(string) {
	return isNumber(string) ? Number(string) : string;
}

function _symtostr(line, i, token) {
	token = token || STRING;

	let opening = i + 1,
		closing = opening;

	let ci = line.indexOf(token, opening);
	while (ci !== -1) {
		if (line.substring(ci - 1, ci) !== '\\') {
			closing = ci;
			break;
		}
		ci = line.indexOf(token, ci + 1);
	}

	let finalstr = line.substring(opening, closing);
	return [finalstr, i + finalstr.length + 1];
}

function _unquotedtostr(line, i) {
	let ci = i;
	while (ci < line.length) {
		if (WHITESPACE.indexOf(line.substring(ci, ci + 1)) > -1) {
			break;
		}
		ci += 1;
	}
	return [line.substring(i, ci), ci];
}

function throwBsaeParseError() {
	throw new Error('#base is allowed only in kv root');
}

const EXTRA_VALUES = Symbol('extra values')

function _parse(stream, ptr, getBaseFile, mergeRoots, parseUnquotedStrings, parseNumbers, isChild) {
	ptr = ptr || 0;

	let laststr,
		lasttok,
		lastbrk,
		i = ptr,
		next_is_value = false,
		deserialized = {},
		bases = [];

	while (i < stream.length) {
		let c = stream.substring(i, i + 1);

		switch (c) {
			case NODE_OPEN: {
				next_is_value = false;  // Make sure the next string is interpreted as a key.

				let parsed = _parse(stream, i + 1, throwBsaeParseError, false, parseUnquotedStrings, parseNumbers, true);
				deserialized[laststr] = parseNumbers ? _parseNumber(parsed[0]) : parsed[0];
				i = parsed[1];
				break;
			}
			case NODE_CLOSE: {
				if (next_is_value) throw new Error(`Unexpected end of file. Expected value for '${laststr}' at ${i}`);
				if (!isChild) throw new Error('Unexpected closing node at ' + i);
				return [deserialized, i];
			}
			case BR_OPEN: {
				let _string = _symtostr(stream, i, BR_CLOSE);
				lastbrk = _string[0];
				i = _string[1];
				break;
			}
			case COMMENT: {
				if ((i + 1) < stream.length && stream.substring(i + 1, i + 2) === '/') {
					i = stream.indexOf('\n', i);
					break;
				}
			}
			case CR:
			case LF: {
				const ni = i + 1;
				if (ni < stream.length && stream.substring(ni, ni + 1) === LF) {
					i = ni;
				}
				if (lasttok !== LF) {
					c = LF;
				}
				break;
			}
			case BASE[0]: {
				if (i + BASE.length < stream.length) {
					if (stream.substring(i, i + BASE.length) === BASE) {
						let thisPath = stream.substring(i + BASE.length, stream.indexOf('\n', i)).replace(/\r?\n|\r/g, '');
						if (thisPath.startsWith('"') && thisPath.endsWith('"')) {
							thisPath = thisPath.slice(1, -1);
						}
						if (getBaseFile) {
							bases.push(
								Promise.resolve(getBaseFile(thisPath))
									.then(x => {
										if (x) return _parse(x, null, getBaseFile, true, parseUnquotedStrings, parseNumbers);
									})
							);
						} else {
							throw new Error('getBaseFile is undefined, but kv contains #base');
						}
						i = stream.indexOf('\n', i);
						break;
					}
				}
			}
			/* eslint no-fallthrough: 0 */
			default: {
				if (c !== SPACE && c !== TAB) {
					if (c !== STRING && !parseUnquotedStrings) throw new Error(`Found unquoted string at ${i} (${c})`);
					let _string = (c === STRING ? _symtostr : _unquotedtostr)(stream, i);
					let string = _string[0].replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
					i = _string[1];

					if (lasttok === STRING && next_is_value) {
						if (deserialized[laststr] && lastbrk != null) {
							lastbrk = null;  // Ignore this sentry if it's the second bracketed expression
						} else {
							if (deserialized[laststr] != null) {
								if (!deserialized[EXTRA_VALUES]) deserialized[EXTRA_VALUES] = {};
								if (!deserialized[EXTRA_VALUES][laststr]) deserialized[EXTRA_VALUES][laststr] = [];
								deserialized[EXTRA_VALUES][laststr].push(deserialized[laststr]);
							}
							deserialized[laststr] = parseNumbers ? _parseNumber(string) : string;
						}
					}
					c = STRING;  // Force c == string so lasttok will be set properly.
					laststr = string;
					next_is_value = !next_is_value;
				} else {
					c = lasttok;
				}
			}
		}

		lasttok = c;
		i += 1;
	}

	if (next_is_value) throw new Error(`Unexpected end of file. Expected value for '${laststr}'`);
	if (isChild) throw new Error('Unexpected end of file. Expected block closing at ' + i);
	if (getBaseFile && getBaseFile !== throwBsaeParseError) {
		return Promise.all(bases).then(basesParsed => {
			let fk = Object.keys(deserialized)[0];
			for (let i = 0; i < basesParsed.length; i++) {
				if (basesParsed[i]) deserialized[fk] = _.merge(basesParsed[i][0], deserialized[fk]); //Main KV takes priority over bases
			}
			return [mergeRoots ? deserialized[fk] : deserialized, i];
		});
	} else {
		return [mergeRoots ? deserialized[Object.keys(deserialized)[0]] : deserialized, i];
	}
}

function _dump(obj, options, level) {
	const { space, align, tabSize } = options;
	const pretty = align !== 0;
	const newline = pretty ? '\n' : ' ';

	const preLineIndent = pretty ? space.repeat(level) : '';

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
			const dumpedValue = _dump(value, options, level + 1);
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

module.exports = {
	EXTRA_VALUES,
	/**
	 * @callback getBaseFile
	 *
	 * @param {string} filePath #base file path
	 * @return {Promise} File contents
	 */

	/**
	 * Parses Key Values string into JS object
	 *
	 * @param {string} string Input string
	 * @param {object} options Parsing options
	 * @param {getBaseFile} options.getBaseFile Function that will be called to each #base element
	 * @param {boolean} options.mergeRoots If false, returns object with KV file root element
	 * @param {boolean} options.parseUnquotedStrings If true, parser wil handle unquoted tokens
	 * @param {boolean} options.parseNumbers If not false, number-like strings would be parsed as numbers
	 * @return {Promise<object>|object} Converted object. Can be a promise if KV file has #base properties, so use this function with Promise.resolve
	 */
	parse(string, options = {}) {
		let _parsed = _parse(string, null, options.getBaseFile, options.mergeRoots !== false, options.parseUnquotedStrings === true, options.parseNumbers !== false);
		return Promise.resolve(_parsed).then(v => v[0]);
	},

	/**
	 * Parses Key Values string into JS object
	 *
	 * @param {string} string Input string
	 * @param {object} options Parsing options
	 * @param {boolean} options.mergeRoots If false, returns object with KV file root element
	 * @param {boolean} options.parseUnquotedStrings If true, parser wil handle unquoted tokens
	 * @param {boolean} options.parseNumbers If not false, number-like strings would be parsed as numbers
	 * @return {Promise<object>|object} Converted object. Can be a promise if KV file has #base properties, so use this function with Promise.resolve
	 */
	parseSync(string, options = {}) {
		let _parsed = _parse(string, null, null, options.mergeRoots !== false, options.parseUnquotedStrings === true, options.parseNumbers !== false);
		return _parsed[0];
	},

	/**
	 * Converts JS object into Key Values file
	 *
	 * @param {object} obj Converted object
	 * @param {?object} options Options
	 * @param {?number} options.align Length of alignment. Must be dividable by tabSize if used. Defaults to -1, which means 2 spaces
	 * @param {?string} options.space String that will be used as indent. Defaults to '\t'.
	 * @param {?number} options.tabSize Default tab size. Will be used only if indent is tab. Defaults to 4.
	 * @returns {string} Stringified Key Values file
	 */
	stringify(obj, options = {}) {
		const align = options.align != null ? options.align : -1;
		const space = options.space != null ? options.space : '\t';
		const tabSize = options.tabSize != null ? options.tabSize : 4;

		if (align > 0 && space === '\t' && align % tabSize !== 0) {
			throw new Error('options.align must be dividable by options.tabSize');
		}

		return _dump(obj, { space, align, tabSize }, 0);
	}
};
