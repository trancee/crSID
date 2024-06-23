import { B, C, CPU, D, I, IRQ, N, NO_FLAGS, U, V, Z } from "../../src/CPU"

// PHP

const tests = [
    ["pushes_processor_status_and_updates_sp", { PC: 0x0000, flags: U | B }, { PC: 0x0001, SP: 0xFE, flags: U | B | I }],
]

describe("PHP", () => {
    const PCH = 0x01FF

    test.each(tests)("%s", (_, input: any, output: any) => {
        for (let flags = 0x00; flags <= 0xFF; flags++) {
            const cpu = new CPU(input.PC)

            if (input.flags) {
                if (input.flags > NO_FLAGS) cpu.ST |= (flags | input.flags)
                if (input.flags < NO_FLAGS) cpu.ST &= (flags | input.flags)
            }

            // $0000 PHP
            CPU.wr(input.PC + 0, 0x08)

            expect(cpu.emulateCPU()).toEqual(3)
            expect(cpu.PC).toEqual(output.PC)
            expect(cpu.SP).toEqual(output.SP)

            expect(CPU.rd(PCH)[0]).toEqual((flags | output.flags))
        }
    })
})
