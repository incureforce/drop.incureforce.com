const http = require('http')

const postgres = require('postgres')

const RequestPutClass = require('./classes/RequestPutClass')
const RequestGetClass = require('./classes/RequestGetClass')

let client = postgres({
    username: 'postgres'
})

let main = async function () {
    await client`drop table tab_file;`
    await client`create table if not exists tab_file ( key bytea not null, content bytea not null, expire_date timestamp not null, expire_count int not null, primary key (key) );`

    let handlers = [new RequestPutClass(client), new RequestGetClass(client)]

    let server = http.createServer(async function (req, res) {
        for (let handler of handlers) {
            if (handler.test(req, res)) {
                return handler.handle(req, res)
            }
        }

        res.writeHead(404, 'text/plain')
        res.end('FILE NOT FOUND')
    })

    server.listen(80)
}

main()