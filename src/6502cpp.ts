// https://github.com/gianlucag/mos6502/blob/master/mos6502.cpp#L1070

const CARRY = 1 << 0
const ZERO = 1 << 1
const DECIMAL = 1 << 3
const OVERFLOW = 1 << 6
const NEGATIVE = 1 << 7

const adc = (A, m, status) => {
    console.log(`A:${A.toString(16)} v:${m.toString(16)} ${(status & NEGATIVE) ? "N" : ""}${(status & OVERFLOW) ? "V" : ""}${(status & ZERO) ? "Z" : ""}${(status & CARRY) ? "C" : ""}`)

    const tmp = m + A + ((status & CARRY) ? 1 : 0);
    ((!(tmp & 0xFF)) ? (status |= ZERO) : (status &= (~ZERO)));

    ((tmp & 0x80) ? (status |= NEGATIVE) : (status &= (~NEGATIVE)));
    ((!((A ^ m) & 0x80) && ((A ^ tmp) & 0x80)) ? (status |= OVERFLOW) : (status &= (~OVERFLOW)));
    ((tmp > 0xFF) ? (status |= CARRY) : (status &= (~CARRY)));

    A = tmp & 0xFF;

    console.log(`A:${A.toString(16)} v:${m.toString(16)} ${(status & NEGATIVE) ? "N" : ""}${(status & OVERFLOW) ? "V" : ""}${(status & ZERO) ? "Z" : ""}${(status & CARRY) ? "C" : ""}`)
    console.log()
}

adc(0x00, 0x00, 0x00) // Z
adc(0x00, 0x00, CARRY) // -
adc(0x01, 0xFE, 0x00) // N
adc(0x02, 0xFF, 0x00) // C
adc(0x01, 0xFF, 0x00) // ZC
adc(0x7F, 0x01, 0x00) // NV
adc(0x80, 0xFF, 0x00) // VC
