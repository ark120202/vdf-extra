const _ = require('lodash');
const { EXTRA_VALUES } = require('./extra-values');

const isNumeric = s => s !== '' && !isNaN(s) && isFinite(s);
const parseNumber = s => isNumeric(s) ? Number(s) : s;

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

function throwBaseParseError() {
  throw new Error('#base is allowed only in kv root');
}

module.exports = function parse(stream, ptr, getBaseFile, mergeRoots, parseUnquotedStrings, parseNumbers, isChild) {
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

        let parsed = parse(stream, i + 1, throwBaseParseError, false, parseUnquotedStrings, parseNumbers, true);
        deserialized[laststr] = parseNumbers ? parseNumber(parsed[0]) : parsed[0];
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
            const result = getBaseFile(thisPath);
            bases.push(
              result.then != null
              ? result.then(x => x != null ? parse(x, null, getBaseFile, true, parseUnquotedStrings, parseNumbers) : null)
              : (result != null ? parse(result, null, getBaseFile, true, parseUnquotedStrings, parseNumbers) : null)
            );
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
              deserialized[laststr] = parseNumbers ? parseNumber(string) : string;
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

  const joinBases = basesParsed => {
    let fk = Object.keys(deserialized)[0];
    for (let i = 0; i < basesParsed.length; i++) {
      if (basesParsed[i]) deserialized[fk] = _.merge(basesParsed[i][0], deserialized[fk]); //Main KV takes priority over bases
    }
    return [mergeRoots ? deserialized[fk] : deserialized, i];
  };
  return bases.some(x => x.then != null) ? Promise.all(bases).then(joinBases) : joinBases(bases);
}
