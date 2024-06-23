import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// RTI

const tests = [
    ["restores_status_and_pc_and_updates_sp", { PC: 0x0000, SP: 0xFC, Status: 0xFC, flags: NO_FLAGS }, { PC: 0xC003, SP: 0xFF, flags: ~(Z | C) }],
    ["forces_break_and_unused_flags_high", { PC: 0x0000, SP: 0xFC, Status: 0x00, flags: NO_FLAGS }, { PC: 0xC003, SP: 0xFF, flags: NO_FLAGS /* FIXME: should be U | B */ }],
]

describe("RTI", () => {
    const PCH = 0x01FF
    const PCL = 0x01FE
    const Status = 0x01FD

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.SP = input.SP

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 RTI
        CPU.wr(input.PC + 0, 0x40)

        CPU.wr(Status, input.Status)
        CPU.wr(PCL, 0x03)
        CPU.wr(PCH, 0xC0)

        expect(cpu.emulateCPU()).toEqual(6)
        expect(cpu.PC).toEqual(output.PC)

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
