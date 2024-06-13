import { CIA } from "../src/CIA"

describe("CIA", () => {
    const cia = new CIA(0x0000)

    it("instantiate", () => {
        expect(cia).toBeInstanceOf(CIA)
    })

    it("emulateCIA", () => {
        expect(cia.emulateCIA(1)).toEqual(0)
    })
})