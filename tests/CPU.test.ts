import { A, Addr, C, CPU, Cycles, N, PC, SP, ST, SamePage, T, V, X, Y, Z } from "../src/CPU"
import { C64 } from "../src/C64"
import { SIDheaderOffset } from "../src/SID"

import { Short, UnsignedChar } from "../src/types"

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
        expect(cpu.A).toEqual(subtune - 1)
        expect(cpu.X).toEqual(0)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(0x04)
        expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)
    })

    it("addrModeImmediate", () => {
        CPU.reset()
        cpu.loadReg()

        expect(Cycles).toEqual(0)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress)
        expect(Addr[0]).toEqual(0)

        CPU.addrModeImmediate()

        expect(Cycles).toEqual(2)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress + 1)
        expect(Addr[0]).toEqual(InitAddress + 1)
    })

    it("addrModeZeropage", () => {
        CPU.reset()
        cpu.loadReg()

        expect(Cycles).toEqual(0)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress)
        expect(Addr[0]).toEqual(0)

        CPU.addrModeZeropage()

        expect(Cycles).toEqual(3)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress + 1)
        expect(Addr[0]).toEqual(0)
    })

    it("addrModeAbsolute", () => {
        CPU.reset()
        cpu.loadReg()

        expect(Cycles).toEqual(0)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress)
        expect(Addr[0]).toEqual(0)

        CPU.addrModeAbsolute()

        expect(Cycles).toEqual(4)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress + 2)
        expect(Addr[0]).toEqual(0)
    })

    it("addrModeZeropageXindexed", () => {
        CPU.reset()
        cpu.loadReg()

        expect(Cycles).toEqual(0)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress)
        expect(Addr[0]).toEqual(0)

        CPU.addrModeZeropageXindexed()

        expect(Cycles).toEqual(4)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress + 1)
        expect(Addr[0]).toEqual(0)
    })

    it("addrModeZeropageYindexed", () => {
        CPU.reset()
        cpu.loadReg()

        expect(Cycles).toEqual(0)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress)
        expect(Addr[0]).toEqual(0)

        CPU.addrModeZeropageYindexed()

        expect(Cycles).toEqual(4)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress + 1)
        expect(Addr[0]).toEqual(0)
    })

    it("addrModeXindexed", () => {
        CPU.reset()
        cpu.loadReg()

        expect(Cycles).toEqual(0)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress)
        expect(Addr[0]).toEqual(0)

        CPU.addrModeXindexed()

        expect(Cycles).toEqual(5)
        expect(SamePage).toEqual(1)
        expect(PC[0]).toEqual(InitAddress + 2)
        expect(Addr[0]).toEqual(0)
    })

    it("addrModeYindexed", () => {
        CPU.reset()
        cpu.loadReg()

        expect(Cycles).toEqual(0)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress)
        expect(Addr[0]).toEqual(0)

        CPU.addrModeYindexed()

        expect(Cycles).toEqual(5)
        expect(SamePage).toEqual(1)
        expect(PC[0]).toEqual(InitAddress + 2)
        expect(Addr[0]).toEqual(0)
    })

    it("addrModeIndirectYindexed", () => {
        CPU.reset()
        cpu.loadReg()

        expect(Cycles).toEqual(0)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress)
        expect(Addr[0]).toEqual(0)

        CPU.addrModeIndirectYindexed()

        expect(Cycles).toEqual(6)
        expect(SamePage).toEqual(1)
        expect(PC[0]).toEqual(InitAddress + 1)
        expect(Addr[0]).toEqual(17872)
    })

    it("addrModeXindexedIndirect", () => {
        CPU.reset()
        cpu.loadReg()

        expect(Cycles).toEqual(0)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress)
        expect(Addr[0]).toEqual(0)

        CPU.addrModeXindexedIndirect()

        expect(Cycles).toEqual(6)
        expect(SamePage).toEqual(0)
        expect(PC[0]).toEqual(InitAddress + 1)
        expect(Addr[0]).toEqual(17872)
    })

    it("clrC", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        CPU.clrC()

        expect(ST[0]).toEqual(0b11111110)
        expect(ST[0]).toEqual(0b11111111 & ~C)
    })

    it("clrNZC", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        CPU.clrNZC()

        expect(ST[0]).toEqual(0b01111100)
        expect(ST[0]).toEqual(0b11111111 & ~(N | Z | C))
    })

    it("clrNVZC", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        CPU.clrNVZC()

        expect(ST[0]).toEqual(0b00111100)
        expect(ST[0]).toEqual(0b11111111 & ~(N | V | Z | C))
    })

    it("setC", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        CPU.setC(true)

        expect(ST[0]).toEqual(0b11111111)
        expect(ST[0]).toEqual(0b11111111 | C)

        CPU.setC(false)

        expect(ST[0]).toEqual(0b11111110)
        expect(ST[0]).toEqual(0b11111111 & ~C)

        CPU.setC(-1)

        expect(ST[0]).toEqual(0b11111111)
        expect(ST[0]).toEqual(0b11111111 | C)

        CPU.setC(0)

        expect(ST[0]).toEqual(0b11111110)
        expect(ST[0]).toEqual(0b11111111 & ~C)
    })

    it("setNZbyA", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        A[0] = 1 // Non-Negative, Non-Zero
        CPU.setNZbyA()

        expect(ST[0]).toEqual(0b01111101)
        expect(ST[0]).toEqual(0b11111111 & ~(N | Z))

        A[0] = 0 // Non-Negative, Zero
        CPU.setNZbyA()

        expect(ST[0]).toEqual(0b01111111)
        expect(ST[0]).toEqual(0b11111111 & ~N)

        A[0] = -1 // Negative, Non-Zero
        CPU.setNZbyA()

        expect(ST[0]).toEqual(0b11111101)
        expect(ST[0]).toEqual(0b11111111 & ~Z)

        A[0] = 0x0100 // Non-Negative, Non-Zero
        CPU.setNZbyA()

        expect(ST[0]).toEqual(0b01111101)
        expect(ST[0]).toEqual(0b11111111 & ~(N | Z))
    })

    it("setNZbyT", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        T[0] = 1 // Non-Negative, Non-Zero
        CPU.setNZbyT()

        expect(ST[0]).toEqual(0b01111101)
        expect(ST[0]).toEqual(0b11111111 & ~(N | Z))

        T[0] = 0 // Non-Negative, Zero
        CPU.setNZbyT()

        expect(ST[0]).toEqual(0b01111111)
        expect(ST[0]).toEqual(0b11111111 & ~N)

        T[0] = -1 // Negative, Non-Zero
        CPU.setNZbyT()

        expect(ST[0]).toEqual(0b11111101)
        expect(ST[0]).toEqual(0b11111111 & ~Z)

        T[0] = 0x0100 // Non-Negative, Zero
        CPU.setNZbyT()

        expect(ST[0]).toEqual(0b01111111)
        expect(ST[0]).toEqual(0b11111111 & ~N)
    })

    it("setNZbyX", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        X[0] = 1 // Non-Negative, Non-Zero
        CPU.setNZbyX()

        expect(ST[0]).toEqual(0b01111101)
        expect(ST[0]).toEqual(0b11111111 & ~(N | Z))

        X[0] = 0 // Non-Negative, Zero
        CPU.setNZbyX()

        expect(ST[0]).toEqual(0b01111111)
        expect(ST[0]).toEqual(0b11111111 & ~N)

        X[0] = -1 // Negative, Non-Zero
        CPU.setNZbyX()

        expect(ST[0]).toEqual(0b11111101)
        expect(ST[0]).toEqual(0b11111111 & ~Z)
    })

    it("setNZbyY", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        Y[0] = 1 // Non-Negative, Non-Zero
        CPU.setNZbyY()

        expect(ST[0]).toEqual(0b01111101)
        expect(ST[0]).toEqual(0b11111111 & ~(N | Z))

        Y[0] = 0 // Non-Negative, Zero
        CPU.setNZbyY()

        expect(ST[0]).toEqual(0b01111111)
        expect(ST[0]).toEqual(0b11111111 & ~N)

        Y[0] = -1 // Negative, Non-Zero
        CPU.setNZbyY()

        expect(ST[0]).toEqual(0b11111101)
        expect(ST[0]).toEqual(0b11111111 & ~Z)
    })

    it("setNZbyM", () => {
        const addr = 0x0100
        Addr[0] = addr

        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        CPU.wr(addr, 1) // Non-Negative, Non-Zero
        CPU.setNZbyM()

        expect(ST[0]).toEqual(0b01111101)
        expect(ST[0]).toEqual(0b11111111 & ~(N | Z))

        CPU.wr(addr, 0) // Non-Negative, Zero
        CPU.setNZbyM()

        expect(ST[0]).toEqual(0b01111111)
        expect(ST[0]).toEqual(0b11111111 & ~N)

        CPU.wr(addr, -1) // Negative, Non-Zero
        CPU.setNZbyM()

        expect(ST[0]).toEqual(0b11111101)
        expect(ST[0]).toEqual(0b11111111 & ~Z)
    })

    it("setNZCbyAdd", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        A[0] = 1 // Non-Negative, Non-Zero, Non-Carry
        CPU.setNZCbyAdd()

        expect(ST[0]).toEqual(0b01111100)
        expect(ST[0]).toEqual(0b11111111 & ~(N | Z | C))

        A[0] = 0 // Non-Negative, Zero, Non-Carry
        CPU.setNZCbyAdd()

        expect(ST[0]).toEqual(0b01111110)
        expect(ST[0]).toEqual(0b11111111 & ~(N | C))

        A[0] = -1 // Negative, Non-Zero, Non-Carry
        CPU.setNZCbyAdd()

        expect(ST[0]).toEqual(0b11111100)
        expect(ST[0]).toEqual(0b11111111 & ~(Z | C))

        A[0] = 0x0100 // Non-Negative, Zero, Carry
        CPU.setNZCbyAdd()

        expect(ST[0]).toEqual(0b01111111)
        expect(ST[0]).toEqual(0b11111111 & ~N)
    })

    it("setVbyAdd", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        T[0] = 0
        A[0] = 0
        CPU.setVbyAdd(0)

        expect(ST[0]).toEqual(0b10111111)
        expect(ST[0]).toEqual(0b11111111 & ~V)

        T[0] = 0
        A[0] = -1
        CPU.setVbyAdd(0)

        expect(ST[0]).toEqual(0b11111111)
        expect(ST[0]).toEqual(0b11111111 | V)
    })

    it("setNZCbySub", () => {
        ST[0] = -1
        expect(ST[0]).toEqual(0b11111111)

        // Non-Negative, Non-Zero, Carry
        expect(CPU.setNZCbySub(new Short([1]))).toEqual(new Short([1]))

        expect(ST[0]).toEqual(0b01111101)
        expect(ST[0]).toEqual(0b11111111 & ~(N | Z))

        // Non-Negative, Zero, Carry
        expect(CPU.setNZCbySub(new Short([0]))).toEqual(new Short([0]))

        expect(ST[0]).toEqual(0b01111111)
        expect(ST[0]).toEqual(0b11111111 & ~N)

        // Negative, Non-Zero, Non-Carry
        expect(CPU.setNZCbySub(new Short([-1]))).toEqual(new Short([0xFF]))

        expect(ST[0]).toEqual(0b11111100)
        expect(ST[0]).toEqual(0b11111111 & ~(Z | C))

        // Non-Negative, Zero, Carry
        expect(CPU.setNZCbySub(new Short([0x0100]))).toEqual(new Short([0]))

        expect(ST[0]).toEqual(0b01111111)
        expect(ST[0]).toEqual(0b11111111 & ~N)
    })

    it("push & pop", () => {
        SP[0] = 0xFF

        for (let i = 0; i <= 0xFF; i++) {
            expect(SP[0]).toEqual(0xFF - i)

            CPU.push(i)

            expect(SP[0]).toEqual(0xFF - i - 1 & 0xFF)
        }

        for (let i = 0; i <= 0xFF; i++) {
            expect(SP[0]).toEqual(i - 1 & 0xFF)

            expect(CPU.pop()).toEqual(0xFF - i)

            expect(SP[0]).toEqual(i)
        }
    })

    it("storeReg & loadReg", () => {
        expect(cpu).toBeInstanceOf(CPU)

        expect(cpu.PC).toEqual(InitAddress)
        expect(cpu.A).toEqual(subtune - 1)
        expect(cpu.X).toEqual(0)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(0x04)
        expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)

        cpu.loadReg()

        expect(cpu.PC).toEqual(InitAddress)
        expect(cpu.A).toEqual(subtune - 1)
        expect(cpu.X).toEqual(0)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(0x04)
        expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)

        cpu.PC = -1
        cpu.A = -1
        cpu.X = -1
        cpu.Y = -1
        cpu.ST = -1
        cpu.SP = -1

        cpu.storeReg()

        expect(cpu.PC).toEqual(InitAddress)
        expect(cpu.A).toEqual(subtune - 1)
        expect(cpu.X).toEqual(0)
        expect(cpu.Y).toEqual(0)
        expect(cpu.ST).toEqual(0x04)
        expect(cpu.SP).toEqual(0xFF)
        expect(cpu.PrevNMI).toEqual(0)

        cpu.loadReg()

        expect(cpu.PC).toEqual(InitAddress)
        expect(cpu.A).toEqual(subtune - 1)
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
        expect(cpu.A).toEqual(subtune - 1)

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
