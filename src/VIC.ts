//VIC-II emulation

import { UnsignedChar, UnsignedShort, debugArray } from "./types";

import { C64 } from "./C64";
// import { ChipModel } from "./SID";

// VICregisters
const
    CONTROL = 0x11, RASTERROWL = 0x12, SPRITE_ENABLE = 0x15, INTERRUPT = 0x19, INTERRUPT_ENABLE = 0x1A;

// ControlBitVal
const
    RASTERROWMSB = 0x80, DISPLAY_ENABLE = 0x10, ROWS = 0x08, YSCROLL_MASK = 0x07;

// InterruptBitVal
const
    VIC_IRQ = 0x80, RASTERROW_MATCH_IRQ = 0x01;

export class VIC {
    // ChipModel: ChipModel   //(timing differences between models?)

    #BaseAddress: UnsignedShort = new UnsignedShort(1) // unsigned short [0, 65535] //VIC-baseaddress location in C64-memory (IO)
    #BasePtrWR: UnsignedChar // unsigned char* [0, 255] //VIC-baseaddress location in host's memory for writing
    #BasePtrRD: UnsignedChar // unsigned char* [0, 255] //VIC-baseaddress location in host's memory for reading

    #RasterLines: UnsignedShort = new UnsignedShort(1) // unsigned short [0, 65535]
    #RasterRowCycles: UnsignedChar = new UnsignedChar(1) // unsigned char [0, 255]

    #RowCycleCnt: UnsignedChar = new UnsignedChar(1) // unsigned char [0, 255]

    constructor(baseaddress: number) {
        // this.ChipModel = ChipModel.Unknown

        this.#BaseAddress[0] = baseaddress

        this.#BasePtrWR = C64.IObankWR.Ptr(baseaddress)
        this.#BasePtrRD = C64.IObankRD.Ptr(baseaddress)

        this.initVICchip()
    }

    get RasterLines(): number {
        return this.#RasterLines[0]
    }
    set RasterLines(value: number) {
        this.#RasterLines[0] = value
    }
    get RasterRowCycles(): number {
        return this.#RasterRowCycles[0]
    }
    set RasterRowCycles(value: number) {
        this.#RasterRowCycles[0] = value
    }

    get RowCycleCnt(): number {
        return this.#RowCycleCnt[0]
    }
    set RowCycleCnt(value: number) {
        this.#RowCycleCnt[0] = value
    }


    initVICchip(): void {
        // console.debug("initVICchip")
        // console.debug(debugArray("BasePtrWR", this.BasePtrWR, 0x3F))
        // console.debug(debugArray("BasePtrRD", this.BasePtrRD, 0x3F))
        for (let i = 0; i < 0x3F; ++i) {
            this.#BasePtrWR[i] = this.#BasePtrRD[i] = 0x00;
        }

        this.#RowCycleCnt[0] = 0;
    }

    emulateVIC(cycles: number): number {
        // console.debug("emulateVIC", cycles)
        const RasterRow: UnsignedShort = new UnsignedShort(1);

        this.#RowCycleCnt[0] += cycles;

        if (this.#RowCycleCnt[0] >= this.#RasterRowCycles[0]) {
            this.#RowCycleCnt[0] -= this.#RasterRowCycles[0];

            RasterRow[0] = ((this.#BasePtrRD[CONTROL] & RASTERROWMSB) << 1) + this.#BasePtrRD[RASTERROWL];
            ++RasterRow[0]; if (RasterRow[0] >= this.#RasterLines[0]) RasterRow[0] = 0;
            this.#BasePtrRD[CONTROL] = (this.#BasePtrRD[CONTROL] & ~RASTERROWMSB) | ((RasterRow[0] & 0x100) >> 1);
            this.#BasePtrRD[RASTERROWL] = RasterRow[0] & 0xFF;

            if (this.#BasePtrWR[INTERRUPT_ENABLE] & RASTERROW_MATCH_IRQ) {
                if (RasterRow[0] == ((this.#BasePtrWR[CONTROL] & RASTERROWMSB) << 1) + this.#BasePtrWR[RASTERROWL]) {
                    this.#BasePtrRD[INTERRUPT] |= VIC_IRQ | RASTERROW_MATCH_IRQ;
                }
            }
        }

        return this.#BasePtrRD[INTERRUPT] & VIC_IRQ;
    }

    acknowledgeVICrasterIRQ(): void {
        // console.debug("acknowledgeVICrasterIRQ")
        //An 1 is to be written into the IRQ-flag (bit0) of $d019 to clear it and deassert IRQ signal
        //if (VIC->BasePtrWR[INTERRUPT] & RASTERROW_MATCH_IRQ) { //acknowledge raster-interrupt by writing to $d019 bit0?
        //But oftentimes INC/LSR/etc. RMW commands are used to acknowledge VIC IRQ, they work on real
        //CPU because it writes the unmodified original value itself to memory before writing the modified there
        this.#BasePtrWR[INTERRUPT] &= ~RASTERROW_MATCH_IRQ; //prepare for next acknowledge-detection
        this.#BasePtrRD[INTERRUPT] &= ~(VIC_IRQ | RASTERROW_MATCH_IRQ); //remove IRQ flag and state
        //}
    }
}
