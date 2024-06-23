import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// ASL Accumulator

const tests = [
    ["sets_z_flag", { A: 0x00, flags: NO_FLAGS }, { A: 0x00, flags: Z }],
    ["sets_n_flag", { A: 0x40, flags: NO_FLAGS }, { A: 0x80, flags: N }],
    ["shifts_out_zero", { A: 0x7F, flags: NO_FLAGS }, { A: 0xFE, flags: N }],
    ["shifts_out_one", { A: 0xFF, flags: NO_FLAGS }, { A: 0xFE, flags: N | C }],
    ["80_sets_z_flag", { A: 0x80, flags: ~Z }, { A: 0x00, flags: Z | C }],
]

describe("ASL Accumulator", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 ASL A

        CPU.wr(0x0000, 0x0A)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0001)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
