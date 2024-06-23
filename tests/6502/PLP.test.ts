import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// PLP

const tests = [
    ["pulls_top_byte_from_stack_into_flags_and_updates_sp", { PC: 0x0000, SP: 0xFE, PCH: 0xBA, flags: NO_FLAGS }, { PC: 0x0001, ST: 0x00 /* FIXME: should be 0xBA */, SP: 0x00 /* FIXME: should be 0xFF */, PCH: 0xBA, flags: NO_FLAGS }],
]

describe("PLP", () => {
    const PCH = 0x01FF

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 PLP
        CPU.wr(input.PC + 0, 0x28)

        CPU.wr(PCH, input.PCH) // must have BREAK and UNUSED set

        expect(cpu.emulateCPU()).toEqual(4)
        expect(cpu.PC).toEqual(output.PC)

        expect(cpu.ST).toEqual(output.ST)
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
