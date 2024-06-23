import { C, CPU, D, N, NO_FLAGS, V, Z } from "../../src/CPU"

// CMP Immediate

const tests = [
    ["imm_sets_zero_carry_clears_neg_flags_if_equal", { A: 0x0A, value: 0x0A, flags: NO_FLAGS }, { A: 0x0A, flags: Z | C }],
    ["imm_clears_zero_carry_takes_neg_if_less_unsigned", { A: 0x01, value: 0x0A, flags: NO_FLAGS }, { A: 0x01, flags: N }],
    ["imm_clears_zero_sets_carry_takes_neg_if_less_signed", { A: 0xFF, value: 0x01, flags: NO_FLAGS }, { A: 0xFF, flags: N | C }],
    ["imm_clears_zero_carry_takes_neg_if_less_signed_nega", { A: 0xFE, value: 0xFF, flags: NO_FLAGS }, { A: 0xFE, flags: N }],
    ["imm_clears_zero_sets_carry_takes_neg_if_more_unsigned", { A: 0x0A, value: 0x01, flags: NO_FLAGS }, { A: 0x0A, flags: C }],
    ["imm_clears_zero_carry_takes_neg_if_more_signed", { A: 0x02, value: 0xFF, flags: NO_FLAGS }, { A: 0x02, flags: NO_FLAGS }],
    ["imm_clears_zero_carry_takes_neg_if_more_signed_nega", { A: 0xFF, value: 0xFE, flags: NO_FLAGS }, { A: 0xFF, flags: C }],
]

describe("CMP Immediate", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 CMP #10

        CPU.wr(0x0000, 0xC9)
        CPU.wr(0x0001, input.value)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0002)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
