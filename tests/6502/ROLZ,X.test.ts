import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// ROL Zero Page, X-Indexed

const tests = [
    ["zero_and_carry_zero_sets_z_flag", { PC: 0x0000, X: 0x03, value: 0x00, flags: ~C }, { PC: 0x0002, X: 0x03, value: 0x00, flags: Z }],
    ["80_and_carry_zero_sets_z_flag", { PC: 0x0000, X: 0x03, value: 0x80, flags: ~(Z | C) }, { PC: 0x0002, X: 0x03, value: 0x00, flags: Z | C }],
    ["zero_and_carry_one_clears_z_flag", { PC: 0x0000, X: 0x03, value: 0x00, flags: C }, { PC: 0x0002, X: 0x03, value: 0x01, flags: NO_FLAGS }],
    ["sets_n_flag", { PC: 0x0000, X: 0x03, value: 0x40, flags: C }, { PC: 0x0002, X: 0x03, value: 0x81, flags: N }],
    ["shifts_out_zero", { PC: 0x0000, X: 0x03, value: 0x7F, flags: ~C }, { PC: 0x0002, X: 0x03, value: 0xFE, flags: N }],
    ["shifts_out_one", { PC: 0x0000, X: 0x03, value: 0xFF, flags: ~C }, { PC: 0x0002, X: 0x03, value: 0xFE, flags: N | C }],
]

describe("ROL Zero Page, X-Indexed", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 ROL $0010,X
        CPU.wr(input.PC + 0, 0x36)
        CPU.wr(input.PC + 1, 0x10)

        CPU.wr(0x0010 + cpu.X, input.value)

        expect(cpu.emulateCPU()).toEqual(6)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.X).toEqual(output.X)

        expect(CPU.rd(0x0010 + cpu.X)[0]).toEqual(output.value)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
