import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// LDX Immediate

const tests = [
    ["loads_a_sets_n_flag", { PC: 0x0000, X: 0x00, value: 0x80, flags: NO_FLAGS }, { PC: 0x0002, X: 0x80, flags: N | I }],
    ["loads_a_sets_z_flag", { PC: 0x0000, X: 0xFF, value: 0x00, flags: NO_FLAGS }, { PC: 0x0002, X: 0x00, flags: I | Z }],
]

describe("LDX Immediate", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 LDX #$80
        CPU.wr(input.PC + 0, 0xA2)
        CPU.wr(input.PC + 1, input.value)

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
