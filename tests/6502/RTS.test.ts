import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// RTS

const tests = [
    ["restores_pc_and_increments_then_updates_sp", { PC: 0x0000, SP: 0xFD, PCH: 0xC0, PCL: 0x03, flags: NO_FLAGS }, { PC: 0xC004, SP: 0xFF, flags: I }],
    ["wraps_around_top_of_memory", { PC: 0x1000, SP: 0xFD, PCH: 0xFF, PCL: 0xFF, flags: NO_FLAGS }, { PC: 0x0000, SP: 0xFF, flags: I }],
]

describe("RTS", () => {
    const PCH = 0x01FF
    const PCL = 0x01FE

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU(input.PC)
        cpu.SP = input.SP

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 RTS
        CPU.wr(input.PC + 0, 0x60)

        CPU.wr(PCL, input.PCL)
        CPU.wr(PCH, input.PCH)

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
