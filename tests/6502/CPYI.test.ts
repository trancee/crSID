import { C, CPU, D, N, NO_FLAGS, V, Z } from "../../src/CPU"

// CPY Immediate

const tests = [
    ["imm_sets_zero_carry_clears_neg_flags_if_equal", { Y: 0x30, value: 0x30, flags: NO_FLAGS }, { Y: 0x30, flags: Z | C }],
]

describe("CPY Immediate", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 CPY #$30

        CPU.wr(0x0000, 0xC0)
        CPU.wr(0x0001, input.value)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0002)

        expect(cpu.Y).toEqual(output.Y)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
