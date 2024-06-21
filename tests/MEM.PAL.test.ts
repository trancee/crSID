import { MEM, ROM_IRQreturnCode, ROM_NMIstartCode, ROM_IRQBRKstartCode } from "../src/MEM"

import { C64, VideoStandard } from "../src/C64"
import { UnsignedChar } from "../src/types"

const Zero = new UnsignedChar(0x10100).fill(0x00)
const NOP = new UnsignedChar(0xEA7E - 0xEA31).fill(0xEA)
const RTS = new UnsignedChar(0xEA31 - 0xA000).fill(0x60)

describe("MEM", () => {
    C64.VideoStandard = VideoStandard.PAL

    C64.RealSIDmode = true

    it("setROMcontent", () => {
        expect(C64.RAMbank).toHaveLength(0x10100)
        expect(C64.ROMbanks).toHaveLength(0x10100)
        expect(C64.IObankWR).toHaveLength(0x10100)
        expect(C64.IObankRD).toHaveLength(0x10100)

        expect(C64.RAMbank).toEqual(Zero)
        expect(C64.ROMbanks).toEqual(Zero)
        expect(C64.IObankWR).toEqual(Zero)
        expect(C64.IObankRD).toEqual(Zero)

        MEM.setROMcontent()

        expect(C64.ROMbanks.Ptr(0xEA31, 0xEA7E - 0xEA31)).toEqual(NOP)
        expect(C64.ROMbanks.Ptr(0xA000, 0xEA31 - 0xA000)).toEqual(RTS)

        expect(Array.from(C64.ROMbanks.Ptr(0xEA7E, ROM_IRQreturnCode.length))).toEqual(Array.from(ROM_IRQreturnCode))
        expect(Array.from(C64.ROMbanks.Ptr(0xFE43, ROM_NMIstartCode.length))).toEqual(Array.from(ROM_NMIstartCode))
        expect(Array.from(C64.ROMbanks.Ptr(0xFF48, ROM_IRQBRKstartCode.length))).toEqual(Array.from(ROM_IRQBRKstartCode))

        expect(C64.ROMbanks[0xFFFB]).toEqual(0xFE)
        expect(C64.ROMbanks[0xFFFA]).toEqual(0x43)
        expect(C64.ROMbanks[0xFFFF]).toEqual(0xFF)
        expect(C64.ROMbanks[0xFFFE]).toEqual(0x48)

        expect(Array.from(C64.RAMbank)).toEqual(Array.from(C64.ROMbanks))
    })

    it("initMem", () => {
        MEM.initMem()

        //$02A6 should be pre-set to: 0:NTSC / 1:PAL
        expect(C64.RAMbank[0x02A6]).toEqual(VideoStandard.PAL)

        //initialize bank-reg. (ROM-banks and IO enabled)
        expect(C64.RAMbank[0x0001]).toEqual(0x37)

        //Some tunes might check for keypress here (e.g. Master Blaster Intro)
        expect(C64.RAMbank[0x00CB]).toEqual(0x40)

        //IRQ
        expect(C64.RAMbank[0x0315]).toEqual(0xEA)
        expect(C64.RAMbank[0x0314]).toEqual(0x31)

        //NMI
        expect(C64.RAMbank[0x0319]).toEqual(0xEA)
        expect(C64.RAMbank[0x0318]).toEqual(0x81)

        const Zero = new UnsignedChar(0x0800).fill(0x00)
        expect(C64.IObankRD.Ptr(0xD000, 0xD800 - 0xD000)).toEqual(Zero) // was 0xD7FF

        //initialize the whole IO area for a known base-state
        Zero[0x0012] = 0x37
        Zero[0x0011] = 0x8B
        expect(C64.IObankWR.Ptr(0xD000, 0xD800 - 0xD000)).toEqual(Zero) // was 0xD7FF

        //Imitate CIA1 keyboard/joy port, some tunes check if buttons are not pressed
        expect(C64.IObankRD[0xDC00]).toEqual(0x10)
        expect(C64.IObankRD[0xDC01]).toEqual(0xFF)

        //initialize CIAs
        expect(C64.IObankWR[0xDC04]).toEqual(0x24)
        expect(C64.IObankWR[0xDC05]).toEqual(0x40)

        //Reset-default, but for PSID CIA1 TimerA IRQ should be enabled anyway if SID is CIA-timed
        expect(C64.IObankWR[0xDC0D]).toEqual(0x81)

        //some tunes (and PSID doc) expect already running CIA (Reset-default)
        expect(C64.IObankWR[0xDC0E]).toEqual(0x01)
        //All counters other than CIA1 TimerA should be disabled and set to 0xFF for PSID:
        expect(C64.IObankWR[0xDC0F]).toEqual(0x00)

        //VICbank-selector default
        expect(C64.IObankWR[0xDD00]).toEqual(0x03)
        expect(C64.IObankRD[0xDD00]).toEqual(0x03)

        expect(C64.IObankWR[0xDD04]).toEqual(0xFF)
        expect(C64.IObankWR[0xDD05]).toEqual(0xFF)
    })
})
