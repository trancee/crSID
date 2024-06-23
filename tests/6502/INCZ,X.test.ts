import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// INC Zero Page, X-Indexed

const tests = [
    ["increments_memory", { PC: 0x0000, X: 0x03, value: 0x09, flags: NO_FLAGS }, { PC: 0x0002, X: 0x03, value: 0x0A, flags: I }],
    ["increments_memory_rolls_over_and_sets_zero_flag", { PC: 0x0000, X: 0x03, value: 0xFF, flags: NO_FLAGS }, { PC: 0x0002, X: 0x03, value: 0x00, flags: I | Z }],
    ["sets_negative_flag_when_incrementing_above_7F", { PC: 0x0000, X: 0x03, value: 0x7F, flags: NO_FLAGS }, { PC: 0x0002, X: 0x03, value: 0x80, flags: N | I }],
]

describe("INC Zero Page, X-Indexed", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 INC

        CPU.wr(input.PC + 0, 0xF6)
        CPU.wr(input.PC + 1, 0x10)

        CPU.wr(0x0010 + cpu.X, input.value)

        expect(cpu.emulateCPU()).toEqual(6)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.X).toEqual(output.X)

        expect(CPU.rd(0x0010 + cpu.X)[0]).toEqual(output.value)

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
