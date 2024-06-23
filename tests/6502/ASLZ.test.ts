import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// ASL Zero Page

const tests = [
    ["sets_z_flag", { A: 0x00, value: 0x00, flags: NO_FLAGS }, { A: 0x00, value: 0x00, flags: Z }],
    ["sets_n_flag", { A: 0x00, value: 0x40, flags: NO_FLAGS }, { A: 0x00, value: 0x80, flags: N }],
    ["shifts_out_zero", { A: 0xAA, value: 0x7F, flags: NO_FLAGS }, { A: 0xAA, value: 0xFE, flags: N }],
    ["shifts_out_one", { A: 0xAA, value: 0xFF, flags: NO_FLAGS }, { A: 0xAA, value: 0xFE, flags: N | C }],
]

describe("ASL Zero Page", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 ASL $0010

        CPU.wr(0x0000, 0x06)
        CPU.wr(0x0001, 0x10)

        CPU.wr(0x0010, input.value)

        expect(cpu.emulateCPU()).toEqual(5)
        expect(cpu.PC).toEqual(0x0002)

        expect(CPU.rd(0x0010)[0]).toEqual(output.value)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
