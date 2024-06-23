//cRSID CPU-emulation

import { UnsignedChar, UnsignedShort, Short, Int } from "./types";

import { C64 } from "./C64";
import { MEM } from "./MEM";
import { NMI } from "./CPU";

// StatusFlagBitValues
const
    N = 0x80, V = 0x40, B = 0x10, D = 0x08, I = 0x04, Z = 0x02, C = 0x01;

const
    FlagSwitches: UnsignedChar = new UnsignedChar([0x01, 0x21, 0x04, 0x24, 0x00, 0x40, 0x08, 0x28])
const
    BranchFlags: UnsignedChar = new UnsignedChar([0x80, 0x40, 0x01, 0x02])

class Address {
    #IR: UnsignedChar = new UnsignedChar(1); #ST: UnsignedChar = new UnsignedChar(1); #X: UnsignedChar = new UnsignedChar(1); #Y: UnsignedChar = new UnsignedChar(1);
    #A: Short = new Short(1); #SP: Short = new Short(1); #T: Short = new Short(1);
    #PC: UnsignedShort = new UnsignedShort(1); #Addr: UnsignedShort = new UnsignedShort(1); #PrevPC: UnsignedShort = new UnsignedShort(1);

    set IR(value: number) { this.#IR[0] = value }
    get IR(): number { return this.#IR[0] }
    set ST(value: number) { this.#ST[0] = value }
    get ST(): number { return this.#ST[0] }
    set X(value: number) { this.#X[0] = value }
    get X(): number { return this.#X[0] }
    set Y(value: number) { this.#Y[0] = value }
    get Y(): number { return this.#Y[0] }

    set A(value: number) { this.#A[0] = value }
    get A(): number { return this.#A[0] }
    set SP(value: number) { this.#SP[0] = value }
    get SP(): number { return this.#SP[0] }
    set T(value: number) { this.#T[0] = value }
    get T(): number { return this.#T[0] }

    set PC(value: number) { this.#PC[0] = value }
    get PC(): number { return this.#PC[0] }
    set Addr(value: number) { this.#Addr[0] = value }
    get Addr(): number { return this.#Addr[0] }
    set PrevPC(value: number) { this.#PrevPC[0] = value }
    get PrevPC(): number { return this.#PrevPC[0] }

    push(value: number): void { C64.RAMbank[0x100 + this.SP] = value; --this.SP; this.SP &= 0xFF; } //push a value to stack
    pop(): number { ++this.SP; this.SP &= 0xFF; return C64.RAMbank[0x100 + this.SP]; } //pop a value from stack
}

export class CPU extends Address {
    #PC: UnsignedShort = new UnsignedShort(1);
    #A: Short = new Short(1); #SP: Short = new Short(1);
    #X: UnsignedChar = new UnsignedChar(1); #Y: UnsignedChar = new UnsignedChar(1); #ST: UnsignedChar = new UnsignedChar(1);  //STATUS-flags: N V - B D I Z C
    #PrevNMI: UnsignedChar = new UnsignedChar(1); //used for NMI leading edge detection

    set PC(value: number) { this.#PC[0] = value }
    get PC(): number { return this.#PC[0] }

    set A(value: number) { this.#A[0] = value }
    get A(): number { return this.#A[0] }
    set SP(value: number) { this.#SP[0] = value }
    get SP(): number { return this.#SP[0] }

    set X(value: number) { this.#X[0] = value }
    get X(): number { return this.#X[0] }
    set Y(value: number) { this.#Y[0] = value }
    get Y(): number { return this.#Y[0] }
    set ST(value: number) { this.#ST[0] = value }
    get ST(): number { return this.#ST[0] }

    set PrevNMI(value: number) { this.#PrevNMI[0] = value }
    get PrevNMI(): number { return this.#PrevNMI[0] }

    constructor(mempos: number) {
        super()

        this.initCPU(mempos)
    }

    initCPU(mempos: number): void {
        this.PC = mempos; this.A = 0; this.X = 0; this.Y = 0; this.ST = 0x04; this.SP = 0xFF; this.PrevNMI = 0;
    }

    loadReg(): void { super.PC = this.PC; super.SP = this.SP; super.ST = this.ST; super.A = this.A; super.X = this.X; super.Y = this.Y; }
    storeReg(): void { this.PC = super.PC; this.SP = super.SP; this.ST = super.ST; this.A = super.A; this.X = super.X; this.Y = super.Y; }

    static rd(address: number): UnsignedChar {
        const value: UnsignedChar = MEM.readMem(address);
        if (C64.RealSIDmode) {
            if (C64.RAMbank[1] & 3) {
                if (address == 0xDC0D) { C64.CIA[1].acknowledgeCIAIRQ(); }
                else if (address == 0xDD0D) { C64.CIA[2].acknowledgeCIAIRQ(); }
            }
        }
        return value;
    }

    static wr(address: number, data: number): void {
        MEM.writeMem(address, data)
        if (C64.RealSIDmode && (C64.RAMbank[1] & 3)) {
            //if(data&1) { //only writing 1 to $d019 bit0 would acknowledge, not any value (but RMW instructions write $d019 back before mod.)
            if (address == 0xD019) { C64.VIC.acknowledgeVICrasterIRQ(); }
            //}
        }
    }

    static wr2(address: number, data: UnsignedChar): void { //PSID-hack specific memory-write
        const Tmp: Int = new Int(1);
        MEM.writeMem(address, data[0]);
        if (C64.RAMbank[1] & 3) {
            if (C64.RealSIDmode) {
                if (address == 0xDC0D) C64.CIA[1].writeCIAIRQmask(data[0]);
                else if (address == 0xDD0D) C64.CIA[2].writeCIAIRQmask(data[0]);
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
                            C64.FrameCycles = ((C64.IObankWR[0xDC04] + (C64.IObankWR[0xDC05] << 8))); //<< 4) / C64->SampleClockRatio;
                        }
                        break;
                    case 0xDC08: C64.IObankRD[0xDC08] = data[0]; break; //refresh TOD-clock
                    case 0xDC09: C64.IObankRD[0xDC09] = data[0]; break; //refresh TOD-clock
                    case 0xD012: //dynamic VIC IRQ-rasterline setting (Microprose Soccer V1 workaround)
                        if (C64.PrevRasterLine >= 0) { //was $d012 set before? (or set only once?)
                            if (C64.IObankWR[0xD012] != C64.PrevRasterLine) {
                                Tmp[0] = C64.IObankWR[0xD012] - C64.PrevRasterLine;
                                if (Tmp[0] < 0) Tmp[0] += C64.VIC.RasterLines;
                                C64.FrameCycleCnt = (C64.FrameCycles - Tmp[0] * C64.VIC.RasterRowCycles);
                            }
                        }
                        C64.PrevRasterLine = C64.IObankWR[0xD012];
                        break;
                }
            }

        }
    }

    emulateCPU(): number { //the CPU emulation for SID/PRG playback (ToDo: CIA/VIC-IRQ/NMI/RESET vectors, BCD-mode)
        // const C64: C64 = C64; //could be a parameter but function-call is faster this way if only 1 main CPU exists
        // const CPU: CPU = C64.CPU;

        let Cycles: number, SamePage: number;
        // const IR: UnsignedChar = new UnsignedChar(1), ST: UnsignedChar = new UnsignedChar(1), X: UnsignedChar = new UnsignedChar(1), Y: UnsignedChar = new UnsignedChar(1);
        // const A: Short = new Short(1), SP: Short = new Short(1), T: Short = new Short(1);
        // const PC: UnsignedShort = new UnsignedShort(1), Addr: UnsignedShort = new UnsignedShort(1), PrevPC: UnsignedShort = new UnsignedShort(1);

        // const loadReg = this.loadReg.bind(this)
        // const storeReg = this.storeReg.bind(this)

        const rd = CPU.rd
        const wr = CPU.wr
        const wr2 = CPU.wr2

        const addrModeImmediate = (): void => { ++super.PC; super.Addr = super.PC; Cycles = 2; } //imm.
        const addrModeZeropage = (): void => { ++super.PC; super.Addr = rd(super.PC)[0]; Cycles = 3; } //zp
        const addrModeAbsolute = (): void => { ++super.PC; super.Addr = rd(super.PC)[0]; ++super.PC; super.Addr += rd(super.PC)[0] << 8; Cycles = 4; } //abs
        const addrModeZeropageXindexed = (): void => { ++super.PC; super.Addr = (rd(super.PC)[0] + super.X) & 0xFF; Cycles = 4; } //zp,x (with zeropage-wraparound of 6502)
        const addrModeZeropageYindexed = (): void => { ++super.PC; super.Addr = (rd(super.PC)[0] + super.Y) & 0xFF; Cycles = 4; } //zp,y (with zeropage-wraparound of 6502)

        const addrModeXindexed = (): void => { // abs,x (only STA is 5 cycles, others are 4 if page not crossed, RMW:7)
            ++super.PC; super.Addr = rd(super.PC)[0] + super.X; ++super.PC; SamePage = Number(super.Addr <= 0xFF); super.Addr += rd(super.PC)[0] << 8; Cycles = 5;
        }

        const addrModeYindexed = (): void => { // abs,y (only STA is 5 cycles, others are 4 if page not crossed, RMW:7)
            ++super.PC; super.Addr = rd(super.PC)[0] + super.Y; ++super.PC; SamePage = Number(super.Addr <= 0xFF); super.Addr += rd(super.PC)[0] << 8; Cycles = 5;
        }

        const addrModeIndirectYindexed = (): void => { // (zp),y (only STA is 6 cycles, others are 5 if page not crossed, RMW:8)
            ++super.PC; super.Addr = rd(rd(super.PC)[0])[0] + super.Y; SamePage = Number(super.Addr <= 0xFF); super.Addr += rd((rd(super.PC)[0] + 1) & 0xFF)[0] << 8; Cycles = 6;
        }

        const addrModeXindexedIndirect = (): void => { // (zp,x)
            ++super.PC; super.Addr = (rd(rd(super.PC)[0] + super.X)[0] & 0xFF) + ((rd(rd(super.PC)[0] + super.X + 1)[0] & 0xFF) << 8); Cycles = 6;
        }

        const clrC = () => { super.ST &= ~C; } //clear Carry-flag
        const setC = (expr: number | boolean) => { super.ST &= ~C; super.ST |= Number(expr != 0); } //set Carry-flag if expression is not zero
        const clrNZC = () => { super.ST &= ~(N | Z | C); } //clear flags
        const clrNVZC = () => { super.ST &= ~(N | V | Z | C); } //clear flags
        const setNZbyA = () => { super.ST &= ~(N | Z); super.ST |= (Number(!super.A) << 1) | (super.A & N); } //set Negative-flag and Zero-flag based on result in Accumulator
        const setNZbyT = () => { super.T &= 0xFF; super.ST &= ~(N | Z); super.ST |= (Number(!super.T) << 1) | (super.T & N); }
        const setNZbyX = () => { super.ST &= ~(N | Z); super.ST |= (Number(!super.X) << 1) | (super.X & N); } //set Negative-flag and Zero-flag based on result in X-register
        const setNZbyY = () => { super.ST &= ~(N | Z); super.ST |= (Number(!super.Y) << 1) | (super.Y & N); } //set Negative-flag and Zero-flag based on result in Y-register
        const setNZbyM = () => { super.ST &= ~(N | Z); super.ST |= (Number(!rd(super.Addr)[0]) << 1) | (rd(super.Addr)[0] & N); } //set Negative-flag and Zero-flag based on result at Memory-Address
        const setNZCbyAdd = () => { super.ST &= ~(N | Z | C); super.ST |= (super.A & N) | Number(super.A > 255); super.A &= 0xFF; super.ST |= Number(!super.A) << 1; } //after increase/addition
        const setVbyAdd = (M: number) => { super.ST &= ~V; super.ST |= ((~(super.T ^ M)) & (super.T ^ super.A) & N) >> 1; } //calculate V-flag from A and T (previous A) and input2 (Memory)
        const setNZCbySub = (val: number): number => { super.ST &= ~(N | Z | C); super.ST |= (val & N) | Number(val >= 0); val &= 0xFF; super.ST |= (Number(!(val)) << 1); return val; }

        const push = this.push.bind(this)
        const pop = this.pop.bind(this)

        this.loadReg(); super.PrevPC = super.PC;
        super.IR = rd(super.PC)[0]; Cycles = 2; SamePage = 0; //'Cycles': ensure smallest 6510 runtime (for implied/register instructions)

        if (super.IR & 1) {  //nybble2:  1/5/9/D:accu.instructions, 3/7/B/F:illegal opcodes

            switch ((super.IR & 0x1F) >> 1) { //value-forming to cause jump-table //PC wraparound not handled inside to save codespace
                case 0x00: case 0x01: addrModeXindexedIndirect(); break; //(zp,x)
                case 0x02: case 0x03: addrModeZeropage(); break;
                case 0x04: case 0x05: addrModeImmediate(); break;
                case 0x06: case 0x07: addrModeAbsolute(); break;
                case 0x08: case 0x09: addrModeIndirectYindexed(); break; //(zp),y (5..6 cycles, 8 for R-M-W)
                case 0x0A: addrModeZeropageXindexed(); break; //zp,x
                case 0x0B: if ((super.IR & 0xC0) != 0x80) addrModeZeropageXindexed(); //zp,x for illegal opcodes
                else addrModeZeropageYindexed(); //zp,y for LAX/SAX illegal opcodes
                    break;
                case 0x0C: case 0x0D: addrModeYindexed(); break;
                case 0x0E: addrModeXindexed(); break;
                case 0x0F: if ((super.IR & 0xC0) != 0x80) addrModeXindexed(); //abs,x for illegal opcodes
                else addrModeYindexed(); //abs,y for LAX/SAX illegal opcodes
                    break;
            }
            super.Addr &= 0xFFFF;

            switch ((super.IR & 0xE0) >> 5) { //value-forming to cause gapless case-values and faster jump-table creation from switch-case

                case 0: if ((super.IR & 0x1F) != 0x0B) { //ORA / SLO(ASO)=ASL+ORA
                    if ((super.IR & 3) == 3) { clrNZC(); setC(rd(super.Addr)[0] >= N); wr(super.Addr, rd(super.Addr)[0] << 1); Cycles += 2; } //for SLO
                    else Cycles -= SamePage;
                    super.A |= rd(super.Addr)[0]; setNZbyA(); //ORA
                }
                else { super.A &= rd(super.Addr)[0]; setNZbyA(); setC(super.A >= N); } //ANC (AND+Carry=bit7)
                    break;

                case 1: if ((super.IR & 0x1F) != 0x0B) { //AND / RLA (ROL+AND)
                    if ((super.IR & 3) == 3) { //for RLA
                        super.T = (rd(super.Addr)[0] << 1) + (super.ST & C); clrNZC(); setC(super.T > 255); super.T &= 0xFF; wr(super.Addr, super.T); Cycles += 2;
                    }
                    else Cycles -= SamePage;
                    super.A &= rd(super.Addr)[0]; setNZbyA(); //AND
                }
                else { super.A &= rd(super.Addr)[0]; setNZbyA(); setC(super.A >= N); } //ANC (AND+Carry=bit7)
                    break;

                case 2: if ((super.IR & 0x1F) != 0x0B) { //EOR / SRE(LSE)=LSR+EOR
                    if ((super.IR & 3) == 3) { clrNZC(); setC(rd(super.Addr)[0] & 1); wr(super.Addr, rd(super.Addr)[0] >> 1); Cycles += 2; } //for SRE
                    else Cycles -= SamePage;
                    super.A ^= rd(super.Addr)[0]; setNZbyA(); //EOR
                }
                else { super.A &= rd(super.Addr)[0]; setC(super.A & 1); super.A >>= 1; super.A &= 0xFF; setNZbyA(); } //ALR(ASR)=(AND+LSR)
                    break;

                case 3: if ((super.IR & 0x1F) != 0x0B) { //RRA (ROR+ADC) / ADC
                    if ((super.IR & 3) == 3) { //for RRA
                        super.T = (rd(super.Addr)[0] >> 1) + ((super.ST & C) << 7); clrNZC(); setC(super.T & 1); wr(super.Addr, super.T); Cycles += 2;
                    }
                    else Cycles -= SamePage;
                    super.T = super.A; super.A += rd(super.Addr)[0] + (super.ST & C);
                    if ((super.ST & D) && (super.A & 0x0F) > 9) { super.A += 0x10; super.A &= 0xF0; } //BCD?
                    setNZCbyAdd(); setVbyAdd(rd(super.Addr)[0]); //ADC
                }
                else { // ARR (AND+ROR, bit0 not going to C, but C and bit7 get exchanged.)
                    super.A &= rd(super.Addr)[0]; super.T += rd(super.Addr)[0] + (super.ST & C);
                    clrNVZC(); setC(super.T > 255); setVbyAdd(rd(super.Addr)[0]); //V-flag set by intermediate ADC mechanism: (A&mem)+mem
                    super.T = super.A; super.A = (super.A >> 1) + ((super.ST & C) << 7); setC(super.T >= N); setNZbyA();
                }
                    break;

                case 4: if ((super.IR & 0x1F) == 0x0B) { super.A = super.X & rd(super.Addr)[0]; setNZbyA(); } //XAA (TXA+AND), highly unstable on real 6502!
                else if ((super.IR & 0x1F) == 0x1B) { super.SP = super.A & super.X; wr(super.Addr, (super.SP & ((super.Addr >> 8) + 1))); } //TAS(SHS) (SP=A&X, mem=S&H} - unstable on real 6502
                else { wr2(super.Addr, new UnsignedChar([super.A & (((super.IR & 3) == 3) ? super.X : 0xFF)])); } //STA / SAX (at times same as AHX/SHX/SHY) (illegal)
                    break;

                case 5: if ((super.IR & 0x1F) != 0x1B) { super.A = rd(super.Addr)[0]; if ((super.IR & 3) == 3) super.X = super.A; } //LDA / LAX (illegal, used by my 1 rasterline player) (LAX #imm is unstable on C64)
                else { super.A = super.X = super.SP = (rd(super.Addr)[0] & super.SP); } //LAS(LAR)
                    setNZbyA(); Cycles -= SamePage;
                    break;

                case 6: if ((super.IR & 0x1F) != 0x0B) { // CMP / DCP(DEC+CMP)
                    if ((super.IR & 3) == 3) { wr(super.Addr, (rd(super.Addr)[0] - 1)); Cycles += 2; } //DCP
                    else Cycles -= SamePage;
                    super.T = super.A - rd(super.Addr)[0];
                }
                else { super.X = super.T = (super.A & super.X) - rd(super.Addr)[0]; } //SBX(AXS)  //SBX (AXS) (CMP+DEX at the same time)
                    super.T = setNZCbySub(super.T);
                    break;

                case 7: if ((super.IR & 3) == 3 && (super.IR & 0x1F) != 0x0B) { wr(super.Addr, rd(super.Addr)[0] + 1); Cycles += 2; } //ISC(ISB)=INC+SBC / SBC
                else Cycles -= SamePage;
                    super.T = super.A; super.A -= rd(super.Addr)[0] + Number(!(super.ST & C));
                    super.A = setNZCbySub(super.A); setVbyAdd(~rd(super.Addr)[0]);
                    break;
            }
        }

        else if (super.IR & 2) {  //nybble2:  2:illegal/LDX, 6:A/X/INC/DEC, A:Accu-shift/reg.transfer/NOP, E:shift/X/INC/DEC

            switch (super.IR & 0x1F) { //Addressing modes
                case 0x02: addrModeImmediate(); break;
                case 0x06: addrModeZeropage(); break;
                case 0x0E: addrModeAbsolute(); break;
                case 0x16: if ((super.IR & 0xC0) != 0x80) addrModeZeropageXindexed(); //zp,x
                else addrModeZeropageYindexed(); //zp,y
                    break;
                case 0x1E: if ((super.IR & 0xC0) != 0x80) addrModeXindexed(); //abs,x
                else addrModeYindexed(); //abs,y
                    break;
            }
            super.Addr &= 0xFFFF;

            switch ((super.IR & 0xE0) >> 5) {

                case 0: clrC(); case 1:
                    if ((super.IR & 0x0F) == 0x0A) { super.A = (super.A << 1) + (super.ST & C); setNZCbyAdd(); } //ASL/ROL (Accu)
                    else { super.T = (rd(super.Addr)[0] << 1) + (super.ST & C); setC(super.T > 255); setNZbyT(); wr(super.Addr, super.T); Cycles += 2; } //RMW (Read-Write-Modify)
                    break;

                case 2: clrC(); case 3:
                    if ((super.IR & 0x0F) == 0x0A) { super.T = super.A; super.A = (super.A >> 1) + ((super.ST & C) << 7); setC(super.T & 1); super.A &= 0xFF; setNZbyA(); } //LSR/ROR (Accu)
                    else { super.T = (rd(super.Addr)[0] >> 1) + ((super.ST & C) << 7); setC(rd(super.Addr)[0] & 1); setNZbyT(); wr(super.Addr, super.T); Cycles += 2; } //memory (RMW)
                    break;

                case 4: if (super.IR & 4) { wr2(super.Addr, new UnsignedChar([super.X])); } //STX
                else if (super.IR & 0x10) super.SP = super.X; //TXS
                else { super.A = super.X; setNZbyA(); } //TXA
                    break;

                case 5: if ((super.IR & 0x0F) != 0x0A) { super.X = rd(super.Addr)[0]; Cycles -= SamePage; } //LDX
                else if (super.IR & 0x10) super.X = super.SP; //TSX
                else super.X = super.A; //TAX
                    setNZbyX();
                    break;

                case 6: if (super.IR & 4) { wr(super.Addr, rd(super.Addr)[0] - 1); setNZbyM(); Cycles += 2; } //DEC
                else { --super.X; setNZbyX(); } //DEX
                    break;

                case 7: if (super.IR & 4) { wr(super.Addr, rd(super.Addr)[0] + 1); setNZbyM(); Cycles += 2; } //INC/NOP
                    break;
            }
        }

        else if ((super.IR & 0x0C) == 8) {  //nybble2:  8:register/statusflag
            if (super.IR & 0x10) {
                if (super.IR == 0x98) { super.A = super.Y; setNZbyA(); } //TYA
                else { //CLC/SEC/CLI/SEI/CLV/CLD/SED
                    if (FlagSwitches[super.IR >> 5] & 0x20) super.ST |= (FlagSwitches[super.IR >> 5] & 0xDF);
                    else super.ST &= ~(FlagSwitches[super.IR >> 5] & 0xDF);
                }
            }
            else {
                switch ((super.IR & 0xF0) >> 5) {
                    case 0: push(super.ST); Cycles = 3; break; //PHP
                    case 1: super.ST = pop(); Cycles = 4; break; //PLP
                    case 2: push(super.A); Cycles = 3; break; //PHA
                    case 3: super.A = pop(); setNZbyA(); Cycles = 4; break; //PLA
                    case 4: --super.Y; setNZbyY(); break; //DEY
                    case 5: super.Y = super.A; setNZbyY(); break; //TAY
                    case 6: ++super.Y; setNZbyY(); break; //INY
                    case 7: ++super.X; setNZbyX(); break; //INX
                }
            }
        }

        else {  //nybble2:  0: control/branch/Y/compare  4: Y/compare  C:Y/compare/JMP

            if ((super.IR & 0x1F) == 0x10) { //BPL/BMI/BVC/BVS/BCC/BCS/BNE/BEQ  relative branch
                ++super.PC;
                super.T = rd(super.PC)[0]; if (super.T & 0x80) super.T -= 0x100;
                if (super.IR & 0x20) {
                    if (super.ST & BranchFlags[super.IR >> 6]) { super.PC += super.T; Cycles = 3; }
                }
                else {
                    if (!(super.ST & BranchFlags[super.IR >> 6])) { super.PC += super.T; Cycles = 3; } //plus 1 cycle if page is crossed?
                }
            }

            else {  //nybble2:  0:Y/control/Y/compare  4:Y/compare  C:Y/compare/JMP
                switch (super.IR & 0x1F) { //Addressing modes
                    case 0x00: addrModeImmediate(); break; //imm. (or abs.low for JSR/BRK)
                    case 0x04: addrModeZeropage(); break;
                    case 0x0C: addrModeAbsolute(); break;
                    case 0x14: addrModeZeropageXindexed(); break; //zp,x
                    case 0x1C: addrModeXindexed(); break; //abs,x
                }
                super.Addr &= 0xFFFF;

                switch ((super.IR & 0xE0) >> 5) {

                    case 0: if (!(super.IR & 4)) { //BRK / NOP-absolute/abs,x/zp/zp,x
                        push((super.PC + 2 - 1) >> 8); push(((super.PC + 2 - 1) & 0xFF)); push((super.ST | B)); super.ST |= I; //BRK
                        super.PC = rd(0xFFFE)[0] + (rd(0xFFFF)[0] << 8) - 1; Cycles = 7;
                    }
                    else if (super.IR == 0x1C) Cycles -= SamePage; //NOP abs,x
                        break;

                    case 1: if (super.IR & 0x0F) { //BIT / NOP-abs,x/zp,x
                        if (!(super.IR & 0x10)) { super.ST &= 0x3D; super.ST |= (rd(super.Addr)[0] & 0xC0) | (Number(!(super.A & rd(super.Addr)[0])) << 1); } //BIT
                        else if (super.IR == 0x3C) Cycles -= SamePage; //NOP abs,x
                    }
                    else { //JSR
                        push((super.PC + 2 - 1) >> 8); push(((super.PC + 2 - 1) & 0xFF));
                        super.PC = rd(super.Addr)[0] + rd(super.Addr + 1)[0] * 256 - 1; Cycles = 6;
                    }
                        break;

                    case 2: if (super.IR & 0x0F) { //JMP / NOP-abs,x/zp/zp,x
                        if (super.IR == 0x4C) { //JMP
                            super.PC = super.Addr - 1; Cycles = 3;
                            rd(super.Addr + 1); //a read from jump-address highbyte is used in some tunes with jmp DD0C (e.g. Wonderland_XIII_tune_1.sid)
                            //if (super.Addr==super.PrevPC) {storeReg(); C64->Returned=1; return 0xFF;} //turn self-jump mainloop (after init) into idle time
                        }
                        else if (super.IR == 0x5C) Cycles -= SamePage; //NOP abs,x
                    }
                    else { //RTI
                        super.ST = pop(); super.T = pop(); super.PC = (pop() << 8) + super.T - 1; Cycles = 6;
                        if (C64.Returned && super.SP >= 0xFF) { ++super.PC; this.storeReg(); return 0xFE; }
                    }
                        break;

                    case 3: if (super.IR & 0x0F) { //JMP() (indirect) / NOP-abs,x/zp/zp,x
                        if (super.IR == 0x6C) { //JMP() (indirect)
                            super.PC = rd((super.Addr & 0xFF00) + ((super.Addr + 1) & 0xFF))[0]; //(with highbyte-wraparound bug)
                            super.PC = (super.PC << 8) + rd(super.Addr)[0] - 1; Cycles = 5;
                        }
                        else if (super.IR == 0x7C) Cycles -= SamePage; //NOP abs,x
                    }
                    else { //RTS
                        if (super.SP >= 0xFF) { this.storeReg(); C64.Returned = true; return 0xFF; } //Init returns, provide idle-time between IRQs
                        super.T = pop(); super.PC = (pop() << 8) + super.T; Cycles = 6;
                    }
                        break;

                    case 4: if (super.IR & 4) { wr2(super.Addr, new UnsignedChar([super.Y])); } //STY / NOP #imm
                        break;

                    case 5: super.Y = rd(super.Addr)[0]; setNZbyY(); Cycles -= SamePage; //LDY
                        break;

                    case 6: if (!(super.IR & 0x10)) { //CPY / NOP abs,x/zp,x
                        super.T = super.Y - rd(super.Addr)[0]; super.T = setNZCbySub(super.T); //CPY
                    }
                    else if (super.IR == 0xDC) Cycles -= SamePage; //NOP abs,x
                        break;

                    case 7: if (!(super.IR & 0x10)) { //CPX / NOP abs,x/zp,x
                        super.T = super.X - rd(super.Addr)[0]; super.T = setNZCbySub(super.T); //CPX
                    }
                    else if (super.IR == 0xFC) Cycles -= SamePage; //NOP abs,x
                        break;
                }
            }
        }

        ++super.PC; //PC&=0xFFFF;

        this.storeReg();

        if (!C64.RealSIDmode) { //substitute KERNAL IRQ-return in PSID (e.g. Microprose Soccer)
            if ((C64.RAMbank[1] & 3) > 1 && super.PrevPC < 0xE000 && (super.PC == 0xEA31 || super.PC == 0xEA81 || super.PC == 0xEA7E)) return 0xFE;
        }

        return Cycles;
    }

    //handle entering into IRQ and NMI interrupt
    handleCPUinterrupts(): boolean {
        const push = (value: number): void => { C64.RAMbank[0x100 + this.SP] = value; --this.SP; this.SP &= 0xFF; } //push a value to stack

        if (C64.NMI > this.PrevNMI) { //if IRQ and NMI at the same time, NMI is serviced first
            push(this.PC >> 8); push((this.PC & 0xFF)); push(this.ST); this.ST |= I;
            this.PC = MEM.readMem(NMI + 0)[0] + (MEM.readMem(NMI + 1)[0] << 8); //NMI-vector
            this.PrevNMI = C64.NMI;
            return true;
        }
        else if (C64.IRQ && !(this.ST & I)) {
            push(this.PC >> 8); push((this.PC & 0xFF)); push(this.ST); this.ST |= I;
            this.PC = MEM.readMem(0xFFFE)[0] + (MEM.readMem(0xFFFF)[0] << 8); //maskable IRQ-vector
            this.PrevNMI = C64.NMI;
            return true;
        }
        this.PrevNMI = C64.NMI; //prepare for NMI edge-detection

        return false;
    }
}
