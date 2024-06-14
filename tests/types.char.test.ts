import { UnsignedChar, Char } from "../src/types"

describe("Unsigned Char", () => {
    const MIN = 0x00
    const SMAX = 0x7F
    const SMIN = 0x80
    const MAX = 0xFF

    const _MIN = 0
    const _MAX = 255

    const testNumbers = [MIN, SMIN, SMAX, MAX]
    const testArray: UnsignedChar = new UnsignedChar(testNumbers)

    it("must be within range", () => {
        expect(testArray).toBeInstanceOf(UnsignedChar)

        for (let i = 0; i < testNumbers.length; i++) {
            const v = testArray[i]
            expect(v).toBeGreaterThanOrEqual(_MIN)
            expect(v).toBeLessThanOrEqual(_MAX)

            const n = testNumbers[i]
            expect(v).toEqual(n)
        }
    })

    it("must point to same buffer", () => {
        expect(testArray[0]).toEqual(MIN)

        const testBuffer: UnsignedChar = testArray.Ptr()
        testBuffer[0]++

        expect(testArray[0]).toEqual(MIN + 1)
    })

    it("must point to same buffer with offset", () => {
        expect(testArray[1]).toEqual(SMIN)

        const testBuffer: UnsignedChar = testArray.Ptr(1)
        testBuffer[0]++

        expect(testArray[1]).toEqual(SMIN + 1)
    })

    it("must point to same buffer with offset and length", () => {
        expect(testArray[2]).toEqual(SMAX)

        const testBuffer: UnsignedChar = testArray.Ptr(2, 1)
        testBuffer[0]--

        expect(testArray[2]).toEqual(SMAX - 1)
    })
})

describe("Signed Char", () => {
    const RANGE = 1 << 8 - 1

    const MIN = 0x00
    const SMAX = 0x7F
    const SMIN = 0x80
    const MAX = 0xFF

    const _MIN = -128
    const _MAX = 127

    const testNumbers = [MIN, SMIN, SMAX, MAX]
    const testArray: Char = new Char(testNumbers)

    it("must be within range", () => {
        expect(testArray).toBeInstanceOf(Char)

        for (let i = 0; i < testNumbers.length; i++) {
            const v = testArray[i]
            expect(v).toBeGreaterThanOrEqual(_MIN)
            expect(v).toBeLessThanOrEqual(_MAX)

            const n = testNumbers[i] >= RANGE ? testNumbers[i] | ~(RANGE - 1) : testNumbers[i]
            expect(v).toEqual(n)
        }
    })

    it("must point to same buffer", () => {
        expect(testArray[0]).toEqual(MIN)

        const testBuffer: Char = testArray.Ptr()
        testBuffer[0]++

        expect(testArray[0]).toEqual(MIN + 1)
    })

    it("must point to same buffer with offset", () => {
        expect(testArray[1]).toEqual(_MIN)

        const testBuffer: Char = testArray.Ptr(1)
        testBuffer[0]++

        expect(testArray[1]).toEqual(_MIN + 1)
    })

    it("must point to same buffer with offset and length", () => {
        expect(testArray[2]).toEqual(_MAX)

        const testBuffer: Char = testArray.Ptr(2, 1)
        testBuffer[0]--

        expect(testArray[2]).toEqual(_MAX - 1)
    })
})
