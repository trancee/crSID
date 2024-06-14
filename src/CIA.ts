//cRSID CIA emulation

import { UnsignedChar, UnsignedShort } from "./types";

import { C64 } from "./C64";

// CIAregisters
export const
    PORTA = 0x00, PORTB = 0x01, DDRA = 0x02, DDRB = 0x03,
    TIMERAL = 0x04, TIMERAH = 0x05, TIMERBL = 0x06, TIMERBH = 0x07,    //Write:Set Timer-latch, Read: read Timer
    TOD_TENTHSECONDS = 0x08, TOD_SECONDS = 0x09, TOD_MINUTES = 0x0A, TOD_HOURS = 0x0B,
    SERIAL_DATA = 0x0C, INTERRUPTS = 0x0D, CONTROLA = 0x0E, CONTROLB = 0x0F

// InterruptBitVal
export const
    INTERRUPT_HAPPENED = 0x80, SET_OR_CLEAR_FLAGS = 0x80, //(Read or Write operation determines which one:)
    FLAGn = 0x10, SERIALPORT = 0x08, ALARM = 0x04, TIMERB = 0x02, TIMERA = 0x01 //flags/masks of interrupt-sources

// ControlAbitVal
export const
    ENABLE_TIMERA = 0x01, PORTB6_TIMERA = 0x02, TOGGLED_PORTB6 = 0x04, ONESHOT_TIMERA = 0x08,
    FORCELOADA_STROBE = 0x10, TIMERA_FROM_CNT = 0x20, SERIALPORT_IS_OUTPUT = 0x40, TIMEOFDAY_50Hz = 0x80

// ControlBbitVal
export const
    ENABLE_TIMERB = 0x01, PORTB7_TIMERB = 0x02, TOGGLED_PORTB7 = 0x04, ONESHOT_TIMERB = 0x08,
    FORCELOADB_STROBE = 0x10, TIMERB_FROM_CPUCLK = 0x00, TIMERB_FROM_CNT = 0x20, TIMERB_FROM_TIMERA = 0x40,
    TIMERB_FROM_TIMERA_AND_CNT = 0x60, TIMEOFDAY_WRITE_SETS_ALARM = 0x80

export class CIA {
    #BaseAddress: UnsignedShort = new UnsignedShort(1); //CIA-baseaddress location in C64-memory (IO)

    #BasePtrWR: UnsignedChar; //CIA-baseaddress location in host's memory for writing
    #BasePtrRD: UnsignedChar; //CIA-baseaddress location in host's memory for reading

    constructor(baseaddress: number) {
        this.#BaseAddress[0] = baseaddress;

        this.#BasePtrWR = C64.IObankWR.Ptr(baseaddress)
        this.#BasePtrRD = C64.IObankRD.Ptr(baseaddress)

        this.initCIAchip();
    }

    initCIAchip() {
        for (let i = 0; i < 0x10; ++i) this.#BasePtrWR[i] = this.#BasePtrRD[i] = 0x00;
    }

    emulateCIA(cycles: number): number {
        //TimerA
        if (this.#BasePtrWR[CONTROLA] & FORCELOADA_STROBE) { //force latch into counter (strobe-input)
            this.#BasePtrRD[TIMERAH] = this.#BasePtrWR[TIMERAH]; this.#BasePtrRD[TIMERAL] = this.#BasePtrWR[TIMERAL];
        }
        else if ((this.#BasePtrWR[CONTROLA] & (ENABLE_TIMERA | TIMERA_FROM_CNT)) == ENABLE_TIMERA) { //Enabled, counts Phi2
            let Tmp = ((this.#BasePtrRD[TIMERAH] << 8) + this.#BasePtrRD[TIMERAL]) - cycles; //count timer
            if (Tmp <= 0) { //Timer counted down
                Tmp += (this.#BasePtrWR[TIMERAH] << 8) + this.#BasePtrWR[TIMERAL]; //reload timer
                if (this.#BasePtrWR[CONTROLA] & ONESHOT_TIMERA) this.#BasePtrWR[CONTROLA] &= ~ENABLE_TIMERA; //disable if one-shot
                this.#BasePtrRD[INTERRUPTS] |= TIMERA;
                if (this.#BasePtrWR[INTERRUPTS] & TIMERA) { //generate interrupt if mask allows
                    this.#BasePtrRD[INTERRUPTS] |= INTERRUPT_HAPPENED;
                }
            }
            this.#BasePtrRD[TIMERAH] = (Tmp >> 8) & 0xFF; this.#BasePtrRD[TIMERAL] = Tmp & 0xFF;
        }
        this.#BasePtrWR[CONTROLA] &= ~FORCELOADA_STROBE; //strobe is edge-sensitive
        this.#BasePtrRD[CONTROLA] = this.#BasePtrWR[CONTROLA]; //control-registers are readable

        //TimerB
        if (this.#BasePtrWR[CONTROLB] & FORCELOADB_STROBE) { //force latch into counter (strobe-input)
            this.#BasePtrRD[TIMERBH] = this.#BasePtrWR[TIMERBH]; this.#BasePtrRD[TIMERBL] = this.#BasePtrWR[TIMERBL];
        } //what about clocking TimerB by TimerA? (maybe not used in any music)
        else if ((this.#BasePtrWR[CONTROLB] & (ENABLE_TIMERB | TIMERB_FROM_TIMERA)) == ENABLE_TIMERB) { //Enabled, counts Phi2
            let Tmp = ((this.#BasePtrRD[TIMERBH] << 8) + this.#BasePtrRD[TIMERBL]) - cycles;//count timer
            if (Tmp <= 0) { //Timer counted down
                Tmp += (this.#BasePtrWR[TIMERBH] << 8) + this.#BasePtrWR[TIMERBL]; //reload timer
                if (this.#BasePtrWR[CONTROLB] & ONESHOT_TIMERB) this.#BasePtrWR[CONTROLB] &= ~ENABLE_TIMERB; //disable if one-shot
                this.#BasePtrRD[INTERRUPTS] |= TIMERB;
                if (this.#BasePtrWR[INTERRUPTS] & TIMERB) { //generate interrupt if mask allows
                    this.#BasePtrRD[INTERRUPTS] |= INTERRUPT_HAPPENED;
                }
            }
            this.#BasePtrRD[TIMERBH] = (Tmp >> 8); this.#BasePtrRD[TIMERBL] = Tmp & 0xFF;
        }
        this.#BasePtrWR[CONTROLB] &= ~FORCELOADB_STROBE; //strobe is edge-sensitive
        this.#BasePtrRD[CONTROLB] = this.#BasePtrWR[CONTROLB]; //control-registers are readable

        return this.#BasePtrRD[INTERRUPTS] & INTERRUPT_HAPPENED;
    }

    writeCIAIRQmask(value: number): void {
        if (value & SET_OR_CLEAR_FLAGS) this.#BasePtrWR[INTERRUPTS] |= (value & (FLAGn | SERIALPORT | ALARM | TIMERB | TIMERA));
        else this.#BasePtrWR[INTERRUPTS] &= ~(value & (FLAGn | SERIALPORT | ALARM | TIMERB | TIMERA));
    }

    acknowledgeCIAIRQ(): void {
        this.#BasePtrRD[INTERRUPTS] = 0x00; //reading a CIA interrupt-register clears its read-part and IRQ-flag
    }
}
