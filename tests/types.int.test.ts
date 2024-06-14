import { UnsignedInt, Int } from "../src/types"

describe("Unsigned Int", () => {
    const MIN = 0x00000000
    const SMAX = 0x7FFFFFFF
    const SMIN = 0x80000000
    const MAX = 0xFFFFFFFF

    const _MIN = 0
    const _MAX = 4294967295

    const testNumbers = [MIN, SMIN, SMAX, MAX]
    const testArray: UnsignedInt = new UnsignedInt(testNumbers)

    it("must be within range", () => {
        expect(testArray).toBeInstanceOf(UnsignedInt)

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

        const testBuffer: UnsignedInt = testArray.Ptr()
        testBuffer[0]++

        expect(testArray[0]).toEqual(MIN + 1)
    })

    it("must point to same buffer with offset", () => {
        expect(testArray[1]).toEqual(SMIN)

        const testBuffer: UnsignedInt = testArray.Ptr(1)
        testBuffer[0]++

        expect(testArray[1]).toEqual(SMIN + 1)
    })

    it("must point to same buffer with offset and length", () => {
        expect(testArray[2]).toEqual(SMAX)

        const testBuffer: UnsignedInt = testArray.Ptr(2, 1)
        testBuffer[0]--

        expect(testArray[2]).toEqual(SMAX - 1)
    })
})

describe("Signed Int", () => {
    const MIN = 0x00000000
    const SMAX = 0x7FFFFFFF
    const SMIN = 0x80000000
    const MAX = 0xFFFFFFFF

    const _MIN = -2147483648
    const _MAX = 2147483647

    const testNumbers = [MIN, SMIN, SMAX, MAX]
    const testArray: Int = new Int(testNumbers)

    it("must be within range", () => {
        expect(testArray).toBeInstanceOf(Int)

        for (let i = 0; i < testNumbers.length; i++) {
            const v = testArray[i]
            expect(v).toBeGreaterThanOrEqual(_MIN)
            expect(v).toBeLessThanOrEqual(_MAX)

            const n = testNumbers[i] | 0
            expect(v).toEqual(n)
        }
    })

    it("must point to same buffer", () => {
        expect(testArray[0]).toEqual(MIN)

        const testBuffer: Int = testArray.Ptr(0, 1)
        testBuffer[0]++

        expect(testArray[0]).toEqual(MIN + 1)
    })

    it("must point to same buffer with offset", () => {
        expect(testArray[1]).toEqual(_MIN)

        const testBuffer: Int = testArray.Ptr(1)
        testBuffer[0]++

        expect(testArray[1]).toEqual(_MIN + 1)
    })

    it("must point to same buffer with offset and length", () => {
        expect(testArray[2]).toEqual(_MAX)

        const testBuffer: Int = testArray.Ptr(2, 1)
        testBuffer[0]--

        expect(testArray[2]).toEqual(_MAX - 1)
    })
})
