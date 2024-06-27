import { compareTest, prepareTest, wr } from "./helpers"
import { _, C, N, V, Z } from "./helpers"

//Arithmetic
const
    INS_ADC = 0x69,
    INS_ADC_ZP = 0x65,
    INS_ADC_ZPX = 0x75,
    INS_ADC_ABS = 0x6D,
    INS_ADC_ABSX = 0x7D,
    INS_ADC_ABSY = 0x79,
    INS_ADC_INDX = 0x61,
    INS_ADC_INDY = 0x71,

    INS_SBC = 0xE9,
    INS_SBC_ABS = 0xED,
    INS_SBC_ZP = 0xE5,
    INS_SBC_ZPX = 0xF5,
    INS_SBC_ABSX = 0xFD,
    INS_SBC_ABSY = 0xF9,
    INS_SBC_INDX = 0xE1,
    INS_SBC_INDY = 0xF1

describe("ADC Absolute", () => {
    const tests = [
        ["ADCAbsCanAddZeroToZeroAndGetZero",
            { A: 0, Operand: 0, flags: _ },
            { A: 0, flags: Z }],
        ["ADCAbsCanAddCarryAndZeroToZeroAndGetOne",
            { A: 0, Operand: 0, flags: C },
            { A: 1, flags: _ }],
        ["ADCAbsCanAddTwoUnsignedNumbers",
            { A: 20, Operand: 17, flags: C },
            { A: 38, flags: _ }],
        ["ADCAbsCanAddAPositiveAndNegativeNumber",
            { A: 20, Operand: -17, flags: C },
            { A: 4, flags: C }],
        ["ADCAbsCanAddOneToFFAndItWillCauseACarry",
            { A: 0xFF, Operand: 1, flags: _ },
            { A: 0, flags: Z | C }],

        ["ADCAbsWillSetTheNegativeFlagWhenTheResultIsNegative",
            { A: 0, Operand: -1, flags: _ },
            { A: -1, flags: N }],

        ["ADCAbsWillSetTheOverflowFlagWhenSignedNegativeAdditionFails",
            { A: 0b10000000, Operand: 0b11111111, flags: _ },
            { A: 0b01111111, flags: V | C }],
        ["ADCAbsWillSetTheOverflowFlagWhenSignedNegativeAdditionPassedDueToInitialCarryFlag",
            { A: 0b10000000, Operand: 0b11111111, flags: C },
            { A: 0b10000000, flags: N | C }],
        ["ADCAbsWillSetTheOverflowFlagWhenSignedPositiveAdditionFails",
            { A: 0b01111111, Operand: 0b00000001, flags: _ },
            { A: 0b10000000, flags: V | N }],
    ]

    const PC = 0xFF00
    const CYCLES = 4
    const INS = 3

    const ABS = 0x8000

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = prepareTest(PC, input)

        wr(PC + 0, INS_ADC_ABS)
        wr(PC + 1, ABS & 0xFF)
        wr(PC + 2, ABS >> 8)

        wr(ABS, input.Operand)

        expect(cpu.emulateCPU()).toEqual(CYCLES)
        expect(cpu.PC).toEqual(PC + INS)

        compareTest(cpu, output)
    })
})

describe("ADC Immediate", () => {
    const tests = [
        ["ADCImmediateCanAddTwoUnsignedNumbers",
            { A: 20, Operand: 17, flags: C },
            { A: 38, flags: _ }],
        ["ADCImmediateCanAddAPositiveAndNegativeNumber",
            { A: 20, Operand: -17, flags: C },
            { A: 4, flags: C }],
        ["ADCZeroPageCanAddTwoUnsignedNumbers",
            { A: 20, Operand: 17, flags: C },
            { A: 38, flags: _ }],
        ["ADCZeroPageCanAddAPositiveAndNegativeNumber",
            { A: 20, Operand: -17, flags: C },
            { A: 4, flags: C }],
    ]

    const PC = 0xFF00
    const CYCLES = 2
    const INS = 2

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = prepareTest(PC, input)

        wr(PC + 0, INS_ADC)
        wr(PC + 1, input.Operand)

        expect(cpu.emulateCPU()).toEqual(CYCLES)
        expect(cpu.PC).toEqual(PC + INS)

        compareTest(cpu, output)
    })
})

describe("ADC Zero Page", () => {
    const tests = [
        ["ADCZeroPageCanAddTwoUnsignedNumbers",
            { A: 20, Operand: 17, flags: C },
            { A: 38, flags: _ }],
        ["ADCZeroPageCanAddAPositiveAndNegativeNumber",
            { A: 20, Operand: -17, flags: C },
            { A: 4, flags: C }],
    ]

    const PC = 0xFF00
    const CYCLES = 3
    const INS = 2

    const ABS = 0x42

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = prepareTest(PC, input)

        wr(PC + 0, INS_ADC_ZP)
        wr(PC + 1, ABS)

        wr(ABS, input.Operand)

        expect(cpu.emulateCPU()).toEqual(CYCLES)
        expect(cpu.PC).toEqual(PC + INS)

        compareTest(cpu, output)
    })
})

