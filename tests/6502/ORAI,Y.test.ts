import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// ORA Indirect, Indexed (Y)

const tests = [
    ["zeroes_or_zeros_sets_z_flag", { PC: 0x0000, A: 0x00, Y: 0x03, value: 0x00, flags: ~Z }, { PC: 0x0002, A: 0x00, Y: 0x03, value: 0x00, flags: Z }],
    ["turns_bits_on_sets_n_flag", { PC: 0x0000, A: 0x03, Y: 0x03, value: 0x82, flags: ~N }, { PC: 0x0002, A: 0x83, Y: 0x03, value: 0x82, flags: N }],
]

describe("ORA Indirect, Indexed (Y)", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.A = input.A
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 ORA ($0010),Y
        CPU.wr(input.PC + 0, 0x11)
        CPU.wr(input.PC + 1, 0x10)

        // $0010 Vector to $ABCD
        CPU.wr(0x0010 + 0, 0xCD)
        CPU.wr(0x0010 + 1, 0xAB)

        CPU.wr(0xABCD + cpu.Y, input.value)

        expect(cpu.emulateCPU()).toEqual(5)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.Y).toEqual(output.Y)

        expect(CPU.rd(0xABCD + cpu.Y)[0]).toEqual(output.value)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
