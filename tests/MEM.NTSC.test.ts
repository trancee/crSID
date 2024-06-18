import { MEM, ROM_IRQreturnCode, ROM_NMIstartCode, ROM_IRQBRKstartCode } from "../src/MEM"

import { C64, VideoStandard } from "../src/C64"
import { SID, Channels, ChipModel } from "../src/SID"

import { toSatisfyAll } from "jest-extended"
expect.extend({ toSatisfyAll })

describe("MEM", () => {
    C64.VideoStandard = VideoStandard.NTSC

    C64.RealSIDmode = false

    const isZero = (el: number) => el === 0
    const isRTS = (el: number) => el === 0x60
    const isNOP = (el: number) => el === 0xEA

    it("setROMcontent", () => {
        expect(C64.RAMbank).toHaveLength(0x10100)
        expect(C64.ROMbanks).toHaveLength(0x10100)
        expect(C64.IObankWR).toHaveLength(0x10100)
        expect(C64.IObankRD).toHaveLength(0x10100)

        expect(C64.RAMbank).toSatisfyAll(isZero)
        expect(C64.ROMbanks).toSatisfyAll(isZero)
        expect(C64.IObankWR).toSatisfyAll(isZero)
        expect(C64.IObankRD).toSatisfyAll(isZero)

        MEM.setROMcontent()

        expect(C64.ROMbanks.Ptr(0xEA31, 0xEA7E - 0xEA31)).toSatisfyAll(isNOP)
        expect(C64.ROMbanks.Ptr(0xA000, 0xEA31 - 0xA000)).toSatisfyAll(isRTS)

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
        expect(C64.RAMbank[0x02A6]).toEqual(VideoStandard.NTSC)

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

        //initialize the whole IO area for a known base-state
        expect(C64.IObankWR.Ptr(0xD000, 0xD800 - 0xD000)).toSatisfyAll(isZero) // was 0xD7FF
        expect(C64.IObankRD.Ptr(0xD000, 0xD800 - 0xD000)).toSatisfyAll(isZero) // was 0xD7FF

        //Imitate CIA1 keyboard/joy port, some tunes check if buttons are not pressed
        expect(C64.IObankRD[0xDC00]).toEqual(0x10)
        expect(C64.IObankRD[0xDC01]).toEqual(0xFF)

        //initialize CIAs
        expect(C64.IObankWR[0xDC04]).toEqual(0x95)
        expect(C64.IObankWR[0xDC05]).toEqual(0x42)

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

    it("writeMem", () => {
        C64.SID[1] = new SID(ChipModel.MOS8580, Channels.CHANNEL_BOTH, 0xD400)
        C64.SID[2] = new SID(ChipModel.MOS8580, Channels.CHANNEL_BOTH, 0xD420)
        C64.SID[3] = new SID(ChipModel.MOS8580, Channels.CHANNEL_BOTH, 0xD440)
        C64.SID[4] = new SID(ChipModel.MOS8580, Channels.CHANNEL_BOTH, 0xD460)

        const testWrite = (address: number, value: number, oldValue: number) => {
            expect(C64.RAMbank[address]).toEqual(oldValue)

            MEM.writeMem(address, value)

            expect(C64.RAMbank[address]).toEqual(value)
        }

        expect(C64.IObankWR[0xD000]).toEqual(0x00)
        testWrite(0xD000, 0xEA, 0x60)
        expect(C64.IObankWR[0xD000]).toEqual(0xEA)

        expect(C64.IObankWR[0xD41F]).toEqual(0x00)
        expect(C64.IObankWR[0xD43F]).toEqual(0x00)
        testWrite(0xD43F, 0xEA, 0x60)
        expect(C64.IObankWR[0xD41F]).toEqual(0xEA) // mirrored
        expect(C64.IObankWR[0xD43F]).toEqual(0x00)

        C64.PSIDdigiMode = true

        // expect(C64.IObankWR[0xD500]).toEqual(0x00)
        // testWrite(0xD500, 0xEA, 0x60)
        // expect(C64.IObankWR[0xD500]).toEqual(0x00)

        expect(C64.IObankWR[0xD45F]).toEqual(0x00)
        testWrite(0xD45F, 0xEA, 0x60)
        expect(C64.IObankWR[0xD45F]).toEqual(0xEA)
    })

    it("readMem", () => {
        expect(C64.RAMbank[0x0001]).toEqual(0x37)
        expect(MEM.readMem(0x0001)[0]).toEqual(0x37)

        expect(C64.RAMbank[0xB000]).toEqual(0x60)
        expect(MEM.readMem(0xB000)[0]).toEqual(0x60)

        expect(C64.RAMbank[0xF000]).toEqual(0x60)
        expect(MEM.readMem(0xF000)[0]).toEqual(0x60)

        expect(C64.IObankRD[0xD000]).toEqual(0x00)
        expect(MEM.readMem(0xD000)[0]).toEqual(0x00)

        expect(C64.IObankWR[0xD400]).toEqual(0x00)
        expect(MEM.readMem(0xD400)[0]).toEqual(0x00)

        C64.RAMbank[1] = 0x00

        expect(C64.RAMbank[0xF000]).toEqual(0x60)
        expect(MEM.readMem(0xF000)[0]).toEqual(0x60)
    })
})
