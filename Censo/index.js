var encrypt = function (str) {
    var reverse = str.split('').reverse().join('');
    return 'encrypted_' + reverse;
};
var decrypt = function (str) {
    var strip = str.substr(10); // Let us remove the 'encrypted_' part
    return strip.split('').reverse().join('');
};
exports.encrypt = encrypt;
exports.decrypt = decrypt;
