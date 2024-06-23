import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// TAY

const tests = [
    ["transfers_accumulator_into_y", { PC: 0x0000, A: 0xAB, Y: 0x00, flags: NO_FLAGS }, { PC: 0x0001, A: 0xAB, Y: 0xAB, flags: N }],
    ["sets_negative_flag", { PC: 0x0000, A: 0x80, Y: 0x00, flags: ~N }, { PC: 0x0001, A: 0x80, Y: 0x80, flags: N }],
    ["sets_zero_flag", { PC: 0x0000, A: 0x00, Y: 0xFF, flags: ~Z }, { PC: 0x0001, A: 0x00, Y: 0x00, flags: Z }],
]

describe("TAY", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.A = input.A
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 TAY
        CPU.wr(input.PC + 0, 0xA8)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.Y).toEqual(output.Y)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
