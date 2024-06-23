import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// LSR Zero Page

const tests = [
    ["rotates_in_zero_not_carry", { PC: 0x0000, value: 0x00, flags: C }, { PC: 0x0002, value: 0x00, flags: Z }],
    ["sets_carry_and_zero_flags_after_rotation", { PC: 0x0000, value: 0x01, flags: ~C }, { PC: 0x0002, value: 0x00, flags: Z | C }],
    ["rotates_bits_right", { PC: 0x0000, value: 0x04, flags: C }, { PC: 0x0002, value: 0x02, flags: NO_FLAGS }],
]

describe("LSR Zero Page", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 LSR $0010
        CPU.wr(input.PC + 0, 0x46)
        CPU.wr(input.PC + 1, 0x10)

        CPU.wr(0x0010, input.value)

        expect(cpu.emulateCPU()).toEqual(5)
        expect(cpu.PC).toEqual(output.PC)

        expect(CPU.rd(0x0010)[0]).toEqual(output.value)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