describe("ADC Zero Page,X", () => {
    const tests = [
        ["ADCZeroPageXCanAddTwoUnsignedNumbers",
            { A: 20, Operand: 17, flags: C },
            { A: 38, flags: _ }],
        ["ADCZeroPageXCanAddAPositiveAndNegativeNumber",
            { A: 20, Operand: -17, flags: C },
            { A: 4, flags: C }],
    ]

    const PC = 0xFF00
    const CYCLES = 4
    const INS = 2

    const ABS = 0x42

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = prepareTest(PC, input)
        cpu.X = 0x10

        wr(PC + 0, INS_ADC_ZPX)
        wr(PC + 1, ABS)

        wr(ABS + cpu.X, input.Operand)

        expect(cpu.emulateCPU()).toEqual(CYCLES)
        expect(cpu.PC).toEqual(PC + INS)

        compareTest(cpu, output)
    })
})

describe("ADC Absolute,X", () => {
    const tests = [
        ["ADCAbsXCanAddTwoUnsignedNumbers",
            { A: 20, Operand: 17, flags: C },
            { A: 38, flags: _ }],
        ["ADCAbsXCanAddAPositiveAndNegativeNumber",
            { A: 20, Operand: -17, flags: C },
            { A: 4, flags: C }],
    ]

    const PC = 0xFF00
    const CYCLES = 4
    const INS = 3

    const ABS = 0x42

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = prepareTest(PC, input)
        cpu.X = 0x10

        wr(PC + 0, INS_ADC_ABSX)
        wr(PC + 1, ABS & 0xFF)
        wr(PC + 2, ABS >> 8)

        wr(ABS + cpu.X, input.Operand)

        expect(cpu.emulateCPU()).toEqual(CYCLES)
        expect(cpu.PC).toEqual(PC + INS)

        compareTest(cpu, output)
    })
})

describe("ADC Absolute,Y", () => {
    const tests = [
        ["ADCAbsYCanAddTwoUnsignedNumbers",
            { A: 20, Operand: 17, flags: C },
            { A: 38, flags: _ }],
        ["ADCAbsYCanAddAPositiveAndNegativeNumber",
            { A: 20, Operand: -17, flags: C },
            { A: 4, flags: C }],
    ]

    const PC = 0xFF00
    const CYCLES = 4
    const INS = 3

    const ABS = 0x8000

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = prepareTest(PC, input)
        cpu.Y = 0x10

        wr(PC + 0, INS_ADC_ABSY)
        wr(PC + 1, ABS & 0xFF)
        wr(PC + 2, ABS >> 8)

        wr(ABS + cpu.Y, input.Operand)

        expect(cpu.emulateCPU()).toEqual(CYCLES)
        expect(cpu.PC).toEqual(PC + INS)

        compareTest(cpu, output)
    })
})

describe("ADC Indirect,X", () => {
    const tests = [
        ["ADCIndXCanAddTwoUnsignedNumbers",
            { A: 20, Operand: 17, flags: C },
            { A: 38, flags: _ }],
        ["ADCIndXCanAddAPositiveAndNegativeNumber",
            { A: 20, Operand: -17, flags: C },
            { A: 4, flags: C }],
    ]

    const PC = 0xFF00
    const CYCLES = 6
    const INS = 2

    const IND = 0x02
    const ABS = 0x8000

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = prepareTest(PC, input)
        cpu.X = 0x04

        wr(PC + 0, INS_ADC_INDX)
        wr(PC + 1, IND)

        wr(IND + cpu.X + 0, ABS & 0xFF)
        wr(IND + cpu.X + 1, ABS >> 8)

        wr(ABS, input.Operand)

        expect(cpu.emulateCPU()).toEqual(CYCLES)
        expect(cpu.PC).toEqual(PC + INS)

        compareTest(cpu, output)
    })
})

describe("ADC Indirect,Y", () => {
    const tests = [
        ["ADCIndYCanAddTwoUnsignedNumbers",
            { A: 20, Operand: 17, flags: C },
            { A: 38, flags: _ }],
        ["ADCIndYCanAddAPositiveAndNegativeNumber",
            { A: 20, Operand: -17, flags: C },
            { A: 4, flags: C }],
    ]

    const PC = 0xFF00
    const CYCLES = 5
    const INS = 2

    const IND = 0x02
    const ABS = 0x8000

    test.each(tests)("%s", (_, input: any, output: any) => {
        const cpu = prepareTest(PC, input)
        cpu.Y = 0x04

        wr(PC + 0, INS_ADC_INDY)
        wr(PC + 1, IND)

        wr(IND + 0, ABS & 0xFF)
        wr(IND + 1, ABS >> 8)

        wr(ABS + cpu.Y, input.Operand)

        expect(cpu.emulateCPU()).toEqual(CYCLES)
        expect(cpu.PC).toEqual(PC + INS)

        compareTest(cpu, output)
    })
})
