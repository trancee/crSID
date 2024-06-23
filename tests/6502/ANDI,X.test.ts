import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// AND Indirect, Indexed (X)

const tests = [
    ["all_zeros_setting_zero_flag", { A: 0xFF, X: 0x03, value: 0x00, flags: NO_FLAGS }, { A: 0x00, flags: Z }],
    ["zeros_and_ones_setting_negative_flag", { A: 0xFF, X: 0x03, value: 0xAA, flags: NO_FLAGS }, { A: 0xAA, flags: N }],
]

describe("AND Indirect, Indexed (X)", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 AND ($0010,X)

        CPU.wr(0x0000, 0x21)
        CPU.wr(0x0001, 0x10)

        // $0013 Vector to $ABCD

        CPU.wr(0x0013, 0xCD)
        CPU.wr(0x0014, 0xAB)

        CPU.wr(0xABCD, input.value)

        expect(cpu.emulateCPU()).toEqual(6)
        expect(cpu.PC).toEqual(0x0002)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
