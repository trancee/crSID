import { CPU, I } from "../../src/CPU"

describe("Reset", () => {
    it("test_reset_sets_registers_to_initial_states", () => {
        const cpu = new CPU()

        expect(cpu.A).toEqual(0)
        expect(cpu.X).toEqual(0)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(I)
        expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)
    })

    it("test_reset_sets_pc_to_0_by_default", () => {
        const cpu = new CPU()

        expect(cpu.PC).toEqual(0x0000)
    })

    it("test_reset_sets_pc_to_start_pc_if_not_None", () => {
        const cpu = new CPU(0x1234)

        expect(cpu.PC).toEqual(0x1234)
    })
})
