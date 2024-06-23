import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// ORA Zero Page, X

const tests = [
    ["zeroes_or_zeros_sets_z_flag", { PC: 0x0000, A: 0x00, X: 0x00, value: 0x00, flags: ~Z }, { PC: 0x0002, A: 0x00, X: 0x00, value: 0x00, flags: Z }],
    ["turns_bits_on_sets_n_flag", { PC: 0x0000, A: 0x03, X: 0x03, value: 0x82, flags: ~N }, { PC: 0x0002, A: 0x83, X: 0x03, value: 0x82, flags: N }],
]

describe("ORA Zero Page, X", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.A = input.A
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 ORA $0010,X
        CPU.wr(input.PC + 0, 0x15)
        CPU.wr(input.PC + 1, 0x10)

        CPU.wr(0x0010 + cpu.X, input.value)

        expect(cpu.emulateCPU()).toEqual(4)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.X).toEqual(output.X)

        expect(CPU.rd(0x0010 + cpu.X)[0]).toEqual(output.value)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
