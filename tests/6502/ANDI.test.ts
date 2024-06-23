import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// AND (Immediate)

const tests = [
    ["all_zeros_setting_zero_flag", { A: 0xFF, value: 0x00, flags: NO_FLAGS }, { A: 0x00, flags: Z }],
    ["zeros_and_ones_setting_negative_flag", { A: 0xFF, value: 0xAA, flags: NO_FLAGS }, { A: 0xAA, flags: N }],
]

describe("AND (Immediate)", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 AND #$00

        CPU.wr(0x0000, 0x29)
        CPU.wr(0x0001, input.value)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0002)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
