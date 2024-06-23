import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// BCC

const tests = [
    ["carry_clear_branches_relative_forward", { PC: 0x0000, value: 0x06, flags: ~C }, { value: 0x06, flags: NO_FLAGS }],
    ["carry_clear_branches_relative_backward", { PC: 0x0050, value: -0x06, flags: ~C }, { value: -0x06, flags: NO_FLAGS }],
    ["carry_set_does_not_branch", { PC: 0x0000, value: 0x06, flags: C }, { value: 0x00, flags: C }],
]

describe("BCC", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 BCC +6
        // $0000 BCC -6

        CPU.wr(input.PC + 0, 0x90)
        CPU.wr(input.PC + 1, input.value)

        expect(cpu.emulateCPU()).toEqual((input.flags > NO_FLAGS) ? 2 : 3)
        expect(cpu.PC).toEqual(input.PC + 2 + output.value)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
