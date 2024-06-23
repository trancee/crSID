import { C, CPU, N, NO_FLAGS, V, Z } from "../../src/CPU"

// BIT (Zero Page)

const tests = [
    ["test_bit_abs_copies_bit_7_of_memory_to_n_flag_when_0", { A: 0xFF, value: 0xFF, flags: ~N }, { A: 0xFF, value: 0xFF, flags: V | N }],
    ["test_bit_abs_copies_bit_7_of_memory_to_n_flag_when_1", { A: 0xFF, value: 0x00, flags: N }, { A: 0xFF, value: 0x00, flags: Z }],
    ["test_bit_abs_copies_bit_6_of_memory_to_v_flag_when_0", { A: 0xFF, value: 0xFF, flags: ~V }, { A: 0xFF, value: 0xFF, flags: V | N }],
    ["test_bit_abs_copies_bit_6_of_memory_to_v_flag_when_1", { A: 0xFF, value: 0x00, flags: V }, { A: 0xFF, value: 0x00, flags: Z }],
    ["test_bit_abs_stores_result_of_and_in_z_preserves_a_when_1", { A: 0x01, value: 0x00, flags: ~Z }, { A: 0x01, value: 0x00, flags: Z }],
    ["test_bit_abs_stores_result_of_and_when_nonzero_in_z_preserves_a", { A: 0x01, value: 0x01, flags: Z }, { A: 0x01, value: 0x01, flags: NO_FLAGS }],
    ["test_bit_abs_stores_result_of_and_when_zero_in_z_preserves_a", { A: 0x01, value: 0x00, flags: ~Z }, { A: 0x01, value: 0x00, flags: Z }],
]

describe("BIT (Zero Page)", () => {
    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = new CPU()
        cpu.A = input.A

        if (input.flags) {
            if (input.flags > NO_FLAGS) cpu.ST |= input.flags
            if (input.flags < NO_FLAGS) cpu.ST &= input.flags
        }

        // $0000 BIT $0010

        CPU.wr(0x0000, 0x24)
        CPU.wr(0x0001, 0x10)

        CPU.wr(0x0010, input.value)

        expect(cpu.emulateCPU()).toEqual(3)
        expect(cpu.PC).toEqual(0x0002)

        expect(CPU.rd(0x0010)[0]).toEqual(output.value)

        expect(cpu.A).toEqual(output.A)
        expect(cpu.ST & V).toEqual((output.flags || NO_FLAGS) & V)
        expect(cpu.ST & N).toEqual((output.flags || NO_FLAGS) & N)
        expect(cpu.ST & Z).toEqual((output.flags || NO_FLAGS) & Z)
        expect(cpu.ST & C).toEqual((output.flags || NO_FLAGS) & C)
    })
})
