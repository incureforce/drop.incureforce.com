const url = require('url')
const http = require('http')
const crypto = require('crypto')

const postgres = require('postgres')

const URIHandlerClass = require('./classes/URIHandlerClass')

let main = async function () {
    let handlers = await URIHandlerClass.startup()

    let server = http.createServer(async function (req, res) {
        URIHandlerClass.applyURI(req)

        for (let handler of handlers) {
            if (handler(req, res)) {
                return
            }
        }
    })

    server.addListener('close', function() {
        URIHandlerClass.dispose()
    })
    
    server.listen(80)
}

main()
