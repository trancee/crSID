import { C, CPU, D, N, NO_FLAGS, V, Z } from "../../src/CPU"

// CPX Immediate

const tests = [
    ["imm_sets_zero_carry_clears_neg_flags_if_equal", { X: 0x20, value: 0x20, flags: NO_FLAGS }, { X: 0x20, flags: Z | C }],
]

describe("CPX Immediate", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 CPX #$20

        CPU.wr(0x0000, 0xE0)
        CPU.wr(0x0001, input.value)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0002)

        expect(cpu.X).toEqual(output.X)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
