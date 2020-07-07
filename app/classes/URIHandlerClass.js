const os = require('os')
const fs = require('fs')
const url = require('url')
const path = require('path')
const crypto = require('crypto')
const postgres = require('postgres')

const EncryptionClass = require('./EncryptionClass')

let client = postgres({
    username: 'postgres'
})

let URIHandlerClass = function () {
}

URIHandlerClass.limit = 1024 * 1024 * 5
URIHandlerClass.static = '/app/static'
URIHandlerClass.hostname = os.hostname()
URIHandlerClass.extensions = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',

    '.ico': 'image/x-icon'
}

URIHandlerClass.startup = async function () {
    // await client`drop table tab_file;`
    await client`create table if not exists tab_file ( key bytea not null, content bytea not null, expire_date timestamp not null, expire_count int not null, primary key (key) );`

    await URIHandlerClass.enqueueCleanup()

    return [ URIHandlerClass.processStorage, URIHandlerClass.processStatic, URIHandlerClass.processError ]
}

URIHandlerClass.performCleanup = async function () {
    await client`delete from tab_file where expire_date < current_timestamp or expire_count = ${0};`

    console.info('postgres', 'table', 'cleanup performed')

    await URIHandlerClass.enqueueCleanup()
}

URIHandlerClass.enqueueCleanup = async function() {
    do {
        let selectResult = await client`select expire_date from tab_file order by expire_date asc limit 1;`

        if (selectResult.length < 1) {
            console.info('postgres', 'table', 'empty')

            clearTimeout(URIHandlerClass.cleanupHandle)

            return
        }

        let entry = selectResult.pop()

        let actualDate = new Date()
        let actualDiff = entry.expire_date - actualDate

        if (actualDiff > 0) {
            actualDiff = actualDiff + 5000

            URIHandlerClass.cleanupHandle = setTimeout(URIHandlerClass.performCleanup, actualDiff)

            console.info('postgres', 'table', 'cleanup scheduled', Math.floor(actualDiff / 1000 / 60), 'minutes')

            return
        }

        await URIHandlerClass.performCleanup()
    } while (true)
}

URIHandlerClass.dispose = async function () {
    clearTimeout(URIHandlerClass.cleanupHandle)

    delete URIHandlerClass.cleanupHandle
}

URIHandlerClass.applyURI = function (req) {
    let uri = new url.URL('http:' + '//' + URIHandlerClass.hostname + req.url)
    let headers = req.headers

    if ('x-forwarded-proto' in headers) {
        uri.protocol = headers['x-forwarded-proto']
    }

    if ('host' in headers) {
        uri.host = headers['host']
    }

    return req.uri = uri
}

URIHandlerClass.ensureQueryBuffer = function (arg) {
    if (arg) {
        let buffer = Buffer.from(arg, 'hex')
        if (buffer.length < 4) {
            return crypto.randomBytes(4)
        }

        return buffer
    }

    return crypto.randomBytes(4)
}

URIHandlerClass.ensureQueryExpire = function (arg) {
    if (arg) {
        let number = Math.floor(arg)
        if (number < 1 || number > 9 || isNaN(number)) {
            return 1
        }

        return number
    }

    return 1
}

URIHandlerClass.ensureQuery = function (uri, name, fn) {
    return fn(uri.searchParams.get(name))
}

let staticTest = function (req) {
    let uri = req.uri
    let uriPath = uri.pathname

    if (req.method == 'GET') {
        let match = uriPath.match(/\/(.+)?/)
        if (match && match.index == 0) {
            req.match = match

            return true
        }
    }

    return false
}

URIHandlerClass.processStatic = function (req, res) {
    let uri = req.uri

    if (staticTest(req) == false) {
        return false
    }

    let fileName = req.match[1] || 'index.html'
    let filePath = path.normalize(path.join(URIHandlerClass.static, fileName))
    let fileContentType = URIHandlerClass.extensions[path.extname(fileName)] || 'application/octet-stream'

    if (filePath.startsWith(URIHandlerClass.static)) {
        fs.readFile(filePath, function (err, data) {
            if (err) {
                return URIHandlerClass.processError(req, res)
            } else {
                res.writeHead(200, {
                    'Content-Type': fileContentType
                })
            
                res.end(data)
            
                return true
            }
        })
    
        return true
    }
    else {
        return URIHandlerClass.processError(req, res)
    }
}

