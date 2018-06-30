export interface ParseOptions {
  mergeRoots?: boolean;
  handleMultipleKeys?: boolean;
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
 * @param options.handleMultipleKeys If true, than if KV key occurs multiple times it's values will be to Array
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
 * @param options.handleMultipleKeys If true, than if KV key occurs multiple times it's values will be to Array
 * @param options.parseUnquotedStrings If true, parser wil handle unquoted tokens
 * @param options.parseNumbers If not false, number-like strings would be parsed as numbers
 * @return Converted object. Can be a promise if KV file has #base properties, so use this function with Promise.resolve
 */
export function parseSync<T extends object>(string: string, options?: ParseOptions): T;

/**
 * Converts JS object into Key Values file
 *
 * @param obj Converted object
 * @param indentLength Specifies indent Length. If equals 0 string won't have tabs/newlines at all. Must be dividable by tabWidth.
 * @param indent String that will be used as indent. Defaults to tabs
 * @param tabSize Default tab size. Will be used only if indent is tab
 * @returns Stringified Key Values file
 */
export function stringify(
  obj: { [key: string]: any },
  indentLength?: number,
  indent?: string,
  tabSize?: number,
): string;
