import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// ROR Accumulator

const tests = [
    ["zero_and_carry_zero_sets_z_flag", { PC: 0x0000, A: 0x00, flags: ~C }, { PC: 0x0001, A: 0x00, flags: Z }],
    ["zero_and_carry_one_rotates_in_sets_n_flags", { PC: 0x0000, A: 0x00, flags: C }, { PC: 0x0001, A: 0x80, flags: N }],
    ["shifts_out_zero", { PC: 0x0000, A: 0x02, flags: C }, { PC: 0x0001, A: 0x81, flags: N }],
    ["shifts_out_one", { PC: 0x0000, A: 0x03, flags: C }, { PC: 0x0001, A: 0x81, flags: N | C }],
]

describe("ROR Accumulator", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 ROR A
        CPU.wr(input.PC + 0, 0x6A)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
