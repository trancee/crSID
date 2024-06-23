import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// INX

const tests = [
    ["increments_x", { PC: 0x0000, X: 0x09, flags: NO_FLAGS }, { PC: 0x0001, X: 0x0A, flags: I }],
    ["above_FF_rolls_over_and_sets_zero_flag", { PC: 0x0000, X: 0xFF, flags: NO_FLAGS }, { PC: 0x0001, X: 0x00, flags: I | Z }],
    ["sets_negative_flag_when_incrementing_above_7F", { PC: 0x0000, X: 0x7F, flags: NO_FLAGS }, { PC: 0x0001, X: 0x80, flags: N | I }],
]

describe("INX", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 INX

        CPU.wr(0x0000, 0xE8)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.X).toEqual(output.X)

        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & U).toEqual((output.flags || NO_FLAGS) & U)
        expect(cpu.ST & B).toEqual((output.flags || NO_FLAGS) & B)
        expect(cpu.ST & D).toEqual((output.flags || NO_FLAGS) & D)
        expect(cpu.ST & I).toEqual((output.flags || NO_FLAGS) & I)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
