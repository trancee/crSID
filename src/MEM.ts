//Emulation of C64 memories and memory bus (PLA & MUXes)

import { UnsignedChar } from "./types";

import { C64 } from "./C64";
import { IRQ, NMI } from "./CPU";

export const
    ROM_IRQreturnCode: UnsignedChar = new UnsignedChar([0xAD, 0x0D, 0xDC, 0x68, 0xA8, 0x68, 0xAA, 0x68, 0x40]); //CIA1-acknowledge IRQ-return

export const
    ROM_NMIstartCode: UnsignedChar = new UnsignedChar([0x78, 0x6C, 0x18, 0x03, 0x40]); //SEI and jmp($0318)

export const
    ROM_IRQBRKstartCode: UnsignedChar = new UnsignedChar([ //Full IRQ-return (handling BRK with the same RAM vector as IRQ)
        0x48, 0x8A, 0x48, 0x98, 0x48, 0xBA, 0xBD, 0x04, 0x01, 0x29, 0x10, 0xEA, 0xEA, 0xEA, 0xEA, 0xEA, 0x6C, 0x14, 0x03
    ]);

export class MEM {
    private static getMemReadPtr(address: number): UnsignedChar {
        if (address < 0xA000) return C64.RAMbank.Ptr(address, 1);
        else if (0xD000 <= address && address < 0xE000 && (C64.RAMbank[1] & 3)) {
            if (0xD400 <= address && address < 0xD419) return C64.IObankWR.Ptr(address, 1); //emulate bitfading aka SID-read of last written reg (e.g. Lift Off ROR $D400,x)
            return C64.IObankRD.Ptr(address, 1);
        }
        else if ((address < 0xC000 && (C64.RAMbank[1] & 3) == 3)
            || (0xE000 <= address && (C64.RAMbank[1] & 2))) return C64.ROMbanks.Ptr(address, 1);
        return C64.RAMbank.Ptr(address, 1);
    }

    static readMem(address: number): UnsignedChar {
        return MEM.getMemReadPtr(address);
    }

    static writeMem(address: number, value: number): void {
        // if (address < 0xD000 || 0xE000 <= address) C64.RAMbank[address] = value;
        // else if (C64.RAMbank[1] & 3) { //handle SID-mirrors! (CJ in the USA workaround (writing above $d420, except SID2/SID3/PSIDdigi))
        if (address >= 0xD000 && address < 0xE000 && C64.RAMbank[1] & 3) { //handle SID-mirrors! (CJ in the USA workaround (writing above $d420, except SID2/SID3/PSIDdigi))
            if (0xD420 <= address && address < 0xD800) { //CIA/VIC mirrors needed?
                if (!(C64.PSIDdigiMode && 0xD418 <= address && address < 0xD500)
                    && !(C64.SID[2].BaseAddress <= address && address < C64.SID[2].BaseAddress + 0x20)
                    && !(C64.SID[3].BaseAddress <= address && address < C64.SID[3].BaseAddress + 0x20)
                    && !(C64.SID[4].BaseAddress <= address && address < C64.SID[4].BaseAddress + 0x20)) {
                    C64.IObankWR[0xD400 + (address & 0x1F)] = value; //write to $D400..D41F if not in SID2/SID3 address-space
                }
                else C64.IObankWR[address] = value;
            }
            else C64.IObankWR[address] = value;
        }
        C64.RAMbank[address] = value;
    }