let storageTest = function (req) {
    let uri = req.uri
    let uriPath = uri.pathname

    if (req.method == 'GET' || req.method == 'PUT') {
        let match = uriPath.match(/\/storage\/(.+)/)
        if (match && match.index == 0) {
            req.match = match

            return true
        }
    }

    return false
}

let storageDecrypt = async function (req, res, params) {
    try {
        let dbKey = params.token
        let selectResult = await client`select * from tab_file where key = ${dbKey} and expire_date > current_timestamp and expire_count > ${0};`

        if (selectResult.length != 1) {
            return URIHandlerClass.processError(req, res)
        }

        let updateResult = await client`update tab_file set expire_count = expire_count - 1 where key = ${dbKey} RETURNING expire_count;`

        let entry = selectResult.pop()

        let encryptedContent = entry.content
        let decryptedContent = EncryptionClass.decrypt(encryptedContent, params.key, params.iv)

        res.writeHead(200, {
            'Content-Type': 'application/octet-stream'
        })
        res.write(decryptedContent)
        res.end();

        if (entry.expire_count == 1) {
            await URIHandlerClass.performCleanup()
        }

        return 
    }
    catch (err) {
        console.error(err)

        let result = {
            status: 500, 
            message: 'INTERNAL SERVER ERROR'
        }

        if ('status' in err && 'message' in err) {
            Object.assign(result, err)
        }

        return URIHandlerClass.processError(req, res, result)
    }
}

let storageEncrypt = async function (req, res, params) {
    try {
        let dbKey = params.token
        let decryptedContent = await new Promise(function (resolve, reject) {
            let chunks = []
            let chunksLength = 0
            
            req.on('readable', function () {
                let chunk = req.read()
                if (chunk != null) {
                    chunks.push(chunk)

                    chunksLength += chunk.length
                }
                if (chunksLength > URIHandlerClass.limit) {
                    reject({
                        'status': 403,
                        'message': 'Forbidden (Limit exceeded)'
                    })
                }
            });
            
            req.on('end', function () {
                resolve(Buffer.concat(chunks))
            })
        })

        let uri = req.uri
        let encryptedContent = EncryptionClass.encrypt(decryptedContent, params.key, params.iv)

        params.expire_time = URIHandlerClass.ensureQuery(uri, 'expire_time', URIHandlerClass.ensureQueryExpire)
        params.expire_count = URIHandlerClass.ensureQuery(uri, 'expire_count', URIHandlerClass.ensureQueryExpire)

        let salt = params.salt
        let expireDate = new Date()
        let expireCount = params.expire_count

        expireDate.setMinutes(expireDate.getMinutes() + params.expire_time)

        let insertResult = await client`insert into tab_file (key, content, expire_date, expire_count) values (${dbKey}, ${encryptedContent}, ${expireDate}, ${expireCount});`

        res.writeHead(200, { 
            'Content-Type': 'text/plain'
        })
        res.write(url.format(uri, { search: false }) + '?salt=' + salt.toString('hex') + '\r\n')
        res.end();

        await URIHandlerClass.enqueueCleanup()

        return 
    }
    catch (err) {
        console.error(err)

        let result = {
            status: 500, 
            message: 'INTERNAL SERVER ERROR'
        }

        if ('status' in err && 'message' in err) {
            Object.assign(result, err)
        }

        return URIHandlerClass.processError(req, res, result)
    }
}

URIHandlerClass.processStorage = function (req, res) {
    let uri = req.uri

    if (storageTest(req) == false) {
        return false
    }

    let params = {}

    params.path = req.match[1]
    params.salt = URIHandlerClass.ensureQuery(uri, 'salt', URIHandlerClass.ensureQueryBuffer)

    crypto.scrypt(params.path, params.salt, 32 + 16, async (err, result) => {
        params.iv = result.slice(32, 48)
        params.key = result.slice(00, 32)

        params.token = EncryptionClass.encrypt(result, params.key, params.iv)

        if (req.method == 'GET') {
            return storageDecrypt(req, res, params)
        }

        if (req.method == 'PUT') {
            return storageEncrypt(req, res, params)
        }

        return URIHandlerClass.processError(req, res)
    })

    return true
}

URIHandlerClass.processError = function (req, res, options) {
    options = Object.assign({ 
        status: 404, 
        message: 'FILE NOT FOUND'
    }, options)

    res.writeHead(options.status, {
        'Content-Type': 'text/plain'
    })

    res.end(options.message + '\r\n')

    return true
}

module.exports = URIHandlerClass