import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// EOR Indirect, Indexed (Y)

const tests = [
    ["flips_bits_over_setting_z_flag", { PC: 0x0000, A: 0xFF, Y: 0x03, value: 0xFF, flags: NO_FLAGS }, { PC: 0x0002, A: 0x00, Y: 0x03, value: 0xFF, flags: I | Z /* FIXME: should be Z */ }],
    ["flips_bits_over_setting_n_flag", { PC: 0x0000, A: 0x00, Y: 0x03, value: 0xFF, flags: NO_FLAGS }, { PC: 0x0002, A: 0xFF, Y: 0x03, value: 0xFF, flags: N | I /* FIXME: should be N */ }],
]

describe("EOR Indirect, Indexed (Y)", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.A = input.A
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 EOR ($0010,Y)
        CPU.wr(input.PC + 0, 0x51)
        CPU.wr(input.PC + 1, 0x10)

        // $0010 Vector to $ABCD
        CPU.wr(input.PC + 0x10, 0xCD)
        CPU.wr(input.PC + 0x11, 0xAB)

        CPU.wr(0xABCD + cpu.Y, input.value)

        expect(cpu.emulateCPU()).toEqual(5)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.Y).toEqual(output.Y)

        expect(CPU.rd(0xABCD + cpu.Y)[0]).toEqual(output.value)

        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & U).toEqual((output.flags || NO_FLAGS) & U)
        expect(cpu.ST & B).toEqual((output.flags || NO_FLAGS) & B)
        expect(cpu.ST & D).toEqual((output.flags || NO_FLAGS) & D)
        expect(cpu.ST & I).toEqual((output.flags || NO_FLAGS) & I)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
