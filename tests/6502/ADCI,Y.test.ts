import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// ADC Indexed, Indirect (Y)

const tests = [
    ["carry_clear_in_accumulator_zeroes", { A: 0x00, Y: 0x03, value: 0x00, flags: NO_FLAGS }, { A: 0x00, flags: Z }],
    ["carry_set_in_accumulator_zero", { A: 0x00, Y: 0x03, value: 0x00, flags: C }, { A: 0x01, flags: NO_FLAGS /* FIXME: must be C */ }],
    ["carry_clear_in_no_carry_clear_out", { A: 0x01, Y: 0x03, value: 0xFE, flags: NO_FLAGS }, { A: 0xFF, flags: N }],
    ["carry_clear_in_carry_set_out", { A: 0x02, Y: 0x03, value: 0xFF, flags: NO_FLAGS }, { A: 0x01, flags: C }],
    ["overflow_clr_no_carry_01_plus_01", { A: 0x01, Y: 0x03, value: 0x01, flags: ~C }, { A: 0x02, flags: NO_FLAGS }],
    ["overflow_clr_no_carry_01_plus_ff", { A: 0x01, Y: 0x03, value: 0xFF, flags: ~C }, { A: 0x00, flags: Z | C }],
    ["overflow_set_no_carry_7f_plus_01", { A: 0x7F, Y: 0x03, value: 0x01, flags: ~C }, { A: 0x80, flags: V | N }],
    ["overflow_set_no_carry_80_plus_ff", { A: 0x80, Y: 0x03, value: 0xFF, flags: ~C }, { A: 0x7F, flags: V | C }],
    ["overflow_set_on_40_plus_40", { A: 0x40, Y: 0x03, value: 0x40, flags: ~V }, { A: 0x80, flags: V | N }],
]

describe("ADC Indexed, Indirect (Y)", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 ADC ($0010),Y

        CPU.wr(0x0000, 0x71)
        CPU.wr(0x0001, 0x10)

        // $0010 Vector to $ABCD

        CPU.wr(0x0010, 0xCD)
        CPU.wr(0x0011, 0xAB)

        CPU.wr(0xABCD + cpu.Y, input.value)

        expect(cpu.emulateCPU()).toEqual(5)
        expect(cpu.PC).toEqual(0x0002)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
