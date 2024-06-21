import { CPU } from "../src/CPU"
import { C64 } from "../src/C64"
import { SIDheaderOffset } from "../src/SID"

import { UnsignedChar } from "../src/types"

import fs from "fs"

const filename = "Wizball.sid"
const subtune = 4

describe("CPU", () => {
    const filedata = new UnsignedChar(fs.readFileSync(`tests/files/${filename}`))

    const HeaderSize = (filedata[SIDheaderOffset.HeaderSizeH00] << 8) + filedata[SIDheaderOffset.HeaderSize]
    const LoadAddress = (filedata[SIDheaderOffset.LoadAddressH] << 8) + filedata[SIDheaderOffset.LoadAddressL]
    const InitAddress = (filedata[SIDheaderOffset.InitAddressH] << 8) + filedata[SIDheaderOffset.InitAddressL]
    const PlayAddress = (filedata[SIDheaderOffset.PlayAddressH] << 8) + filedata[SIDheaderOffset.PlayAddressL]

    const SIDdataOffset = HeaderSize
    for (let i = SIDdataOffset; i < filedata.length; ++i)
        C64.RAMbank[LoadAddress + (i - SIDdataOffset)] = filedata[i]

    const cpu = new CPU(InitAddress)
    cpu.A = subtune - 1

    it("instantiate", () => {
        expect(cpu).toBeInstanceOf(CPU)

        expect(cpu.PC).toEqual(InitAddress)
        expect(cpu.A).toEqual(3)
        expect(cpu.X).toEqual(0)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(0x04)
        expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)
    })

    it("emulateCPU", () => {
        cpu.initCPU(InitAddress)
        expect(cpu.PC).toEqual(InitAddress)
        expect(cpu.A).toEqual(0)
        expect(cpu.X).toEqual(0)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(0x04)
        expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)

        cpu.A = subtune - 1
        expect(cpu.A).toEqual(3)

        while (cpu.emulateCPU() < 0xFE) { }
        expect(cpu.PC).toEqual(0x23)
        expect(cpu.A).toEqual(0)
        expect(cpu.X).toEqual(1)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(0x6E)
        expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)

        cpu.initCPU(PlayAddress)
        expect(cpu.PC).toEqual(PlayAddress)
        expect(cpu.A).toEqual(0)
        expect(cpu.X).toEqual(0)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(0x04)
        expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)

        expect(cpu.emulateCPU()).toEqual(7)
        expect(cpu.PC).toEqual(0)
        expect(cpu.A).toEqual(0)
        expect(cpu.X).toEqual(0)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(0x04)
        // expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)

        // cpu.handleCPUinterrupts()
    })
})
