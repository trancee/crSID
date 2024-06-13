import { VIC, VIC_IRQ, INTERRUPT, INTERRUPT_ENABLE, RASTERROW_MATCH_IRQ } from "../src/VIC"

import { C64, ScanLines, ScanLineCycles, VideoStandard } from "../src/C64"

const baseaddress = 0xD000

describe("PAL", () => {
    const vic = new VIC(baseaddress)

    const BasePtrWR = C64.IObankWR.Ptr(baseaddress)
    const BasePtrRD = C64.IObankRD.Ptr(baseaddress)

    it("instantiate", () => {
        expect(vic).toBeInstanceOf(VIC)

        vic.RasterLines = ScanLines[VideoStandard.PAL];
        expect(vic.RasterLines).toEqual(ScanLines[VideoStandard.PAL])
        vic.RasterRowCycles = ScanLineCycles[VideoStandard.PAL];
        expect(vic.RasterRowCycles).toEqual(ScanLineCycles[VideoStandard.PAL])

        expect(vic.RasterRowCycles).toEqual(63)

        vic.RowCycleCnt = 0
        expect(vic.RowCycleCnt).toEqual(0)
    })

    it("emulateVIC", () => {
        expect(vic.emulateVIC(1)).toEqual(0)
        expect(vic.RowCycleCnt).toEqual(1)

        vic.RasterLines = 0

        expect(BasePtrWR[INTERRUPT_ENABLE]).toEqual(0)
        expect(BasePtrWR[INTERRUPT]).toEqual(0)
        expect(BasePtrRD[INTERRUPT]).toEqual(0)

        vic.acknowledgeVICrasterIRQ()

        expect(BasePtrWR[INTERRUPT_ENABLE]).toEqual(0)
        expect(BasePtrWR[INTERRUPT]).toEqual(0)
        expect(BasePtrRD[INTERRUPT]).toEqual(0)

        expect(vic.emulateVIC(3)).toEqual(0)
        expect(vic.RowCycleCnt).toEqual(4)

        expect(vic.emulateVIC(61)).toEqual(0)
        expect(vic.RowCycleCnt).toEqual(2)
    })
})
