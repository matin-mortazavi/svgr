/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ConfigAPI, types as t, NodePath, template } from '@babel/core'

export interface Value {
  value: string
  newValue: string | boolean | number
  literal?: boolean
}

export interface Options {
  values: Value[]
}

const parseRegExp = (regExpString: string) => {
  const regExpPattern = /^\/(.*?)\/([gimsuy]*)$/
  const match = regExpString.match(regExpPattern)

  if (!match) {
    return {
      pattern: null,
      flags: null,
      regex: null,
    }
  }

  const pattern = match[1]
  const flags = match[2]

  const regex = new RegExp(pattern, flags)

  return {
    pattern,
    flags,
    regex,
  }
}

const addJSXAttribute = (api: ConfigAPI, opts: Options) => {
  const getAttributeValue = (
    value: string | boolean | number,
    literal?: boolean,
  ) => {
    if (typeof value === 'string' && literal) {
      return t.jsxExpressionContainer(
        (template.ast(value) as t.ExpressionStatement).expression,
      )
    }

    if (typeof value === 'string') {
      return t.stringLiteral(value)
    }

    if (typeof value === 'boolean') {
      return t.jsxExpressionContainer(t.booleanLiteral(value))
    }

    if (typeof value === 'number') {
      return t.jsxExpressionContainer(t.numericLiteral(value))
    }

    return null
  }

  return {
    visitor: {
      JSXAttribute(path: NodePath<t.JSXAttribute>) {
        const valuePath = path.get('value')

        if (!valuePath.isStringLiteral()) return

        opts.values.forEach(({ value, newValue, literal }) => {
          const replaceRx = parseRegExp(value)
          if (replaceRx.regex) {
            //i put attribute name also here if it wil be needed needed in future
            // const attributeName = path.node.name.name

            //@ts-expect-error TODO
            const attributeValue = path.node.value && path.node.value.value

            if (attributeValue && replaceRx.regex.test(attributeValue)) {
              const v = attributeValue.replace(replaceRx.regex, newValue)

              path.node.value = getAttributeValue(v, literal)
            }
          }

          if (!valuePath.isStringLiteral({ value })) return
          const attributeValue = getAttributeValue(newValue, literal)
          if (attributeValue) {
            valuePath.replaceWith(attributeValue)
          }
        })
      },
    },
  }
}

export default addJSXAttribute
