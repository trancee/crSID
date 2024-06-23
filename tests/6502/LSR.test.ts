import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// LSR Accumulator

const tests = [
    ["rotates_in_zero_not_carry", { PC: 0x0000, A: 0x00, flags: C }, { PC: 0x0001, A: 0x00, flags: Z }],
    ["sets_carry_and_zero_flags_after_rotation", { PC: 0x0000, A: 0x01, flags: ~C }, { PC: 0x0001, A: 0x00, flags: Z | C }],
    ["rotates_bits_right", { PC: 0x0000, A: 0x04, flags: C }, { PC: 0x0001, A: 0x02, flags: NO_FLAGS }],
]

describe("LSR Accumulator", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 LSR A
        CPU.wr(0x0000, 0x4A)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
