import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// STY Zero Page, X-Indexed

const tests = [
    ["stores_x_leaves_x_and_n_flag_unchanged", { PC: 0x0000, X: 0x03, Y: 0xFF, value: 0x00, flags: ~N }, { PC: 0x0002, X: 0x03, Y: 0xFF, value: 0xFF, flags: I }],
    ["stores_a_leaves_a_and_z_flag_unchanged", { PC: 0x0000, X: 0x03, Y: 0x00, value: 0xFF, flags: ~Z }, { PC: 0x0002, X: 0x03, Y: 0x00, value: 0x00, flags: I }],
]

describe("STY Zero Page, X-Indexed", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.X = input.X
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 STY $0010,X
        CPU.wr(input.PC + 0, 0x94)
        CPU.wr(input.PC + 1, 0x10)

        CPU.wr(0x0010 + cpu.X, input.value)

        expect(cpu.emulateCPU()).toEqual(4)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.Y).toEqual(output.Y)
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
