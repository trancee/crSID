// https://github.com/skilldrick/6502js/blob/master/assembler.js#L457

const CARRY = 1 << 0
const ZERO = 1 << 1
const DECIMAL = 1 << 3
const OVERFLOW = 1 << 6
const NEGATIVE = 1 << 7

const adc = (regA, value, regP) => {
    console.log(`A:${regA.toString(16)} v:${value.toString(16)} C:${regP & CARRY} V:${(regP & OVERFLOW) >> 6} N:${(regP & NEGATIVE) >> 7} Z:${(regP & ZERO) >> 1}`)

    const tmp = regA + value + (regP & 1);;
    if ((regA ^ value) & 0x80) {
        regP &= 0xbf;
    } else {
        regP |= 0x40;
    }

    if (tmp >= 0x100) {
        regP |= 1;
        if ((regP & 0x40) && tmp >= 0x180) { regP &= 0xbf; }
    } else {
        regP &= 0xfe;
        if ((regP & 0x40) && tmp < 0x80) { regP &= 0xbf; }
    }

    regA = tmp & 0xff;

    console.log(`A:${regA.toString(16)} v:${value.toString(16)} C:${regP & CARRY} V:${(regP & OVERFLOW) >> 6} N:${(regP & NEGATIVE) >> 7} Z:${(regP & ZERO) >> 1}`)
    console.log()
}

adc(0x00, 0x00, 0x00) // Z
adc(0x00, 0x00, CARRY) // C
adc(0x01, 0xFE, 0x00) // -
adc(0x02, 0xFF, 0x00) // C
adc(0x01, 0xFF, 0x00) // C
adc(0x7F, 0x01, 0x00) // V
adc(0x80, 0xFF, 0x00) // V|C
