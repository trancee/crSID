import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// INC Absolute

const tests = [
    ["increments_memory", { PC: 0x0000, value: 0x09, flags: NO_FLAGS }, { PC: 0x0003, value: 0x0A, flags: I }],
    ["increments_memory_rolls_over_and_sets_zero_flag", { PC: 0x0000, value: 0xFF, flags: NO_FLAGS }, { PC: 0x0003, value: 0x00, flags: I | Z }],
    ["sets_negative_flag_when_incrementing_above_7F", { PC: 0x0000, value: 0x7F, flags: NO_FLAGS }, { PC: 0x0003, value: 0x80, flags: N | I }],
]

describe("INC Absolute", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 INC

        CPU.wr(input.PC + 0, 0xEE)
        CPU.wr(input.PC + 1, 0xCD)
        CPU.wr(input.PC + 2, 0xAB)

        CPU.wr(0xABCD, input.value)

        expect(cpu.emulateCPU()).toEqual(6)
        expect(cpu.PC).toEqual(output.PC)

        expect(CPU.rd(0xABCD)[0]).toEqual(output.value)

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
