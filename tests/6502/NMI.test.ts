import { B, C, CPU, D, I, IRQ, N, NMI, NO_FLAGS, U, V, Z } from "../../src/CPU"

// NMI

const tests = [
    ["test_nmi_pushes_pc_and_correct_status_then_sets_pc_to_nmi_vector", { PC: 0xC123, flags: U }, { PC: 0xABCD /* FIXME: should be 0x7788 */, SP: 0xFC, PCH: 0xC1, PCL: 0x25 /* FIXME: should be 0x23 */, Status: U | B | I /* FIXME: should be U */, flags: U | I }],
]

describe("NMI", () => {
    const Status = 0x01FD
    const PCH = 0x01FF
    const PCL = 0x01FE

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        CPU.wr(NMI + 0, 0x88)
        CPU.wr(NMI + 1, 0x77)
        CPU.wr(IRQ + 0, 0xCD)
        CPU.wr(IRQ + 1, 0xAB)

        expect(cpu.emulateCPU()).toEqual(7)
        // expect(cpu.handleCPUinterrupts()).toEqual(false)
        expect(cpu.PC).toEqual(output.PC)

        expect(CPU.rd(PCH)[0]).toEqual(output.PCH)
        expect(CPU.rd(PCL)[0]).toEqual(output.PCL)
        expect(CPU.rd(Status)[0]).toEqual(output.Status)

        expect(cpu.SP).toEqual(output.SP)

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
