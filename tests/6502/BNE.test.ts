import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// BNE

const tests = [
    ["zero_clear_branches_relative_forward", { PC: 0x0000, value: 0x06, flags: ~Z }, { value: 0x06, flags: NO_FLAGS }],
    ["zero_clear_branches_relative_backward", { PC: 0x0050, value: -0x06, flags: ~Z }, { value: -0x06, flags: NO_FLAGS }],
    ["zero_set_does_not_branch", { PC: 0x0000, value: 0x06, flags: Z }, { value: 0x00, flags: Z }],
]

describe("BNE", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 BNE +6
        // $0050 BNE -6

        CPU.wr(input.PC + 0, 0xD0)
        CPU.wr(input.PC + 1, input.value)

        expect(cpu.emulateCPU()).toEqual((input.flags > NO_FLAGS) ? 2 : 3)
        expect(cpu.PC).toEqual(input.PC + 2 + output.value)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
