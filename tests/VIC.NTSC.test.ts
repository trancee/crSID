import { VIC, VIC_IRQ, INTERRUPT, INTERRUPT_ENABLE, RASTERROW_MATCH_IRQ } from "../src/VIC"

import { C64, ScanLines, ScanLineCycles, VideoStandard } from "../src/C64"

const baseaddress = 0xD000

describe("NTSC", () => {
    const vic = new VIC(baseaddress)

    const BasePtrWR = C64.IObankWR.Ptr(baseaddress)
    const BasePtrRD = C64.IObankRD.Ptr(baseaddress)

    BasePtrWR[INTERRUPT_ENABLE] |= RASTERROW_MATCH_IRQ

    BasePtrWR[INTERRUPT] |= RASTERROW_MATCH_IRQ
    BasePtrRD[INTERRUPT] |= VIC_IRQ | RASTERROW_MATCH_IRQ

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
        expect(vic.emulateVIC(1)).toEqual(VIC_IRQ)
        expect(vic.RowCycleCnt).toEqual(1)

        vic.RasterLines = 0

        expect(BasePtrWR[INTERRUPT_ENABLE]).toEqual(RASTERROW_MATCH_IRQ)
        expect(BasePtrWR[INTERRUPT]).toEqual(RASTERROW_MATCH_IRQ)
        expect(BasePtrRD[INTERRUPT]).toEqual(VIC_IRQ | RASTERROW_MATCH_IRQ)

        vic.acknowledgeVICrasterIRQ()

        expect(BasePtrWR[INTERRUPT_ENABLE]).toEqual(RASTERROW_MATCH_IRQ)
        expect(BasePtrWR[INTERRUPT]).toEqual(0)
        expect(BasePtrRD[INTERRUPT]).toEqual(0)

        expect(vic.emulateVIC(3)).toEqual(0)
        expect(vic.RowCycleCnt).toEqual(4)

        expect(vic.emulateVIC(61)).toEqual(VIC_IRQ)
        expect(vic.RowCycleCnt).toEqual(0)
    })
})