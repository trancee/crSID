import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// TSX

const tests = [
    ["transfers_stack_pointer_into_x", { PC: 0x0000, SP: 0xAB, X: 0x00, flags: NO_FLAGS }, { PC: 0x0001, SP: 0xAB, X: 0xAB, flags: N }],
    ["sets_negative_flag", { PC: 0x0000, SP: 0x80, X: 0x00, flags: ~N }, { PC: 0x0001, SP: 0x80, X: 0x80, flags: N }],
    ["sets_zero_flag", { PC: 0x0000, SP: 0x00, X: 0xFF, flags: ~Z }, { PC: 0x0001, SP: 0x00, X: 0x00, flags: Z }],
]

describe("TSX", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.SP = input.SP
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 TSX
        CPU.wr(input.PC + 0, 0xBA)

        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.SP).toEqual(output.SP)
        expect(cpu.X).toEqual(output.X)

        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
