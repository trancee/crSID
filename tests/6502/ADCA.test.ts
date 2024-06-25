import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"
import { compareTest, prepareTest } from "./helpers"

/**
 * ADC
 * Add with Carry
 *
 * ADC behavior depends on the state of the decimal flag.
 * In decimal mode, the values upon which the addition is performed are interpreted as packed BCD (Binary Coded Decimal).
 */

const tests = [
    ["carry_clear_in_accumulator_zeroes", { A: 0x00, value: 0x00, flags: NO_FLAGS }, { A: 0x00, flags: Z }],
    ["carry_set_in_accumulator_zero", { A: 0x00, value: 0x00, flags: C }, { A: 0x01, flags: NO_FLAGS /* FIXME: must be C */ }],
    // ["carry_clear_in_no_carry_clear_out", { A: 0x01, value: 0xFE, flags: NO_FLAGS }, { A: 0xFF, flags: N }],
    // ["carry_clear_in_carry_set_out", { A: 0x02, value: 0xFF, flags: NO_FLAGS }, { A: 0x01, flags: C }],
    // ["overflow_clr_no_carry_01_plus_01", { A: 0x01, value: 0x01, flags: ~C }, { A: 0x02, flags: NO_FLAGS }],
    // ["overflow_clr_no_carry_01_plus_ff", { A: 0x01, value: 0xFF, flags: ~C }, { A: 0x00, flags: Z | C }],
    // ["overflow_set_no_carry_7f_plus_01", { A: 0x7F, value: 0x01, flags: ~C }, { A: 0x80, flags: V | N }],
    // ["overflow_set_no_carry_80_plus_ff", { A: 0x80, value: 0xFF, flags: ~C }, { A: 0x7F, flags: V | C }],
    // ["overflow_set_on_40_plus_40", { A: 0x40, value: 0x40, flags: ~V }, { A: 0x80, flags: V | N }],
]

describe("ADC Absolute", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        prepareTest(cpu, input)

        // $0000 ADC $C000

        CPU.wr(0x0000, 0x6D)
        CPU.wr(0x0001, 0x00)
        CPU.wr(0x0002, 0xC0)

        CPU.wr(0xC000, input.value)

        expect(cpu.emulateCPU()).toEqual(4)
        expect(cpu.PC).toEqual(0x0003)

        compareTest(cpu, output)
    })
})
