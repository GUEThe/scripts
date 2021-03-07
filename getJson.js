const http = require('http')
const fs = require('fs')

http.get('http://localhost:60100/v1/v2/api-docs', (res) => {
  const { statusCode } = res
  if (statusCode === 200) {
    res.setEncoding('utf8')
    let rawData = ''
    res.on('data', (chunk) => {
      rawData += chunk
    })
    res.on('end', () => {
      fs.writeFileSync(`${__dirname}/swagger/swagger.json`, rawData)
      fs.writeFileSync(`./mock/swagger.json`, rawData)
    })
  } else {
    throw new Error('get swaggerJson faild')
  }
}, (err) => { throw err })
