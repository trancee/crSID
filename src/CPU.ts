//cRSID CPU-emulation

import { Int, Short, UnsignedChar, UnsignedShort } from "./types";

import { C64 } from "./C64";
import { MEM } from "./MEM";

const DebugReg = false
const DebugST = false

// StatusFlagBitValues
const
    N = 0x80, V = 0x40, B = 0x10, D = 0x08, I = 0x04, Z = 0x02, C = 0x01;

const
    FlagSwitches: UnsignedChar = new UnsignedChar([0x01, 0x21, 0x04, 0x24, 0x00, 0x40, 0x08, 0x28]),
    BranchFlags: UnsignedChar = new UnsignedChar([0x80, 0x40, 0x01, 0x02]);

let Cycles: number, SamePage: number;
const IR: UnsignedChar = new UnsignedChar(1), ST: UnsignedChar = new UnsignedChar(1), X: UnsignedChar = new UnsignedChar(1), Y: UnsignedChar = new UnsignedChar(1);
const A: Short = new Short(1), SP: Short = new Short(1), T: Short = new Short(1);
const PC: UnsignedShort = new UnsignedShort(1), Addr: UnsignedShort = new UnsignedShort(1), PrevPC: UnsignedShort = new UnsignedShort(1);

export class CPU {
    PC: UnsignedShort = new UnsignedShort(1);
    A: Short = new Short(1); SP: Short = new Short(1);
    X: UnsignedChar = new UnsignedChar(1); Y: UnsignedChar = new UnsignedChar(1); ST: UnsignedChar = new UnsignedChar(1);  //STATUS-flags: N V - B D I Z C
    PrevNMI: UnsignedChar = new UnsignedChar(1); //used for NMI leading edge detection

    constructor(mempos: number) {
        this.initCPU(mempos)
    }

    initCPU(mempos: number): void {
        // console[mempos === 26112 ? "debug" : "debug"]("initCPU", mempos)
        this.PC[0] = mempos; this.A[0] = 0; this.X[0] = 0; this.Y[0] = 0; this.ST[0] = 0x04; this.SP[0] = 0xFF; this.PrevNMI[0] = 0;
    }

