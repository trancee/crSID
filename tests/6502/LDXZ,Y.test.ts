import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// LDX Zero Page, Y-Indexed

const tests = [
    ["loads_a_sets_n_flag", { PC: 0x0000, X: 0x00, Y: 0x03, value: 0x80, flags: NO_FLAGS }, { PC: 0x0002, X: 0x80, Y: 0x03, value: 0x80, flags: N | I }],
    ["loads_a_sets_z_flag", { PC: 0x0000, X: 0xFF, Y: 0x03, value: 0x00, flags: NO_FLAGS }, { PC: 0x0002, X: 0x00, Y: 0x03, value: 0x00, flags: I | Z }],
]

describe("LDX Zero Page, Y-Indexed", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.X = input.X
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 LDX $0010,Y

        CPU.wr(input.PC + 0, 0xB6)
        CPU.wr(input.PC + 1, 0x10)

        CPU.wr(0x0010 + cpu.Y, input.value)

        expect(cpu.emulateCPU()).toEqual(4)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.X).toEqual(output.X)
        expect(cpu.Y).toEqual(output.Y)

        expect(CPU.rd(0x0010 + cpu.Y)[0]).toEqual(output.value)

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
