export interface ParseOptions {
  mergeRoots?: boolean;
  parseUnquotedStrings?: boolean;
  parseNumbers?: boolean;
}

export interface AsyncParseOptions extends ParseOptions {
  getBaseFile(path: string): string | Promise<string>;
}

/**
 * Parses Key Values string into JS object
 *
 * @param string Input string
 * @param options Parsing options
 * @param options.getBaseFile Function that will be called to each #base element
 * @param options.mergeRoots If false, returns object with KV file root element
 * @param options.parseUnquotedStrings If true, parser wil handle unquoted tokens
 * @param options.parseNumbers If not false, number-like strings would be parsed as numbers
 * @return Converted object. Can be a promise if KV file has #base properties, so use this function with Promise.resolve
 */
export function parse<T extends object>(string: string, options?: AsyncParseOptions): Promise<T>;
/**
 * Parses Key Values string into JS object
 *
 * @param string Input string
 * @param options Parsing options
 * @param options.mergeRoots If false, returns object with KV file root element
 * @param options.parseUnquotedStrings If true, parser wil handle unquoted tokens
 * @param options.parseNumbers If not false, number-like strings would be parsed as numbers
 * @return Converted object. Can be a promise if KV file has #base properties, so use this function with Promise.resolve
 */
export function parseSync<T extends object>(string: string, options?: ParseOptions): T;


export interface StringifyOptions {
  align?: number;
  space?: string | number;
  tabSize?: number;
}

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
export function stringify(
  obj: object,
  options?: StringifyOptions,
): string;
