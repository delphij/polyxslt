/** Error codes. Production builds carry only the code; see docs for the meaning of each. */
export enum Code {
  Unsupported = 2,
  XPathSyntax = 10,
  UnknownPrefix = 11,
  UnknownFunction = 12,
  BadArity = 13,
  NotNodeSet = 14,
  UndefinedVariable = 15,
  UnknownInstruction = 20,
  MissingAttribute = 21,
  BadPattern = 22,
  BadAvt = 23,
  BadName = 24,
  Redefinition = 25,
  CircularVariable = 26,
  AttributeAfterChildren = 27,
  Limit = 28,
  NotStylesheet = 29,
}

const messages: Record<number, string> | undefined = __DEV__
  ? {
      [Code.Unsupported]: 'not supported',
      [Code.XPathSyntax]: 'XPath syntax error',
      [Code.UnknownPrefix]: 'undeclared namespace prefix',
      [Code.UnknownFunction]: 'unknown function',
      [Code.BadArity]: 'wrong number of arguments',
      [Code.NotNodeSet]: 'value is not a node-set',
      [Code.UndefinedVariable]: 'undefined variable',
      [Code.UnknownInstruction]: 'unknown XSLT element',
      [Code.MissingAttribute]: 'required attribute missing',
      [Code.BadPattern]: 'invalid pattern',
      [Code.BadAvt]: 'invalid attribute value template',
      [Code.BadName]: 'invalid name',
      [Code.Redefinition]: 'variable already defined in this scope',
      [Code.CircularVariable]: 'circular variable definition',
      [Code.AttributeAfterChildren]: 'attribute added after child nodes',
      [Code.Limit]: 'limit exceeded',
      [Code.NotStylesheet]: 'not an XSLT stylesheet',
    }
  : undefined;

export class XSLTError extends Error {
  readonly code: Code;

  constructor(code: Code, detail?: string) {
    super(messages ? `${messages[code]}${detail ? `: ${detail}` : ''}` : `polyxslt error ${code}`);
    this.name = 'XSLTError';
    this.code = code;
  }
}
