export const EXTRA_VALUES: unique symbol;

export interface ParseOptions {
  /** If false, returns object with KV file root element */
  mergeRoots?: boolean;
  /** If true, parser wil handle unquoted tokens */
  parseUnquotedStrings?: boolean;
  /** If not false, number-like strings would be parsed as numbers */
  parseNumbers?: boolean;
  /** Function that will be called to each #base element */
  getBaseFile(path: string): string;
}

export interface AsyncParseOptions extends ParseOptions {
  getBaseFile(path: string): string | Promise<string>;
}

/**
 * Converts a VDF string into an object.
 *
 * @param string Input string
 * @param options Parsing options
 */
export function parse<T extends object>(string: string, options?: ParseOptions): T;

/**
 * Converts a VDF string into an object.
 *
 * @param string Input string
 * @param options Parsing options
 */
export function parseAsync<T extends object>(string: string, options?: AsyncParseOptions): Promise<T>;

export interface StringifyOptions {
  /** Length of alignment. Must be dividable by tabSize if used. Defaults to -1, which means 2 spaces */
  align?: number;
  /** String that will be used as indent. Defaults to '\t'. */
  space?: string | number;
  /** Size of \t character, used for align. Defaults to 4. */
  tabSize?: number;
}

/**
 * Converts a JavaScript object to a VDF string
 *
 * @param obj Converted object
 * @param options Options
 */
export function stringify(
  obj: object,
  options?: StringifyOptions,
): string;
