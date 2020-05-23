// --- Exdternal imports
import {
  print,
  GraphQLBoolean,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLList,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLSchema,
  GraphQLID,
} from 'graphql'
import { fetch } from 'cross-fetch'
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date'
import { GraphQLJSON } from 'graphql-type-json'

import {
  wrapSchema,
  introspectSchema,
  TransformObjectFields,
} from '@graphql-tools/wrap'
// --- Internal imports
import { log } from './utils.js'

// --- Constants

const ScalarToGraphQLObject = {
  BOOLEAN: GraphQLBoolean,
  FLOAT: GraphQLFloat,
  ID: GraphQLID,
  INT: GraphQLInt,
  STRING: GraphQLString,
  //
  JSON: GraphQLJSON,
  //
  DATE: GraphQLDate,
  DATETIME: GraphQLDateTime,
  TIME: GraphQLTime,
}

const ModifiersEnum = {
  NONULL: 'NONULL',
  LIST: 'LIST',
}

// ---

const createExecutor = (endpointUrl) => async ({ document, variables }) => {
  const query = print(document)
  const fetchResult = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  return fetchResult.json()
}

// ---

const fieldRewrites = [
  {
    from: {
      name: 'code',
      type: 'ID!',
    },
    to: {
      name: 'id',
    },
  },
  {
    type: 'State',
    from: {
      name: 'code',
    },
    to: {
      name: 'id',
      type: {
        name: 'ID',
        modifiers: ['NONULL'],
      },
    },
    copyIfNullFrom: 'name',
  },
]

const typeToGraphQLType = (type) => {
  const base = ScalarToGraphQLObject[type.name]
  if (!base) throw new Error(`Unknown type: ${type.name}`)
  if (type.modifiers.includes('LIST')) {
    return new GraphQLNonNull(GraphQLList(new GraphQLNonNull(base)))
  } else if (type.modifiers.includes('NONULL')) {
    return new GraphQLNonNull(base)
  }
  return base
}

export const createAdapter = async (
  endpointUrl = 'https://countries.trevorblades.com/'
) => {
  const state = {}
  const executor = createExecutor(endpointUrl)
  const transforms = [
    ...fieldRewrites.map(
      (fr) =>
        new TransformObjectFields((typeName, fieldName, fieldConfig) => {
          if (!fr.type || fr.type === typeName) {
            if (fr.from.name === fieldName) {
              if (
                !fr.from.type ||
                fr.from.type === fieldConfig.type.toString()
              ) {
                // console.log(typeName, fieldName, fieldConfig)
                const newFieldConfig = {
                  ...fieldConfig,
                  type: fr.to.type
                    ? typeToGraphQLType(fr.to.type)
                    : fieldConfig.type,
                  resolve: fr.copyIfNullFrom
                    ? (parent, root, context, info) => {
                        const result = fieldConfig.resolve(
                          parent,
                          root,
                          context,
                          info
                        )
                        return result || parent.name
                      }
                    : fieldConfig.resolve,
                }
                return [fr.to.name, newFieldConfig]
              }
            }
          }
          return fieldConfig
        })
    ),

    // new TransformObjectFields((typeName, fieldName, fieldConfig) => {
    //   if (typeName === 'State') {
    //     if (fieldName === 'code') {
    //       // console.log(typeName, fieldName, fieldConfig)
    //       const newFieldConfig = {
    //         ...fieldConfig,
    //         type: new GraphQLNonNull(GraphQLID),
    //         resolve: (parent, root, context, info) => {
    //           const result = fieldConfig.resolve(parent, root, context, info)
    //           // console.log(`root: ${JSON.stringify(parent)}, result: ${result}`)
    //           return result || parent.name
    //         },
    //       }
    //       return ['id', newFieldConfig]
    //     }
    //   }

    //   return fieldConfig
    // }),
  ]

  state.schema = wrapSchema({
    schema: await introspectSchema(executor),
    executor,
    transforms,
  })
  // console.log(state.schema)
  return state
}

export const getSchema = (state) => state.schema