    emulateCPU(): number { //the CPU emulation for SID/PRG playback (ToDo: CIA/VIC-IRQ/NMI/RESET vectors, BCD-mode)
        // console.debug("emulateCPU")

        // const C64: C64 = C64; //could be a parameter but function-call is faster this way if only 1 main CPU exists
        // const CPU: CPU = C64.CPU;

        const loadReg = (): void => { DebugReg && console.debug("PC", PC[0], "←", this.PC[0], "SP", SP[0], "←", this.SP[0], "ST", ST[0], "←", this.ST[0], "A", A[0], "←", this.A[0], "X", X[0], "←", this.X[0], "Y", Y[0], "←", this.Y[0]); PC[0] = this.PC[0]; SP[0] = this.SP[0]; ST[0] = this.ST[0]; A[0] = this.A[0]; X[0] = this.X[0]; Y[0] = this.Y[0]; }
        const storeReg = (): void => { DebugReg && console.debug("PC", PC[0], "→", this.PC[0], "SP", SP[0], "→", this.SP[0], "ST", ST[0], "→", this.ST[0], "A", A[0], "→", this.A[0], "X", X[0], "→", this.X[0], "Y", Y[0], "→", this.Y[0]); this.PC[0] = PC[0]; this.SP[0] = SP[0]; this.ST[0] = ST[0]; this.A[0] = A[0]; this.X[0] = X[0]; this.Y[0] = Y[0]; }

        const rd = (address: number): UnsignedChar => {
            const value: UnsignedChar = MEM.readMem(address);
            // console.log(`rd[${address}] → ${value}`)
            // if (address == 18435 && ST[0] == 7) { console.trace(); process.exit(0) }
            if (C64.RealSIDmode) {
                if (C64.RAMbank[1] & 3) {
                    if (address == 0xDC0D) { C64.CIA[1].acknowledgeCIAIRQ(); }
                    else if (address == 0xDD0D) { C64.CIA[2].acknowledgeCIAIRQ(); }
                }
            }
            return value;
        }

        const wr = (address: number, data: number): void => {
            // console[data < 0 ? "trace" : "log"](`wr[${address}] ← ${data}`)
            MEM.writeMem(address, data, false)
            if (C64.RealSIDmode && (C64.RAMbank[1] & 3)) {
                //if(data&1) { //only writing 1 to $d019 bit0 would acknowledge, not any value (but RMW instructions write $d019 back before mod.)
                if (address == 0xD019) { C64.VIC.acknowledgeVICrasterIRQ(); }
                //}
            }
        }

        const wr2 = (address: number, data: UnsignedChar): void => { //PSID-hack specific memory-write
            const Tmp: Int = new Int(1);
            // console[data < 0 ? "trace" : "log"](`wr2[${address}] ← ${data}`)
            MEM.writeMem(address, data[0], false);
            if (C64.RAMbank[1] & 3) {
                if (C64.RealSIDmode) {
                    if (address == 0xDC0D) C64.CIA[1].writeCIAIRQmask(data);
                    else if (address == 0xDD0D) C64.CIA[2].writeCIAIRQmask(data);
                    else if (address == 0xDD0C) C64.IObankRD[address] = data[0]; //mirror WR to RD (e.g. Wonderland_XIII_tune_1.sid)
                    //#ifdef PLATFORM_PC //just for info displayer
                    // else if (address==0xDC05 || address==0xDC04) C64->FrameCycles = ( (C64->IObankWR[0xDC04] + (C64->IObankWR[0xDC05]<<8)) );
                    //#endif
                    else if (address == 0xD019 && data[0] & 1) { //only writing 1 to $d019 bit0 would acknowledge
                        C64.VIC.acknowledgeVICrasterIRQ();
                    }
                }

                else {
                    switch (address) {
                        case 0xDC05: case 0xDC04:
                            if (C64.TimerSource) { //dynamic CIA-setting (Galway/Rubicon workaround)
                                C64.FrameCycles[0] = ((C64.IObankWR[0xDC04] + (C64.IObankWR[0xDC05] << 8))); //<< 4) / C64->SampleClockRatio;
                            }
                            break;
                        case 0xDC08: C64.IObankRD[0xDC08] = data[0]; break; //refresh TOD-clock
                        case 0xDC09: C64.IObankRD[0xDC09] = data[0]; break; //refresh TOD-clock
                        case 0xD012: //dynamic VIC IRQ-rasterline setting (Microprose Soccer V1 workaround)
                            if (C64.PrevRasterLine[0] >= 0) { //was $d012 set before? (or set only once?)
                                if (C64.IObankWR[0xD012] != C64.PrevRasterLine[0]) {
                                    Tmp[0] = C64.IObankWR[0xD012] - C64.PrevRasterLine[0];
                                    if (Tmp[0] < 0) Tmp[0] += C64.VIC.RasterLines;
                                    C64.FrameCycleCnt[0] = (C64.FrameCycles[0] - Tmp[0] * C64.VIC.RasterRowCycles);
                                }
                            }
                            C64.PrevRasterLine[0] = C64.IObankWR[0xD012];
                            break;
                    }
                }

            }
        }

        const addrModeImmediate = (): void => { ++PC[0]; Addr[0] = PC[0]; Cycles = 2; } //imm.
        const addrModeZeropage = (): void => { ++PC[0]; Addr[0] = rd(PC[0])[0]; Cycles = 3; } //zp
        const addrModeAbsolute = (): void => { ++PC[0]; Addr[0] = rd(PC[0])[0]; ++PC[0]; Addr[0] += rd(PC[0])[0] << 8; Cycles = 4; } //abs
        const addrModeZeropageXindexed = (): void => { ++PC[0]; Addr[0] = (rd(PC[0])[0] + X[0]) & 0xFF; Cycles = 4; } //zp,x (with zeropage-wraparound of 6502)
        const addrModeZeropageYindexed = (): void => { ++PC[0]; Addr[0] = (rd(PC[0])[0] + Y[0]) & 0xFF; Cycles = 4; } //zp,y (with zeropage-wraparound of 6502)

        const addrModeXindexed = (): void => { // abs,x (only STA is 5 cycles, others are 4 if page not crossed, RMW:7)
            ++PC[0]; Addr[0] = rd(PC[0])[0] + X[0]; ++PC[0]; SamePage = Number(Addr[0] <= 0xFF); Addr[0] += rd(PC[0])[0] << 8; Cycles = 5;
        }

        const addrModeYindexed = (): void => { // abs,y (only STA is 5 cycles, others are 4 if page not crossed, RMW:7)
            ++PC[0]; Addr[0] = rd(PC[0])[0] + Y[0]; ++PC[0]; SamePage = Number(Addr[0] <= 0xFF); Addr[0] += rd(PC[0])[0] << 8; Cycles = 5;
        }

        const addrModeIndirectYindexed = (): void => { // (zp),y (only STA is 6 cycles, others are 5 if page not crossed, RMW:8)
            ++PC[0]; Addr[0] = rd(rd(PC[0])[0])[0] + Y[0]; SamePage = Number(Addr[0] <= 0xFF); Addr[0] += rd((rd(PC[0])[0] + 1) & 0xFF)[0] << 8; Cycles = 6;
        }

        const addrModeXindexedIndirect = (): void => { // (zp,x)
            ++PC[0]; Addr[0] = (rd(rd(PC[0])[0] + X[0])[0] & 0xFF) + ((rd(rd(PC[0])[0] + X[0] + 1)[0] & 0xFF) << 8); Cycles = 6;
        }

        const clrC = () => { ST[0] &= ~C; DebugST && console.debug("clrC", "ST", ST[0], "C", C); } //clear Carry-flag
        const setC = (expr: number | boolean) => { ST[0] &= ~C; ST[0] |= Number(expr != 0); DebugST && console.debug("setC", "ST", ST[0], "C", C, "expr", expr); } //set Carry-flag if expression is not zero
        const clrNZC = () => { ST[0] &= ~(N | Z | C); DebugST && console.debug("clrNZC", "ST", ST[0], "N", N, "Z", Z, "C", C); } //clear flags
        const clrNVZC = () => { ST[0] &= ~(N | V | Z | C); DebugST && console.debug("clrNVZC", "ST", ST[0], "N", N, "V", V, "Z", Z, "C", C); } //clear flags
        const setNZbyA = () => { ST[0] &= ~(N | Z); ST[0] |= (Number(!A[0]) << 1) | (A[0] & N); DebugST && console.debug("setNZbyA", "ST", ST[0], "N", N, "Z", Z, "A", A[0]); } //set Negative-flag and Zero-flag based on result in Accumulator
        const setNZbyT = () => { T[0] &= 0xFF; ST[0] &= ~(N | Z); ST[0] |= (Number(!T[0]) << 1) | (T[0] & N); DebugST && console.debug("setNZbyT", "ST", ST[0], "N", N, "Z", Z, "T", T[0]); }
        const setNZbyX = () => { ST[0] &= ~(N | Z); ST[0] |= (Number(!X[0]) << 1) | (X[0] & N); DebugST && console.debug("setNZbyX", "ST", ST[0], "N", N, "Z", Z, "X", X[0]); } //set Negative-flag and Zero-flag based on result in X-register
        const setNZbyY = () => { ST[0] &= ~(N | Z); ST[0] |= (Number(!Y[0]) << 1) | (Y[0] & N); DebugST && console.debug("setNZbyY", "ST", ST[0], "N", N, "Z", Z, "Y", Y[0]); } //set Negative-flag and Zero-flag based on result in Y-register
        const setNZbyM = () => { DebugST && console.debug(">> setNZbyM", "ST", ST[0]); ST[0] &= ~(N | Z); ST[0] |= (Number(!rd(Addr[0])[0]) << 1) | (rd(Addr[0])[0] & N); DebugST && console.debug("<< setNZbyM", "ST", ST[0], "N", N, "Z", Z, "M", rd(Addr[0])[0]); } //set Negative-flag and Zero-flag based on result at Memory-Address
        const setNZCbyAdd = () => { DebugST && console.debug(">> setNZCbyAdd", "ST", ST[0]); ST[0] &= ~(N | Z | C); ST[0] |= (A[0] & N) | Number(A[0] > 255); A[0] &= 0xFF; ST[0] |= Number(!A[0]) << 1; DebugST && console.debug("<< setNZCbyAdd", "ST", ST[0], "N", N, "Z", Z, "C", C, "A", A[0]); } //after increase/addition
        const setVbyAdd = (M: number) => { ST[0] &= ~V; ST[0] |= ((~(T[0] ^ M)) & (T[0] ^ A[0]) & N) >> 1; DebugST && console.debug("setVbyAdd", "ST", ST[0], "V", V, "N", N, "T", T[0], "A", A[0], "M", M); } //calculate V-flag from A and T (previous A) and input2 (Memory)
        const setNZCbySub = (val: Short): Short => { ST[0] &= ~(N | Z | C); ST[0] |= (val[0] & N) | Number(val[0] >= 0); val[0] &= 0xFF; ST[0] |= (Number(!(val[0])) << 1); DebugST && console.debug("setNZCbySub", "ST", ST[0], "N", N, "Z", Z, "C", C, "val", val[0]); return val; }

        const push = (value: number): void => { C64.RAMbank[0x100 + SP[0]] = value; --SP[0]; SP[0] &= 0xFF; } //push a value to stack
        const pop = (): number => { ++SP[0]; SP[0] &= 0xFF; return C64.RAMbank[0x100 + SP[0]]; } //pop a value from stack

        loadReg(); PrevPC[0] = PC[0];
        IR[0] = rd(PC[0])[0]; Cycles = 2; SamePage = 0; //'Cycles': ensure smallest 6510 runtime (for implied/register instructions)

        if (IR[0] & 1) {  //nybble2:  1/5/9/D:accu.instructions, 3/7/B/F:illegal opcodes

            switch ((IR[0] & 0x1F) >> 1) { //value-forming to cause jump-table //PC wraparound not handled inside to save codespace
                case 0x00: case 0x01: addrModeXindexedIndirect(); break; //(zp,x)
                case 0x02: case 0x03: addrModeZeropage(); break;
                case 0x04: case 0x05: addrModeImmediate(); break;
                case 0x06: case 0x07: addrModeAbsolute(); break;
                case 0x08: case 0x09: addrModeIndirectYindexed(); break; //(zp),y (5..6 cycles, 8 for R-M-W)
                case 0x0A: addrModeZeropageXindexed(); break; //zp,x
                case 0x0B: if ((IR[0] & 0xC0) != 0x80) addrModeZeropageXindexed(); //zp,x for illegal opcodes
                else addrModeZeropageYindexed(); //zp,y for LAX/SAX illegal opcodes
                    break;
                case 0x0C: case 0x0D: addrModeYindexed(); break;
                case 0x0E: addrModeXindexed(); break;
                case 0x0F: if ((IR[0] & 0xC0) != 0x80) addrModeXindexed(); //abs,x for illegal opcodes
                else addrModeYindexed(); //abs,y for LAX/SAX illegal opcodes
                    break;
            }
            Addr[0] &= 0xFFFF;

            switch ((IR[0] & 0xE0) >> 5) { //value-forming to cause gapless case-values and faster jump-table creation from switch-case

                case 0: if ((IR[0] & 0x1F) != 0x0B) { //ORA / SLO(ASO)=ASL+ORA
                    if ((IR[0] & 3) == 3) { clrNZC(); setC(rd(Addr[0])[0] >= N); wr(Addr[0], rd(Addr[0])[0] << 1); Cycles += 2; } //for SLO
                    else Cycles -= SamePage;
                    A[0] |= rd(Addr[0])[0]; setNZbyA(); //ORA
                }
                else { A[0] &= rd(Addr[0])[0]; setNZbyA(); setC(A[0] >= N); } //ANC (AND+Carry=bit7)
                    break;

                case 1: if ((IR[0] & 0x1F) != 0x0B) { //AND / RLA (ROL+AND)
                    if ((IR[0] & 3) == 3) { //for RLA
                        T[0] = (rd(Addr[0])[0] << 1) + (ST[0] & C); clrNZC(); setC(T[0] > 255); T[0] &= 0xFF; wr(Addr[0], T[0]); Cycles += 2;
                    }
                    else Cycles -= SamePage;
                    A[0] &= rd(Addr[0])[0]; setNZbyA(); //AND
                }
                else { A[0] &= rd(Addr[0])[0]; setNZbyA(); setC(A[0] >= N); } //ANC (AND+Carry=bit7)
                    break;

                case 2: if ((IR[0] & 0x1F) != 0x0B) { //EOR / SRE(LSE)=LSR+EOR
                    if ((IR[0] & 3) == 3) { clrNZC(); setC(rd(Addr[0])[0] & 1); wr(Addr[0], rd(Addr[0])[0] >> 1); Cycles += 2; } //for SRE
                    else Cycles -= SamePage;
                    A[0] ^= rd(Addr[0])[0]; setNZbyA(); //EOR
                }
                else { A[0] &= rd(Addr[0])[0]; setC(A[0] & 1); A[0] >>= 1; A[0] &= 0xFF; setNZbyA(); } //ALR(ASR)=(AND+LSR)
                    break;

                case 3: if ((IR[0] & 0x1F) != 0x0B) { //RRA (ROR+ADC) / ADC
                    if ((IR[0] & 3) == 3) { //for RRA
                        T[0] = (rd(Addr[0])[0] >> 1) + ((ST[0] & C) << 7); clrNZC(); setC(T[0] & 1); wr(Addr[0], T[0]); Cycles += 2;
                    }
                    else Cycles -= SamePage;
                    T[0] = A[0]; A[0] += rd(Addr[0])[0] + (ST[0] & C);
                    if ((ST[0] & D) && (A[0] & 0x0F) > 9) { A[0] += 0x10; A[0] &= 0xF0; } //BCD?
                    setNZCbyAdd(); setVbyAdd(rd(Addr[0])[0]); //ADC
                }
                else { // ARR (AND+ROR, bit0 not going to C, but C and bit7 get exchanged.)
                    A[0] &= rd(Addr[0])[0]; T[0] += rd(Addr[0])[0] + (ST[0] & C);
                    clrNVZC(); setC(T[0] > 255); setVbyAdd(rd(Addr[0])[0]); //V-flag set by intermediate ADC mechanism: (A&mem)+mem
                    T[0] = A[0]; A[0] = (A[0] >> 1) + ((ST[0] & C) << 7); setC(T[0] >= N); setNZbyA();
                }
                    break;

                case 4: if ((IR[0] & 0x1F) == 0x0B) { A[0] = X[0] & rd(Addr[0])[0]; setNZbyA(); } //XAA (TXA+AND), highly unstable on real 6502!
                else if ((IR[0] & 0x1F) == 0x1B) { SP[0] = A[0] & X[0]; wr(Addr[0], (SP[0] & ((Addr[0] >> 8) + 1))); } //TAS(SHS) (SP=A&X, mem=S&H} - unstable on real 6502
                else { wr2(Addr[0], new UnsignedChar([A[0] & (((IR[0] & 3) == 3) ? X[0] : 0xFF)])); } //STA / SAX (at times same as AHX/SHX/SHY) (illegal)
                    break;

                case 5: if ((IR[0] & 0x1F) != 0x1B) { A[0] = rd(Addr[0])[0]; if ((IR[0] & 3) == 3) X[0] = A[0]; } //LDA / LAX (illegal, used by my 1 rasterline player) (LAX #imm is unstable on C64)
                else { A[0] = X[0] = SP[0] = (rd(Addr[0])[0] & SP[0]); } //LAS(LAR)
                    setNZbyA(); Cycles -= SamePage;
                    break;

                case 6: if ((IR[0] & 0x1F) != 0x0B) { // CMP / DCP(DEC+CMP)
                    if ((IR[0] & 3) == 3) { wr(Addr[0], (rd(Addr[0])[0] - 1)); Cycles += 2; } //DCP
                    else Cycles -= SamePage;
                    T[0] = A[0] - rd(Addr[0])[0];
                }
                else { X[0] = T[0] = (A[0] & X[0]) - rd(Addr[0])[0]; } //SBX(AXS)  //SBX (AXS) (CMP+DEX at the same time)
                    T[0] = setNZCbySub(T)[0];
                    break;

                case 7: if ((IR[0] & 3) == 3 && (IR[0] & 0x1F) != 0x0B) { wr(Addr[0], rd(Addr[0])[0] + 1); Cycles += 2; } //ISC(ISB)=INC+SBC / SBC
                else Cycles -= SamePage;
                    T[0] = A[0]; A[0] -= rd(Addr[0])[0] + Number(!(ST[0] & C));
                    A[0] = setNZCbySub(A)[0]; setVbyAdd(~rd(Addr[0])[0]);
                    break;
            }
        }

        else if (IR[0] & 2) {  //nybble2:  2:illegal/LDX, 6:A/X/INC/DEC, A:Accu-shift/reg.transfer/NOP, E:shift/X/INC/DEC

            switch (IR[0] & 0x1F) { //Addressing modes
                case 0x02: addrModeImmediate(); break;
                case 0x06: addrModeZeropage(); break;
                case 0x0E: addrModeAbsolute(); break;
                case 0x16: if ((IR[0] & 0xC0) != 0x80) addrModeZeropageXindexed(); //zp,x
                else addrModeZeropageYindexed(); //zp,y
                    break;
                case 0x1E: if ((IR[0] & 0xC0) != 0x80) addrModeXindexed(); //abs,x
                else addrModeYindexed(); //abs,y
                    break;
            }
            Addr[0] &= 0xFFFF;

            switch ((IR[0] & 0xE0) >> 5) {

                case 0: clrC(); case 1:
                    if ((IR[0] & 0x0F) == 0x0A) { A[0] = (A[0] << 1) + (ST[0] & C); setNZCbyAdd(); } //ASL/ROL (Accu)
                    else { T[0] = (rd(Addr[0])[0] << 1) + (ST[0] & C); setC(T[0] > 255); setNZbyT(); wr(Addr[0], T[0]); Cycles += 2; } //RMW (Read-Write-Modify)
                    break;

                case 2: clrC(); case 3:
                    if ((IR[0] & 0x0F) == 0x0A) { T[0] = A[0]; A[0] = (A[0] >> 1) + ((ST[0] & C) << 7); setC(T[0] & 1); A[0] &= 0xFF; setNZbyA(); } //LSR/ROR (Accu)
                    else { T[0] = (rd(Addr[0])[0] >> 1) + ((ST[0] & C) << 7); setC(rd(Addr[0])[0] & 1); setNZbyT(); wr(Addr[0], T[0]); Cycles += 2; } //memory (RMW)
                    break;

                case 4: if (IR[0] & 4) { wr2(Addr[0], new UnsignedChar([X[0]])); } //STX
                else if (IR[0] & 0x10) SP[0] = X[0]; //TXS
                else { A[0] = X[0]; setNZbyA(); } //TXA
                    break;

                case 5: if ((IR[0] & 0x0F) != 0x0A) { X[0] = rd(Addr[0])[0]; Cycles -= SamePage; } //LDX
                else if (IR[0] & 0x10) X[0] = SP[0]; //TSX
                else X[0] = A[0]; //TAX
                    setNZbyX();
                    break;

                case 6: if (IR[0] & 4) { wr(Addr[0], rd(Addr[0])[0] - 1); setNZbyM(); Cycles += 2; } //DEC
                else { --X[0]; setNZbyX(); } //DEX
                    break;

                case 7: if (IR[0] & 4) { wr(Addr[0], rd(Addr[0])[0] + 1); setNZbyM(); Cycles += 2; } //INC/NOP
                    break;
            }
        }

        else if ((IR[0] & 0x0C) == 8) {  //nybble2:  8:register/statusflag
            if (IR[0] & 0x10) {
                if (IR[0] == 0x98) { A[0] = Y[0]; setNZbyA(); } //TYA
                else { //CLC/SEC/CLI/SEI/CLV/CLD/SED
                    if (FlagSwitches[IR[0] >> 5] & 0x20) ST[0] |= (FlagSwitches[IR[0] >> 5] & 0xDF);
                    else ST[0] &= ~(FlagSwitches[IR[0] >> 5] & 0xDF);
                }
            }
            else {
                switch ((IR[0] & 0xF0) >> 5) {
                    case 0: push(ST[0]); Cycles = 3; break; //PHP
                    case 1: ST[0] = pop(); Cycles = 4; break; //PLP
                    case 2: push(A[0]); Cycles = 3; break; //PHA
                    case 3: A[0] = pop(); setNZbyA(); Cycles = 4; break; //PLA
                    case 4: --Y[0]; setNZbyY(); break; //DEY
                    case 5: Y[0] = A[0]; setNZbyY(); break; //TAY
                    case 6: ++Y[0]; setNZbyY(); break; //INY
                    case 7: ++X[0]; setNZbyX(); break; //INX
                }
            }
        }

        else {  //nybble2:  0: control/branch/Y/compare  4: Y/compare  C:Y/compare/JMP

            if ((IR[0] & 0x1F) == 0x10) { //BPL/BMI/BVC/BVS/BCC/BCS/BNE/BEQ  relative branch
                ++PC[0];
                T[0] = rd(PC[0])[0]; if (T[0] & 0x80) T[0] -= 0x100;
                if (IR[0] & 0x20) {
                    if (ST[0] & BranchFlags[IR[0] >> 6]) { PC[0] += T[0]; Cycles = 3; }
                }
                else {
                    if (!(ST[0] & BranchFlags[IR[0] >> 6])) { PC[0] += T[0]; Cycles = 3; } //plus 1 cycle if page is crossed?
                }
            }

            else {  //nybble2:  0:Y/control/Y/compare  4:Y/compare  C:Y/compare/JMP
                switch (IR[0] & 0x1F) { //Addressing modes
                    case 0x00: addrModeImmediate(); break; //imm. (or abs.low for JSR/BRK)
                    case 0x04: addrModeZeropage(); break;
                    case 0x0C: addrModeAbsolute(); break;
                    case 0x14: addrModeZeropageXindexed(); break; //zp,x
                    case 0x1C: addrModeXindexed(); break; //abs,x
                }
                Addr[0] &= 0xFFFF;

                switch ((IR[0] & 0xE0) >> 5) {

                    case 0: if (!(IR[0] & 4)) { //BRK / NOP-absolute/abs,x/zp/zp,x
                        push((PC[0] + 2 - 1) >> 8); push(((PC[0] + 2 - 1) & 0xFF)); push((ST[0] | B)); ST[0] |= I; //BRK
                        PC[0] = rd(0xFFFE)[0] + (rd(0xFFFF)[0] << 8) - 1; Cycles = 7;
                    }
                    else if (IR[0] == 0x1C) Cycles -= SamePage; //NOP abs,x
                        break;

                    case 1: if (IR[0] & 0x0F) { //BIT / NOP-abs,x/zp,x
                        if (!(IR[0] & 0x10)) { ST[0] &= 0x3D; ST[0] |= (rd(Addr[0])[0] & 0xC0) | (Number(!(A[0] & rd(Addr[0])[0])) << 1); } //BIT
                        else if (IR[0] == 0x3C) Cycles -= SamePage; //NOP abs,x
                    }
                    else { //JSR
                        push((PC[0] + 2 - 1) >> 8); push(((PC[0] + 2 - 1) & 0xFF));
                        PC[0] = rd(Addr[0])[0] + rd(Addr[0] + 1)[0] * 256 - 1; Cycles = 6;
                    }
                        break;

                    case 2: if (IR[0] & 0x0F) { //JMP / NOP-abs,x/zp/zp,x
                        if (IR[0] == 0x4C) { //JMP
                            PC[0] = Addr[0] - 1; Cycles = 3;
                            rd(Addr[0] + 1); //a read from jump-address highbyte is used in some tunes with jmp DD0C (e.g. Wonderland_XIII_tune_1.sid)
                            //if (Addr[0]==PrevPC[0]) {storeReg(); C64->Returned=1; return 0xFF;} //turn self-jump mainloop (after init) into idle time
                        }
                        else if (IR[0] == 0x5C) Cycles -= SamePage; //NOP abs,x
                    }
                    else { //RTI
                        ST[0] = pop(); T[0] = pop(); PC[0] = (pop() << 8) + T[0] - 1; Cycles = 6;
                        if (C64.Returned && SP[0] >= 0xFF) { ++PC[0]; storeReg(); return 0xFE; }
                    }
                        break;

                    case 3: if (IR[0] & 0x0F) { //JMP() (indirect) / NOP-abs,x/zp/zp,x
                        if (IR[0] == 0x6C) { //JMP() (indirect)
                            PC[0] = rd((Addr[0] & 0xFF00) + ((Addr[0] + 1) & 0xFF))[0]; //(with highbyte-wraparound bug)
                            PC[0] = (PC[0] << 8) + rd(Addr[0])[0] - 1; Cycles = 5;
                        }
                        else if (IR[0] == 0x7C) Cycles -= SamePage; //NOP abs,x
                    }
                    else { //RTS
                        if (SP[0] >= 0xFF) { storeReg(); C64.Returned = true; return 0xFF; } //Init returns, provide idle-time between IRQs
                        T[0] = pop(); PC[0] = (pop() << 8) + T[0]; Cycles = 6;
                    }
                        break;

                    case 4: if (IR[0] & 4) { wr2(Addr[0], new UnsignedChar([Y[0]])); } //STY / NOP #imm
                        break;

                    case 5: Y[0] = rd(Addr[0])[0]; setNZbyY(); Cycles -= SamePage; //LDY
                        break;

                    case 6: if (!(IR[0] & 0x10)) { //CPY / NOP abs,x/zp,x
                        T[0] = Y[0] - rd(Addr[0])[0]; T[0] = setNZCbySub(T)[0]; //CPY
                    }
                    else if (IR[0] == 0xDC) Cycles -= SamePage; //NOP abs,x
                        break;

                    case 7: if (!(IR[0] & 0x10)) { //CPX / NOP abs,x/zp,x
                        T[0] = X[0] - rd(Addr[0])[0]; T[0] = setNZCbySub(T)[0]; //CPX
                    }
                    else if (IR[0] == 0xFC) Cycles -= SamePage; //NOP abs,x
                        break;
                }
            }
        }

        ++PC[0]; //PC&=0xFFFF;

        storeReg();

        if (!C64.RealSIDmode) { //substitute KERNAL IRQ-return in PSID (e.g. Microprose Soccer)
            if ((C64.RAMbank[1] & 3) > 1 && PrevPC[0] < 0xE000 && (PC[0] == 0xEA31 || PC[0] == 0xEA81 || PC[0] == 0xEA7E)) return 0xFE;
        }

        return Cycles & 0xFF;
    }

