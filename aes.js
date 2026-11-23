function multiply(a, b) {
    let result = 0;
    for (let i = 0; i < 8; i++) {
        if (b & 1) result ^= a;
        const high = a & 0x80;
        a = (a << 1) & 0xff;
        if (high) a ^= 0x1b;
        b >>= 1;
    }
    return result;
}

function power(value, exponent) {
    let result = 1;
    while (exponent > 0) {
        if (exponent & 1) result = multiply(result, value);
        value = multiply(value, value);
        exponent >>= 1;
    }
    return result;
}

function rotate(value, count) {
    return ((value << count) | (value >> (8 - count))) & 0xff;
}

const sbox = new Uint8Array(256);
const inverseSbox = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
    const inverse = i === 0 ? 0 : power(i, 254);
    const value = inverse ^ rotate(inverse, 1) ^ rotate(inverse, 2) ^
        rotate(inverse, 3) ^ rotate(inverse, 4) ^ 0x63;
    sbox[i] = value;
    inverseSbox[value] = i;
}

function expandKey(key) {
    if (key.length !== 16) throw new Error('MangaCopy AES key must be 16 bytes');
    const expanded = new Uint8Array(176);
    expanded.set(key);
    let generated = 16;
    let roundConstant = 1;
    const temp = new Uint8Array(4);
    while (generated < expanded.length) {
        temp.set(expanded.subarray(generated - 4, generated));
        if (generated % 16 === 0) {
            const first = temp[0];
            temp[0] = sbox[temp[1]] ^ roundConstant;
            temp[1] = sbox[temp[2]];
            temp[2] = sbox[temp[3]];
            temp[3] = sbox[first];
            roundConstant = multiply(roundConstant, 2);
        }
        for (let i = 0; i < 4; i++) {
            expanded[generated] = expanded[generated - 16] ^ temp[i];
            generated++;
        }
    }
    return expanded;
}

function addRoundKey(state, expanded, round) {
    const offset = round * 16;
    for (let i = 0; i < 16; i++) state[i] ^= expanded[offset + i];
}

function inverseShiftRows(state) {
    const copy = state.slice();
    for (let row = 1; row < 4; row++) {
        for (let column = 0; column < 4; column++) {
            state[column * 4 + row] = copy[((column - row + 4) % 4) * 4 + row];
        }
    }
}

function inverseMixColumns(state) {
    for (let column = 0; column < 4; column++) {
        const offset = column * 4;
        const a = state[offset];
        const b = state[offset + 1];
        const c = state[offset + 2];
        const d = state[offset + 3];
        state[offset] = multiply(a, 14) ^ multiply(b, 11) ^ multiply(c, 13) ^ multiply(d, 9);
        state[offset + 1] = multiply(a, 9) ^ multiply(b, 14) ^ multiply(c, 11) ^ multiply(d, 13);
        state[offset + 2] = multiply(a, 13) ^ multiply(b, 9) ^ multiply(c, 14) ^ multiply(d, 11);
        state[offset + 3] = multiply(a, 11) ^ multiply(b, 13) ^ multiply(c, 9) ^ multiply(d, 14);
    }
}

function decryptBlock(block, expanded) {
    const state = block.slice();
    addRoundKey(state, expanded, 10);
    for (let round = 9; round > 0; round--) {
        inverseShiftRows(state);
        for (let i = 0; i < 16; i++) state[i] = inverseSbox[state[i]];
        addRoundKey(state, expanded, round);
        inverseMixColumns(state);
    }
    inverseShiftRows(state);
    for (let i = 0; i < 16; i++) state[i] = inverseSbox[state[i]];
    addRoundKey(state, expanded, 0);
    return state;
}

function utf8Bytes(value) {
    const encoded = unescape(encodeURIComponent(value));
    const bytes = new Uint8Array(encoded.length);
    for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i);
    return bytes;
}

function utf8String(bytes) {
    let encoded = '';
    for (let i = 0; i < bytes.length; i++) {
        encoded += `%${bytes[i].toString(16).padStart(2, '0')}`;
    }
    return decodeURIComponent(encoded);
}

function decryptAesCbcHex(cipherHex, keyText, ivText) {
    if (!cipherHex || cipherHex.length % 32 !== 0) {
        throw new Error('Invalid MangaCopy encrypted payload');
    }
    const key = utf8Bytes(keyText);
    let previous = utf8Bytes(ivText);
    if (previous.length !== 16) throw new Error('Invalid MangaCopy AES initialization vector');
    const expanded = expandKey(key);
    const output = new Uint8Array(cipherHex.length / 2);
    for (let offset = 0; offset < output.length; offset += 16) {
        const block = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            block[i] = parseInt(cipherHex.substr((offset + i) * 2, 2), 16);
            if (isNaN(block[i])) throw new Error('Invalid MangaCopy encrypted payload');
        }
        const decrypted = decryptBlock(block, expanded);
        for (let i = 0; i < 16; i++) output[offset + i] = decrypted[i] ^ previous[i];
        previous = block;
    }
    const padding = output[output.length - 1];
    if (padding < 1 || padding > 16) throw new Error('Invalid MangaCopy encrypted payload padding');
    for (let i = output.length - padding; i < output.length; i++) {
        if (output[i] !== padding) throw new Error('Invalid MangaCopy encrypted payload padding');
    }
    return utf8String(output.subarray(0, output.length - padding));
}

function decryptMangaCopyPayload(value, keyText) {
    if (!value || value.length <= 16) throw new Error('MangaCopy encrypted data is missing');
    return decryptAesCbcHex(value.substring(16), keyText, value.substring(0, 16));
}

module.exports = {
    decryptAesCbcHex: decryptAesCbcHex,
    decryptMangaCopyPayload: decryptMangaCopyPayload
};
