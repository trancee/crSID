import { UnsignedShort, Short } from "../src/types"

describe("Unsigned Short", () => {
    const MIN = 0x0000
    const SMAX = 0x7FFF
    const SMIN = 0x8000
    const MAX = 0xFFFF

    const _MIN = 0
    const _MAX = 65535

    const testNumbers = [MIN, SMIN, SMAX, MAX]
    const testArray: UnsignedShort = new UnsignedShort(testNumbers)

    it("must be within range", () => {
        expect(testArray).toBeInstanceOf(UnsignedShort)

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

        const testBuffer: UnsignedShort = testArray.Ptr()
        testBuffer[0]++

        expect(testArray[0]).toEqual(MIN + 1)
    })

    it("must point to same buffer with offset", () => {
        expect(testArray[1]).toEqual(SMIN)

        const testBuffer: UnsignedShort = testArray.Ptr(1)
        testBuffer[0]++

        expect(testArray[1]).toEqual(SMIN + 1)
    })

    it("must point to same buffer with offset and length", () => {
        expect(testArray[2]).toEqual(SMAX)

        const testBuffer: UnsignedShort = testArray.Ptr(2, 1)
        testBuffer[0]--

        expect(testArray[2]).toEqual(SMAX - 1)
    })
})

describe("Signed Short", () => {
    const RANGE = 1 << 16 - 1

    const MIN = 0x0000
    const SMAX = 0x7FFF
    const SMIN = 0x8000
    const MAX = 0xFFFF

    const _MIN = -32768
    const _MAX = 32767

    const testNumbers = [MIN, SMIN, SMAX, MAX]
    const testArray: Short = new Short(testNumbers)

    it("must be within range", () => {
        expect(testArray).toBeInstanceOf(Short)

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

        const testBuffer: Short = testArray.Ptr(0, 1)
        testBuffer[0]++

        expect(testArray[0]).toEqual(MIN + 1)
    })

    it("must point to same buffer with offset", () => {
        expect(testArray[1]).toEqual(_MIN)

        const testBuffer: Short = testArray.Ptr(1)
        testBuffer[0]++

        expect(testArray[1]).toEqual(_MIN + 1)
    })

    it("must point to same buffer with offset and length", () => {
        expect(testArray[2]).toEqual(_MAX)

        const testBuffer: Short = testArray.Ptr(2, 1)
        testBuffer[0]--

        expect(testArray[2]).toEqual(_MAX - 1)
    })
})
