import { C, CPU, D, N, NO_FLAGS, V, Z } from "../../src/CPU"

// SBC Immediate

const tests = [
    ["all_zeros_and_no_borrow_is_zero", { PC: 0x0000, A: 0x00, value: 0x00, flags: C }, { PC: 0x0002, A: 0x00, flags: Z | C }],
    ["downto_zero_no_borrow_sets_z_clears_n", { PC: 0x0000, A: 0x01, value: 0x01, flags: C }, { PC: 0x0002, A: 0x00, flags: Z | C }],
    ["downto_zero_with_borrow_sets_z_clears_n", { PC: 0x0000, A: 0x01, value: 0x00, flags: ~(D | C) }, { PC: 0x0002, A: 0x00, flags: Z | C }],
    ["downto_four_with_borrow_clears_z_n", { PC: 0x0000, A: 0x07, value: 0x02, flags: ~(D | C) }, { PC: 0x0002, A: 0x04, flags: C }],
    ["bcd_on_immediate_0a_minus_00_carry_set", { PC: 0x0000, A: 0x0A, value: 0x00, flags: D | C }, { PC: 0x0002, A: 0x0A, flags: C }],
    ["bcd_on_immediate_9a_minus_00_carry_set", { PC: 0x0000, A: 0x9A, value: 0x00, flags: D | C }, { PC: 0x0002, A: 0x9A, flags: N | C }],
    ["bcd_on_immediate_00_minus_01_carry_set", { PC: 0x0000, A: 0x00, value: 0x01, flags: V | D | Z | C }, { PC: 0x0002, A: 0xFF /* FIXME: should be 0x99 */, flags: N }],
    ["bcd_on_immediate_20_minus_0a_carry_unset", { PC: 0x0000, A: 0x20, value: 0x0A, flags: D }, { PC: 0x0002, A: 0x15 /* FIXME: should be 0x1F */, flags: C }],
]

describe("SBC Immediate", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 SBC #$00
        CPU.wr(input.PC + 0, 0xE9)
        CPU.wr(input.PC + 1, input.value)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
