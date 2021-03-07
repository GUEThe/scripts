/* eslint-disable no-prototype-builtins */
const fs = require('fs')
const nunjucks = require('nunjucks')

const typeMap = {
  integer: 'number',
  string: 'string',
  boolean: 'boolean',
  number: 'number'
}

/**
 * definitions转成model数组
 * @param {obejct} definitions swagger里的definitions字段
 */
const convertD2M = definitions => {
  const models = []
  for (const dkey in definitions) {
    if (definitions.hasOwnProperty(dkey)) {
      const { properties } = definitions[dkey]
      const model = {}
      model.title = definitions[dkey].title || dkey
      model.title = model.title.replace('.', '')
      model.title = model.title.replace('«', '').replace('»', '')
      model.required = definitions[dkey].required || []
      model.properties = []
      for (const pkey in properties) {
        if (properties.hasOwnProperty(pkey)) {
          const property = properties[pkey]
          const newP = {}
          newP.key = pkey

          let type = typeMap[property.type] || property.type
          switch (property.type) {
            case 'array':
              if (property.items.type) {
                type = typeMap[property.items.type] || property.items.type
              } else {
                type =
                  property.items['$ref'].slice(
                    property.items['$ref'].lastIndexOf('/') + 1,
                    property.items['$ref'].length
                  )
              }
              type += '[]'
              break
            case 'object':
              // console.log(property)
              type = property['$ref']
                ? property['$ref'].slice(
                  property['$ref'].lastIndexOf('/') + 1,
                  property['$ref'].length
                )
                : 'any'
              break
            default:
              if (property.type === undefined) {
                type = property['$ref']
                  ? property['$ref'].slice(
                    property['$ref'].lastIndexOf('/') + 1,
                    property['$ref'].length
                  )
                  : 'any'
              }
              break
          }

          newP.type = type
          newP.description = property.description ? property.description.replace('\n', '') : ''
          newP.required = !model.required.includes(pkey)
          model.properties.push(newP)
        }
      }
      // console.log(model);
      models.push(model)
    }
  }
  return models
}

// model示例
// {
//   title: 'ActionItem',
//   required: [],
//   properties: [
//     {
//       key: 'actionStatus',
//       type: 'number',
//       description: '行动状态。为null表示没有对应报文的状态。对应54报文的 8012 006\t作战行动控制模式',
//       required: true
//     },
//     {
//       key: 'executeStatus',
//       type: 'number',
//       description: '任务执行状态。为null表示没有对应报文的状态。对应37报文的 8012 005\t任务状态',
//       required: true
//     },
//     {
//       key: 'name',
//       type: 'string',
//       description: '行动名称',
//       required: true
//     },
//     {
//       key: 'vmfId',
//       type: 'number',
//       description: '行动唯一标识。对应到作战计划的opCombatActionList[0].vmfId',
//       required: true
//     }
//   ]
// }

const genModels = models => {
  const jsSource = nunjucks.render(`${__dirname}/njk/interface.njk`, { models })
  fs.writeFileSync(`./src/.generated/models.ts`, jsSource)
}

const file = './scripts/swagger/swagger.json'
const f = fs.readFileSync(file, 'UTF-8')
const swagger = JSON.parse(f)
const { definitions = {} } = swagger

genModels(convertD2M(definitions))
