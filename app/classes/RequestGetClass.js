const crypto = require('crypto')
const EncryptionClass = require('./EncryptionClass')

function RequestGetClass(client) {
    let encryption = new EncryptionClass()

    this.test = (req, res) => {
        let match = req.url.match(/get\/(.*)\?salt=(.*)/)
        if (match) {
            req.match = match

            return true
        }
        else {
            return false
        }
    }

    this.handle = (req, res) => {
        let salt = Buffer.from(req.match[2], 'hex')
        let fileName = req.match[1]

        crypto.scrypt(fileName, salt, 32 + 16, async (err, result) => {
            let iv = result.slice(32, 48)
            let key = result.slice(00, 32)

            let dbKey = EncryptionClass.encrypt(result, key, iv)

            let dbResult = await client`select * from tab_file where key = ${dbKey} and expire_date > current_timestamp and expire_count > ${0};`
            
            if (dbResult.length != 1) {
                res.writeHead(404, 'text/plain')
                res.end('FILE NOT FOUND')
                return
            }

            await client`update tab_file set expire_count = expire_count - 1 where key = ${dbKey};`

            let entry = dbResult.pop()

            let allChunks = entry.content

            let contents = EncryptionClass.decrypt(allChunks, key, iv)

            res.writeHead(200, { 
                'Content-Type': 'application/octet-stream' 
            })
            res.write(contents)
            res.end();

            await client`delete from tab_file where expire_date < current_timestamp or expire_count = ${0};`
        });
    }
}

module.exports = RequestGetClass