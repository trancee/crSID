import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// BRK

const tests = [
    ["test_brk_pushes_pc_plus_2_and_status_then_sets_pc_to_irq_vector", { PC: 0xC000, value: 0x00, flags: NO_FLAGS }, { PC: 0xABCD, SP: 0xFC, PCH: 0xC0, PCL: 0x02, Status: B | I /* FIXME: should be B | U */, flags: I /* FIXME: should be B | I */ }],
]

describe("BRK", () => {
    const Status = 0x01FD
    const PCH = 0x01FF
    const PCL = 0x01FE

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $C000 BRK

        CPU.wr(IRQ + 0, 0xCD)
        CPU.wr(IRQ + 1, 0xAB)

        CPU.wr(input.PC, input.value)

        expect(cpu.emulateCPU()).toEqual(7)
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

    it("test_brk_interrupt", () => {
        const cpu = new CPU()

        /// Preparation

        cpu.ST = 0x00

        CPU.wr(0xFFFE, 0x00); CPU.wr(0xFFFF, 0x04)

        // LDA #$01
        CPU.wr(0x0000, 0xA9); CPU.wr(0x0001, 0x01)

        CPU.wr(0x0002, 0x00) // BRK

        CPU.wr(0x0003, 0xEA) // NOP
        CPU.wr(0x0004, 0xEA) // NOP
        CPU.wr(0x0005, 0xEA) // NOP

        // LDA #$03
        CPU.wr(0x0006, 0xA9); CPU.wr(0x0007, 0x03)

        // LDA #$02
        CPU.wr(0x0400, 0xA9); CPU.wr(0x0401, 0x02)
        CPU.wr(0x0402, 0x40) // RTI

        /// Execution

        // LDA #$01
        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0002)
        expect(cpu.A).toEqual(0x01)

        // BRK
        expect(cpu.emulateCPU()).toEqual(7)
        expect(cpu.PC).toEqual(0x0400)

        // LDA #$02
        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0402)
        expect(cpu.A).toEqual(0x02)

        // RTI
        expect(cpu.emulateCPU()).toEqual(6)
        expect(cpu.PC).toEqual(0x0004)

        // NOP
        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0005)

        // NOP
        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0006)

        // LDA #$03
        expect(cpu.emulateCPU()).toEqual(2)
        expect(cpu.PC).toEqual(0x0008)
        expect(cpu.A).toEqual(0x03)
    })
})