    //handle entering into IRQ and NMI interrupt
    handleCPUinterrupts(): boolean {
        // console.debug("handleCPUinterrupts")
        const push = (value: number): void => { C64.RAMbank[0x100 + this.SP[0]] = value; --this.SP[0]; this.SP[0] &= 0xFF; } //push a value to stack

        if (C64.NMI[0] > this.PrevNMI[0]) { //if IRQ and NMI at the same time, NMI is serviced first
            push(this.PC[0] >> 8); push((this.PC[0] & 0xFF)); push(this.ST[0]); this.ST[0] |= I;
            this.PC[0] = MEM.readMem(0xFFFA)[0] + (MEM.readMem(0xFFFB)[0] << 8); //NMI-vector
            this.PrevNMI[0] = C64.NMI[0];
            return true;
        }
        else if (C64.IRQ && !(this.ST[0] & I)) {
            push(this.PC[0] >> 8); push((this.PC[0] & 0xFF)); push(this.ST[0]); this.ST[0] |= I;
            this.PC[0] = MEM.readMem(0xFFFE)[0] + (MEM.readMem(0xFFFF)[0] << 8); //maskable IRQ-vector
            this.PrevNMI[0] = C64.NMI[0];
            return true;
        }
        this.PrevNMI[0] = C64.NMI[0]; //prepare for NMI edge-detection

        return false;
    }
}
