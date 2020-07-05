const crypto = require('crypto');

const ENC_ALG = 'aes-256-cbc'

function EncryptionClass() {
}

EncryptionClass.encrypt = function (buffer, derivedKey, iv) {
    let encryptor = crypto.createCipheriv(ENC_ALG, derivedKey, iv);
    let encrypted = encryptor.update(buffer);
   
    return Buffer.concat([encrypted, encryptor.final()]);
}

EncryptionClass.decrypt = function (buffer, derivedKey, iv) {
    let decryptor = crypto.createDecipheriv(ENC_ALG, derivedKey, iv);
    let decrypted = decryptor.update(buffer);

    return Buffer.concat([decrypted, decryptor.final()]);
}

EncryptionClass.generateKey = function(num) {
    return crypto.randomBytes(num)
}

module.exports = EncryptionClass