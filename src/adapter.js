// --- Exdternal imports
import { getIntrospectionQuery, print } from 'graphql'
import { fetch } from 'cross-fetch'
import { makeRemoteExecutableSchema } from 'graphql-tools'

import {
  wrapSchema,
  introspectSchema,
  FieldTransformer,
  TransformObjectFields,
} from '@graphql-tools/wrap'
// --- Internal imports
import { log } from './utils.js'

// --- Constants

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

const fieldRenames = [
  {
    type: null,
    from: {
      name: 'code',
      type: 'ID!',
    },
    to: {
      name: 'id',
    },
  },
]

export const createAdapter = async (
  endpointUrl = 'https://countries.trevorblades.com/'
) => {
  const state = {}
  const executor = createExecutor(endpointUrl)
  const transforms = [
    ...fieldRenames.map(
      (fr) =>
        new TransformObjectFields((typeName, fieldName, fieldConfig) => {
          if (!fr.type || fr.type === typeName) {
            if (fr.from.name === fieldName) {
              if (
                !fr.from.type ||
                fr.from.type === fieldConfig.type.toString()
              ) {
                console.log(typeName, fieldName, fieldConfig)
                return [fr.to.name, fieldConfig]
              }
            }
          }
          return fieldConfig
        })
    ),
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
