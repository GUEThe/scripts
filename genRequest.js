/* eslint-disable no-prototype-builtins */
const fs = require('fs')
const nunjucks = require('nunjucks')

const file = './scripts/swagger/swagger.json'
const f = fs.readFileSync(file, 'UTF-8')
const swagger = JSON.parse(f)
const { paths = {} } = swagger

const typeMap = {
  integer: 'number',
  string: 'string',
  boolean: 'boolean',
  number: 'number',
  file: 'string'
}

/**
 * 从schema中获取类型
 * @param {object} schema
 * @returns {string} type
 */
function getType(itype, schema) {
  let type = itype
  if (schema) type = schema.type
  type = typeMap[type] || type
  if (type === 'array') {
    if (schema.items.$ref) {
      const sliceT = schema.items.$ref.slice(
        schema.items.$ref.lastIndexOf('/') + 1,
        schema.items.$ref.length
      )
      type = 'model.' + sliceT + '[]'
      if (sliceT === 'Map«string,object»') type = 'any'
    }
  }
  if (type === 'object' || type === undefined) {
    if (schema.$ref) {
      const sliceT = schema.$ref.slice(schema.$ref.lastIndexOf('/') + 1, schema.$ref.length)
      type = 'model.' + sliceT
      if (sliceT === 'Map«string,object»') type = 'any'
    } else {
      type = 'any'
    }
  }
  return type
}

/**
 * 从Parameter中获取其类型
 * @param {string} type 类型
 * @param {Object} schema schema
 */
function getTypeFromParameter(type, schema) {
  if (typeMap[type]) { return typeMap[type] }
  if (schema['$ref']) {
    return 'model.' + schema['$ref'].slice(
      schema['$ref'].lastIndexOf('/') + 1,
      schema['$ref'].length
    )
  }
  if (schema.type === 'array') {
    const { items = {} } = schema
    if (items.type) {
      return `${typeMap[items.type]}[]`
    }
    if (items.$ref) {
      return 'model.' + items['$ref'].slice(
        items['$ref'].lastIndexOf('/') + 1,
        items['$ref'].length
      ) + '[]'
    }
  }
}

function convertP2R(paths) {
  const requests = []
  for (const pkey in paths) {
    if (paths.hasOwnProperty(pkey)) {
      const path = paths[pkey]
      for (const mkey in path) {
        if (path.hasOwnProperty(mkey)) {
          const method = path[mkey]
          const request = {}
          request.url = pkey.replace(/{/g, '${data.')
          request.method = mkey
          request.summary = method.summary
          request.operationId = method.operationId.replace(`Using${mkey.toUpperCase()}`, '')
          request.parameters = []
          const { parameters = [] } = method
          for (const prkey in parameters) {
            if (parameters.hasOwnProperty(prkey)) {
              const parameter = parameters[prkey]
              const newParameter = {
                name: parameter.name,
                required: parameter.required,
                in: parameter.in,
                description: parameter.description
              }
              newParameter.type = getTypeFromParameter(parameter.type, parameter.schema)
              request.parameters.push(newParameter)
            }
          }
          request.parameters = request.parameters.sort((a, b) => {
            return a.required ? -1 : 1
          })
          request.hasParameters = request.parameters.length > 0
          request.responses = []
          const { responses = {} } = method
          for (const resKey in responses) {
            if (responses.hasOwnProperty(resKey)) {
              const response = responses[resKey]
              const newResp = {
                type: 'undefined'
              }
              if (response.schema) {
                newResp.type = getType(response.type, response.schema)
              }
              if (resKey === '200') {
                request.ok = newResp
                if (method.description === 'IsPageList') {
                  request.ok = { type: `model.PageList${newResp.type.replace('[]', '').replace('model.', '')}` }
                }
              }
              request.responses.push(newResp)
            }
          }

          // console.log(request)
          requests.push(request)
        }
      }
    }
  }
  return requests
}

const requests = convertP2R(paths)
// console.log(requests)
const jsSource = nunjucks.render(`${__dirname}/njk/request.njk`, { requests })
fs.writeFileSync(`./src/.generated/api.ts`, jsSource)
