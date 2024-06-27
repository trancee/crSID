// https://github.com/macmade/MOS-6502-Emulator/blob/main/MOS6502/Instructions/ADC.swift

const CARRY = 1 << 0
const ZERO = 1 << 1
const DECIMAL = 1 << 3
const OVERFLOW = 1 << 6
const NEGATIVE = 1 << 7


const adc = (A, value, P) => {
    console.log(`A:${A.toString(16)} v:${value.toString(16)} ${(P & NEGATIVE) ? "N" : ""}${(P & OVERFLOW) ? "V" : ""}${(P & ZERO) ? "Z" : ""}${(P & CARRY) ? "C" : ""}`)

    let base = A
    let add = value
    let carry = (P & CARRY) ? 1 : 0
    let result = A + add + carry
    A = result & 0xFF

    if (((base & (1 << 7)) == 0) && ((add & (1 << 7)) == 0) && ((A & (1 << 7)) != 0)) {
        P |= OVERFLOW
    }
    else if (((base & (1 << 7)) != 0) && ((add & (1 << 7)) != 0) && ((A & (1 << 7)) == 0)) {
        P |= OVERFLOW
    }
    else {
        P &= ~OVERFLOW
    }

    if (result > 0xFF) P |= CARRY
    if (value == 0) P |= ZERO
    if ((value & (1 << 7)) != 0) P |= NEGATIVE

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
