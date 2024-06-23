import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// LDY Zero Page

const tests = [
    ["loads_x_sets_n_flag", { PC: 0x0000, Y: 0x00, value: 0x80, flags: NO_FLAGS }, { PC: 0x0002, Y: 0x80, value: 0x80, flags: N | I }],
    ["loads_x_sets_z_flag", { PC: 0x0000, Y: 0xFF, value: 0x00, flags: NO_FLAGS }, { PC: 0x0002, Y: 0x00, value: 0x00, flags: I | Z }],
]

describe("LDY Zero Page", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 LDY $0010

        CPU.wr(input.PC + 0, 0xA4)
        CPU.wr(input.PC + 1, 0x10)

        CPU.wr(0x0010, input.value)

        expect(cpu.emulateCPU()).toEqual(3)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.Y).toEqual(output.Y)

        expect(CPU.rd(0x0010)[0]).toEqual(output.value)

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
