import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// LSR Zero Page, X-Indexed

const tests = [
    ["rotates_in_zero_not_carry", { PC: 0x0000, X: 0x03, value: 0x00, flags: C }, { PC: 0x0002, X: 0x03, value: 0x00, flags: I | Z }],
    ["sets_carry_and_zero_flags_after_rotation", { PC: 0x0000, X: 0x03, value: 0x01, flags: ~C }, { PC: 0x0002, X: 0x03, value: 0x00, flags: I | Z | C }],
    ["rotates_bits_right", { PC: 0x0000, X: 0x03, value: 0x04, flags: ~C }, { PC: 0x0002, X: 0x03, value: 0x02, flags: I }],
]

describe("LSR Zero Page, X-Indexed", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.X = input.X

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 LSR $ABCD,X
        CPU.wr(input.PC + 0, 0x56)
        CPU.wr(input.PC + 1, 0x10)

        CPU.wr(0x0010 + cpu.X, input.value)

        expect(cpu.emulateCPU()).toEqual(6)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.X).toEqual(output.X)

        expect(CPU.rd(0x0010 + cpu.X)[0]).toEqual(output.value)

        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & U).toEqual((output.flags || NO_FLAGS) & U)
        expect(cpu.ST & B).toEqual((output.flags || NO_FLAGS) & B)
        expect(cpu.ST & D).toEqual((output.flags || NO_FLAGS) & D)
        expect(cpu.ST & I).toEqual((output.flags || NO_FLAGS) & I)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })

    test.each([
        ["does_not_page_wrap", { PC: 0x0000, A: 0x00, Y: 0xFF, value: 0x42, flags: NO_FLAGS }, { PC: 0x0003, A: 0x42, Y: 0xFF, value: 0x42, flags: I }],
    ])("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.A = input.A
        cpu.Y = input.Y

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 LDA $0080,Y

        CPU.wr(input.PC + 0, 0xB9)
        CPU.wr(input.PC + 1, 0x80)
        CPU.wr(input.PC + 2, 0x00)

        CPU.wr(0x0080 + cpu.Y, input.value)

        expect(cpu.emulateCPU()).toEqual(5)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.Y).toEqual(output.Y)

        expect(CPU.rd(0x0080 + cpu.Y)[0]).toEqual(output.value)

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
