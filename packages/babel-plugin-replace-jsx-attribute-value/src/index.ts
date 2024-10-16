/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ConfigAPI, types as t, NodePath, template } from '@babel/core';

export interface Value {
  value: string;
  newValue: string | boolean | number;
  literal?: boolean;
}

export interface Options {
  values: Value[];
}

interface ParsedRegExp {
  pattern: string | null;
  flags: string | null;
  regex: RegExp | null;
}

/**
 * Parses a string representation of a regular expression.
 * @param regExpString - The string to parse.
 * @returns An object containing the pattern, flags, and the RegExp object.
 */
const parseRegExp = (regExpString: string): ParsedRegExp => {
  const regExpPattern = /^\/(.*?)\/([gimsuy]*)$/;
  const match = regExpString.match(regExpPattern);

  if (!match) {
    return {
      pattern: null,
      flags: null,
      regex: null,
    };
  }

  const pattern = match[1];
  const flags = match[2];

  const regex = new RegExp(pattern, flags);

  return {
    pattern,
    flags,
    regex,
  };
};

/**
 * Adds or replaces JSX attribute values based on provided options.
 * @param api - The Babel configuration API.
 * @param opts - The options containing values to replace.
 * @returns A Babel visitor object.
 */
const addJSXAttribute = (api: ConfigAPI, opts: Options) => {
  /**
   * Generates a Babel AST node for the attribute value.
   * @param value - The new value for the attribute.
   * @param literal - Determines if the value should be treated as a literal.
   * @returns A Babel AST node or null.
   */
  const getAttributeValue = (
    value: string | boolean | number,
    literal?: boolean,
  ): t.JSXExpressionContainer | t.StringLiteral | null => {
    if (typeof value === 'string' && literal) {
      const ast = template.ast(value) as t.ExpressionStatement;
      return t.jsxExpressionContainer(ast.expression);
    }

    if (typeof value === 'string') {
      return t.stringLiteral(value);
    }

    if (typeof value === 'boolean') {
      return t.jsxExpressionContainer(t.booleanLiteral(value));
    }

    if (typeof value === 'number') {
      return t.jsxExpressionContainer(t.numericLiteral(value));
    }

    return null;
  };

  return {
    visitor: {
      JSXAttribute(path: NodePath<t.JSXAttribute>) {
        const valuePath = path.get('value');
        if (!valuePath.isStringLiteral()) return;

        opts.values.forEach(({ value, newValue, literal }) => {
          const replaceRx = parseRegExp(value);

          if (replaceRx.regex) {
            //@ts-expect-error TODO
            const attributeValue = path.node.value?.value;

            if (attributeValue && replaceRx.regex.test(attributeValue)) {
              const updatedValue = attributeValue.replace(replaceRx.regex, String(newValue));

              const newAttributeValue = getAttributeValue(updatedValue, literal);
              if (newAttributeValue) {
                path.node.value = newAttributeValue;
              }
            }

            return;
          }

          if (valuePath.isStringLiteral({ value })) {
            const attributeValue = getAttributeValue(newValue, literal);
            if (attributeValue) {
              valuePath.replaceWith(attributeValue);
            }
          }
        });
      },
    },
  };
};

export default addJSXAttribute;
