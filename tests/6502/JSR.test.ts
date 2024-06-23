import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// JSR

const tests = [
    ["pushes_pc_plus_2_and_sets_pc", { PC: 0xC000, flags: NO_FLAGS }, { PC: 0xFFD2, SP: 0xFD, PCH: 0xC0, PCL: 0x02, flags: I }],
]

describe("JSR", () => {
    const PCH = 0x01FF
    const PCL = 0x01FE

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $C000 JSR $FFD2

        CPU.wr(input.PC + 0, 0x20)
        CPU.wr(input.PC + 1, 0xD2)
        CPU.wr(input.PC + 2, 0xFF)

        expect(cpu.emulateCPU()).toEqual(6)
        expect(cpu.PC).toEqual(output.PC)
        expect(cpu.SP).toEqual(output.SP)

        expect(CPU.rd(PCH)[0]).toEqual(output.PCH)
        expect(CPU.rd(PCL)[0]).toEqual(output.PCL)

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