    static setROMcontent(): void { //fill KERNAL/BASIC-ROM areas with content needed for SID-playback
        for (let i = 0xA000; i < 0x10000; ++i) C64.ROMbanks[i] = 0x60; //RTS (at least return if some unsupported call is made to ROM)
        for (let i = 0xEA31; i < 0xEA7E; ++i) C64.ROMbanks[i] = 0xEA; //NOP (full IRQ-return leading to simple IRQ-return without other tasks)
        for (let i = 0; i < ROM_IRQreturnCode.length; ++i) C64.ROMbanks[0xEA7E + i] = ROM_IRQreturnCode[i];
        for (let i = 0; i < ROM_NMIstartCode.length; ++i) C64.ROMbanks[0xFE43 + i] = ROM_NMIstartCode[i];
        for (let i = 0; i < ROM_IRQBRKstartCode.length; ++i) C64.ROMbanks[0xFF48 + i] = ROM_IRQBRKstartCode[i];

        C64.ROMbanks[NMI + 1] = 0xFE; C64.ROMbanks[NMI + 0] = 0x43; //ROM NMI-vector
        C64.ROMbanks[IRQ + 1] = 0xFF; C64.ROMbanks[IRQ + 0] = 0x48; //ROM IRQ-vector

        //copy KERNAL & BASIC ROM contents into the RAM under them? (So PSIDs that don't select bank correctly will work better.)
        for (let i = 0xA000; i < 0x10000; ++i) C64.RAMbank[i] = C64.ROMbanks[i];
    }

    static initMem(): void { //set default values that normally KERNEL ensures after startup/reset (only SID-playback related)
        //data required by both PSID and RSID (according to HVSC SID_file_format.txt):
        MEM.writeMem(0x02A6, C64.VideoStandard); //$02A6 should be pre-set to: 0:NTSC / 1:PAL
        MEM.writeMem(0x0001, 0x37); //initialize bank-reg. (ROM-banks and IO enabled)

        //if (C64->ROMbanks[0xE000]==0) { //wasn't a KERNAL-ROM loaded? (e.g. PSID)
        MEM.writeMem(0x00CB, 0x40); //Some tunes might check for keypress here (e.g. Master Blaster Intro)
        //if(C64->RealSIDmode) {
        MEM.writeMem(0x0315, 0xEA); MEM.writeMem(0x0314, 0x31); //IRQ
        MEM.writeMem(0x0319, 0xEA/*0xFE*/); MEM.writeMem(0x0318, 0x81/*0x47*/); //NMI
        //}

        for (let i = 0xD000; i < 0xD800; ++i) C64.IObankRD[i] = C64.IObankWR[i] = 0x00; //initialize the whole IO area for a known base-state
        if (C64.RealSIDmode) { C64.IObankWR[0xD012] = 0x37; C64.IObankWR[0xD011] = 0x8B; } //else C64->IObankWR[0xD012] = 0;
        //C64->IObankWR[0xD019] = 0; //PSID: rasterrow: any value <= $FF, IRQ:enable later if there is VIC-timingsource

        C64.IObankRD[0xDC00] = 0x10; C64.IObankRD[0xDC01] = 0xFF; //Imitate CIA1 keyboard/joy port, some tunes check if buttons are not pressed
        if (C64.VideoStandard) { C64.IObankWR[0xDC04] = 0x24; C64.IObankWR[0xDC05] = 0x40; } //initialize CIAs
        else { C64.IObankWR[0xDC04] = 0x95; C64.IObankWR[0xDC05] = 0x42; }
        if (C64.RealSIDmode) C64.IObankWR[0xDC0D] = 0x81; //Reset-default, but for PSID CIA1 TimerA IRQ should be enabled anyway if SID is CIA-timed
        C64.IObankWR[0xDC0E] = 0x01; //some tunes (and PSID doc) expect already running CIA (Reset-default)
        C64.IObankWR[0xDC0F] = 0x00; //All counters other than CIA1 TimerA should be disabled and set to 0xFF for PSID:
        C64.IObankWR[0xDD00] = C64.IObankRD[0xDD00] = 0x03; //VICbank-selector default
        C64.IObankWR[0xDD04] = C64.IObankWR[0xDD05] = 0xFF; //C64->IObankWR[0xDD0E] = C64->IObank[0xDD0F] = 0x00;
        //}
    }
}
