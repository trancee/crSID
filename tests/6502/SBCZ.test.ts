import { C, CPU, D, N, NO_FLAGS, V, Z } from "../../src/CPU"

// SBC Zero Page

const tests = [
    ["all_zeros_and_no_borrow_is_zero", { PC: 0x0000, A: 0x00, value: 0x00, flags: C }, { PC: 0x0002, A: 0x00, value: 0x00, flags: Z | C }],
    ["downto_zero_no_borrow_sets_z_clears_n", { PC: 0x0000, A: 0x01, value: 0x01, flags: C }, { PC: 0x0002, A: 0x00, value: 0x01, flags: Z | C }],
    ["downto_zero_with_borrow_sets_z_clears_n", { PC: 0x0000, A: 0x01, value: 0x00, flags: ~(D | C) }, { PC: 0x0002, A: 0x00, value: 0x00, flags: Z | C }],
    ["downto_four_with_borrow_clears_z_n", { PC: 0x0000, A: 0x07, value: 0x02, flags: ~(D | C) }, { PC: 0x0002, A: 0x04, value: 0x02, flags: C }],
]

describe("SBC Zero Page", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 SBC $10
        CPU.wr(input.PC + 0, 0xE5)
        CPU.wr(input.PC + 1, 0x10)

        CPU.wr(0x0010, input.value)

        expect(cpu.emulateCPU()).toEqual(3)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)

        expect(CPU.rd(0x0010)[0]).toEqual(output.value)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
