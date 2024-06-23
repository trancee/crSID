import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// AND (Absolute, X-Indexed)

const tests = [
    ["all_zeros_setting_zero_flag", { A: 0xFF, X: 0x03, value: 0x00, flags: NO_FLAGS }, { A: 0x00, flags: Z }],
    ["zeros_and_ones_setting_negative_flag", { A: 0xFF, X: 0x03, value: 0xAA, flags: NO_FLAGS }, { A: 0xAA, flags: N }],
]

describe("AND (Absolute, X-Indexed)", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 AND $ABCD,X

        CPU.wr(0x0000, 0x3D)
        CPU.wr(0x0001, 0xCD)
        CPU.wr(0x0002, 0xAB)

        CPU.wr(0xABCD + cpu.X, input.value)

        expect(cpu.emulateCPU()).toEqual(4)
        expect(cpu.PC).toEqual(0x0003)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
