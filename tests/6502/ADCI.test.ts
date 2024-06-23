import { C, CPU, D, N, NO_FLAGS, V, Z } from "../../src/CPU"

// ADC Immediate

const tests = [
    ["carry_clear_in_accumulator_zeroes", { A: 0x00, value: 0x00, flags: NO_FLAGS }, { A: 0x00, flags: Z }],
    ["carry_set_in_accumulator_zero", { A: 0x00, value: 0x00, flags: C }, { A: 0x01, flags: NO_FLAGS /* FIXME: must be C */ }],
    ["carry_clear_in_no_carry_clear_out", { A: 0x01, value: 0xFE, flags: NO_FLAGS }, { A: 0xFF, flags: N }],
    ["carry_clear_in_carry_set_out", { A: 0x02, value: 0xFF, flags: NO_FLAGS }, { A: 0x01, flags: C }],
    ["overflow_clr_no_carry_01_plus_01", { A: 0x01, value: 0x01, flags: ~C }, { A: 0x02, flags: NO_FLAGS }],
    ["overflow_clr_no_carry_01_plus_ff", { A: 0x01, value: 0xFF, flags: ~C }, { A: 0x00, flags: Z | C }],
    ["overflow_set_no_carry_7f_plus_01", { A: 0x7F, value: 0x01, flags: ~C }, { A: 0x80, flags: V | N }],
    ["overflow_set_no_carry_80_plus_ff", { A: 0x80, value: 0xFF, flags: ~C }, { A: 0x7F, flags: V | C }],
    ["overflow_set_on_40_plus_40", { A: 0x40, value: 0x40, flags: ~V }, { A: 0x80, flags: V | N }],

    ["test_adc_bcd_on_immediate_79_plus_00_carry_set", { A: 0x79, value: 0x00, flags: D | C }, { A: 0x80, flags: V | N }],
    // ["test_adc_bcd_on_immediate_6f_plus_00_carry_set", { A: 0x6F, value: 0x00, flags: D | C }, { A: 0x76, flags: NO_FLAGS }],
]

describe("ADC Immediate", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 ADC #$00

        CPU.wr(0x0000, 0x69)
        CPU.wr(0x0001, input.value || 0x00)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0002)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
