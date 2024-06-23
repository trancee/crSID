import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// DEY

const tests = [
    ["decrements_y", { PC: 0x0000, Y: 0x10, flags: NO_FLAGS }, { PC: 0x0001, Y: 0x0F, flags: I }],
    ["below_00_rolls_over_and_sets_negative_flag", { PC: 0x0000, Y: 0x00, flags: NO_FLAGS }, { PC: 0x0001, Y: 0xFF, flags: N | I }],
    ["sets_zero_flag_when_decrementing_to_zero", { PC: 0x0000, Y: 0x01, flags: NO_FLAGS }, { PC: 0x0001, Y: 0x00, flags: I | Z }],
]

describe("DEY", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 DEY

        CPU.wr(0x0000, 0x88)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.Y).toEqual(output.Y)

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
