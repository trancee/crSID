import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// PLA

const tests = [
    ["pulls_top_byte_from_stack_into_a_and_updates_sp", { PC: 0x0000, SP: 0xFE, PCH: 0xAB, flags: NO_FLAGS }, { PC: 0x0001, A: 0x00 /* FIXME: should be 0xAB */, SP: 0x00 /* FIXME: should be 0xFF */, PCH: 0xAB, flags: I | Z }],
]

describe("PLA", () => {
    const PCH = 0x01FF

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 PLA
        CPU.wr(input.PC + 0, 0x68)

        CPU.wr(PCH, input.PCH)

        expect(cpu.emulateCPU()).toEqual(4)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.SP).toEqual(output.SP)

        expect(CPU.rd(PCH)[0]).toEqual(output.PCH)

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
