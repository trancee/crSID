import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// ASL Absolute, X-Indexed

const tests = [
    ["sets_z_flag", { A: 0x00, X: 0x03, value: 0x00, flags: NO_FLAGS }, { A: 0x00, value: 0x00, flags: Z }],
    ["sets_n_flag", { A: 0x00, X: 0x03, value: 0x40, flags: NO_FLAGS }, { A: 0x00, value: 0x80, flags: N }],
    ["shifts_out_zero", { A: 0xAA, X: 0x03, value: 0x7F, flags: NO_FLAGS }, { A: 0xAA, value: 0xFE, flags: N }],
    ["shifts_out_one", { A: 0xAA, X: 0x03, value: 0xFF, flags: NO_FLAGS }, { A: 0xAA, value: 0xFE, flags: N | C }],
]

describe("ASL Absolute, X-Indexed", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 ASL $ABCD,X

        CPU.wr(0x0000, 0x1E)
        CPU.wr(0x0001, 0xCD)
        CPU.wr(0x0002, 0xAB)

        CPU.wr(0xABCD + cpu.X, input.value)

        expect(cpu.emulateCPU()).toEqual(7)
        expect(cpu.PC).toEqual(0x0003)

        expect(CPU.rd(0xABCD + cpu.X)[0]).toEqual(output.value)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
