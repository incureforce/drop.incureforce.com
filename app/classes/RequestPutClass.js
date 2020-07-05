const crypto = require('crypto')
const EncryptionClass = require('./EncryptionClass')

function RequestPutClass(client) {
    let encryption = new EncryptionClass()

    this.test = (req, res) => {
        let match = req.url.match(/put\/(.*)/)
        if (match) {
            req.match = match

            return true
        }
        else {
            return false
        }
    }

    this.handle = (req, res) => {
        let salt = EncryptionClass.generateKey(04)
        let chunks = []
        let fileName = req.match[1]

        req.on('readable', function () {
            let chunk = req.read()
            if (chunk != null) {
                chunks.push(chunk)
            }
        });

        req.on('end', function () {
            let allChunks = Buffer.concat(chunks)

            crypto.scrypt(fileName, salt, 32 + 16, async (err, result) => {
                let iv = result.slice(32, 48)
                let key = result.slice(00, 32)

                let dbKey = EncryptionClass.encrypt(result, key, iv)

                let content = EncryptionClass.encrypt(allChunks, key, iv)
                let expireDate = new Date()
                let expireCount = 1

                expireDate.setDate(expireDate.getDate() + 1)

                let dbResult = await client`insert into tab_file (key, content, expire_date, expire_count) values (${dbKey}, ${content}, ${expireDate.toISOString()}, ${expireCount});`

                res.writeHead(200, { 
                    'Content-Type': 'text/plain' 
                })
                res.write('http://localhost/get/' + fileName + '?salt=' + salt.toString('hex'))
                res.end();

                await client`delete from tab_file where expire_date < current_timestamp or expire_count = ${0};`
            });
        });
    }
}

module.exports = RequestPutClass

// crypto.randomBytes(4, (err, buf) => {
//     let salt = buf.toString('hex')
//     let fileName = 'upload.txt'
//     let fileContent = 'awesome sauce'

//     crypto.scrypt(fileName, salt, 32, (err, derivedKey) => {
//         let iv = crypto.randomBytes(IV_LENGTH);

//         let encryptor = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
//         let encrypted = encryptor.update(fileContent);

//         encrypted = Buffer.concat([encrypted, encryptor.final()]);

//         let decryptor = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
//         let decrypted = decryptor.update(encrypted);

//         decrypted = Buffer.concat([decrypted, decryptor.final()]);

//         console.log(encrypted)
//         console.log(decrypted.toString('utf-8'))
//     });
// })