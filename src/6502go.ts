// https://github.com/zellyn/go6502/blob/master/cpu/opcodeinstructions.go#L69

const CARRY = 1 << 0
const ZERO = 1 << 1
const DECIMAL = 1 << 3
const OVERFLOW = 1 << 6
const NEGATIVE = 1 << 7

const setNZ = (value, P) => {
    P = (P & ~NEGATIVE) | (value & NEGATIVE)
    if (value == 0) {
        P |= ZERO
    } else {
        P &= ~ZERO
    }
    return P
}

const adc = (A, value, P) => {
    console.log(`A:${A.toString(16)} v:${value.toString(16)} ${(P & NEGATIVE) ? "N" : ""}${(P & OVERFLOW) ? "V" : ""}${(P & ZERO) ? "Z" : ""}${(P & CARRY) ? "C" : ""}`)

    const result16 = A + value + (P & CARRY)
    const result = result16 & 0xFF
    P &= ~(CARRY | OVERFLOW)
    P |= (result16 >> 8) & 0xFF
    if (((A ^ result) & (value ^ result) & 0x80) > 0) {
        P |= OVERFLOW
    }
    A = result
    P = setNZ(result, P)

    console.log(`A:${A.toString(16)} v:${value.toString(16)} ${(P & NEGATIVE) ? "N" : ""}${(P & OVERFLOW) ? "V" : ""}${(P & ZERO) ? "Z" : ""}${(P & CARRY) ? "C" : ""}`)
    console.log()
}

adc(0x00, 0x00, 0x00) // Z
adc(0x00, 0x00, CARRY) // -
adc(0x01, 0xFE, 0x00) // N
adc(0x02, 0xFF, 0x00) // C
adc(0x01, 0xFF, 0x00) // ZC
adc(0x7F, 0x01, 0x00) // NV
adc(0x80, 0xFF, 0x00) // VC
