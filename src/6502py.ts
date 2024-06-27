// https://github.com/mnaberez/py65/blob/main/py65/devices/mpu6502.py#L317

const CARRY = 1 << 0
const ZERO = 1 << 1
const DECIMAL = 1 << 3
const OVERFLOW = 1 << 6
const NEGATIVE = 1 << 7

const BYTE_WIDTH = 8
const byteMask = ((1 << BYTE_WIDTH) - 1)

const adc = (a, data, p) => {
    console.log(`A:${a.toString(16)} v:${data.toString(16)} C:${p & CARRY} V:${(p & OVERFLOW) >> 6} N:${(p & NEGATIVE) >> 7} Z:${(p & ZERO) >> 1}`)
    const result = data + a + (p & CARRY)
    p &= ~(CARRY | OVERFLOW | NEGATIVE | ZERO)
    if ((~(a ^ data) & (a ^ result)) & NEGATIVE)
        p |= OVERFLOW
    data = result
    if (data > byteMask)
        p |= CARRY
    data &= byteMask
    if (data == 0)
        p |= ZERO
    else
        p |= data & NEGATIVE
    a = data
    console.log(`A:${a.toString(16)} v:${data.toString(16)} C:${p & CARRY} V:${(p & OVERFLOW) >> 6} N:${(p & NEGATIVE) >> 7} Z:${(p & ZERO) >> 1}`)
    console.log()
}

adc(0x00, 0x00, 0x00) // Z
adc(0x00, 0x00, CARRY) // C !!!
adc(0x01, 0xFE, 0x00) // N
adc(0x02, 0xFF, 0x00) // C
adc(0x01, 0xFF, 0x00) // C|Z
adc(0x7F, 0x01, 0x00) // N|V
adc(0x80, 0xFF, 0x00) // V|C
