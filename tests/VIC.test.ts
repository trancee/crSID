import { VIC } from "../src/VIC"

import { ScanLines, ScanLineCycles, VideoStandard } from "../src/C64"

describe("VIC", () => {
    const vic = new VIC(0x0000)

    it("instantiate", () => {
        expect(vic).toBeInstanceOf(VIC)

        vic.RasterLines = ScanLines[VideoStandard.NTSC];
        expect(vic.RasterLines).toEqual(ScanLines[VideoStandard.NTSC])
        vic.RasterRowCycles = ScanLineCycles[VideoStandard.NTSC];
        expect(vic.RasterRowCycles).toEqual(ScanLineCycles[VideoStandard.NTSC])

        expect(vic.RasterRowCycles).toEqual(65)

        vic.RowCycleCnt = 0
        expect(vic.RowCycleCnt).toEqual(0)
    })

    it("emulateVIC", () => {
        expect(vic.emulateVIC(1)).toEqual(0)
        expect(vic.RowCycleCnt).toEqual(1)

        vic.RasterLines = 0

        vic.acknowledgeVICrasterIRQ()

        expect(vic.emulateVIC(3)).toEqual(0)
        expect(vic.RowCycleCnt).toEqual(4)

        expect(vic.emulateVIC(61)).toEqual(0)
        expect(vic.RowCycleCnt).toEqual(0)
    })
})