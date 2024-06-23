//cRSID SID emulation engine

// https://github.com/hpwit/SID6581

import { UnsignedChar, Char, UnsignedShort, Short, UnsignedInt, Int, debugArray } from "./types"

import { C64 } from "./C64"

import { ADSR_DAC_6581, SawTriangle, PulseTriangle, PulseSawtooth, PulseSawTriangle } from "./SIDwaves"
import { Resonances8580, Resonances6581, CutoffMul8580_44100Hz, CutoffMul6581_44100Hz } from "./SIDfilter"

export enum ChipModel { UNKNOWN = 0b00, MOS6581 = 0b01, MOS8580 = 0b10, BOTH = 0b11 };
export enum Channels { CHANNEL_LEFT = 1, CHANNEL_RIGHT = 2, CHANNEL_BOTH = 3 };

// ADSRstateBits
const
    GATE_BITVAL = 0x01, ATTACK_BITVAL = 0x80, DECAYSUSTAIN_BITVAL = 0x40, HOLDZEROn_BITVAL = 0x10

const
    ADSRprescalePeriods: Short = new Short([
        9, 32, 63, 95, 149, 220, 267, 313, 392, 977, 1954, 3126, 3907, 11720, 19532, 31251
    ]);

const
    ADSRexponentPeriods: UnsignedChar = new UnsignedChar([
        1, 30, 30, 30, 30, 30, 30, 16, 16, 16, 16, 16, 16, 16, 16,
        8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 4, //pos0:1  pos6:30  pos14:16  pos26:8
        4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, //pos54:4 //pos93:2
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ]);

// SIDspecs
const
    CHANNELS = 3, VOLUME_MAX = 0x0F, D418_DIGI_VOLUME = 2 //digi-channel is counted too

// WaveFormBits
const
    NOISE_BITVAL = 0x80, PULSE_BITVAL = 0x40, SAW_BITVAL = 0x20, TRI_BITVAL = 0x10

// ControlBits
const
    TEST_BITVAL = 0x08, RING_BITVAL = 0x04, SYNC_BITVAL = 0x02 // , GATE_BITVAL = 0x01

// FilterBits
const
    OFF3_BITVAL = 0x80, HIGHPASS_BITVAL = 0x40, BANDPASS_BITVAL = 0x20, LOWPASS_BITVAL = 0x10

const
    FilterSwitchVal: UnsignedChar = new UnsignedChar([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 4]);

export type SIDwavOutput = {
    NonFilted: number
    FilterInput: number
}

export class SID {
    //SID-chip data:
    #ChipModel: ChipModel;   //values: 8580 / 6581
    #Channel: Channels;      //1:left, 2:right, 3:both(middle)
    #BaseAddress: UnsignedShort = new UnsignedShort;    //SID-baseaddress location in C64-memory (IO)
    #BasePtr: UnsignedChar;    //SID-baseaddress location in host's memory

    get ChipModel(): ChipModel { return this.#ChipModel }
    set ChipModel(model: ChipModel) { this.#ChipModel = model }
    get Channel(): Channels { return this.#Channel }
    set Channel(channel: Channels) { this.#Channel = channel }
    get BaseAddress(): number { return this.#BaseAddress[0] }
    get Available(): boolean { return this.#BaseAddress.length > 0 }

    //ADSR-related:
    #ADSRstate: UnsignedChar = new UnsignedChar(CHANNELS);
    #RateCounter: UnsignedShort = new UnsignedShort(CHANNELS);
    #EnvelopeCounter: UnsignedChar = new UnsignedChar(CHANNELS);
    #ExponentCounter: UnsignedChar = new UnsignedChar(CHANNELS);

    //Wave-related:
    #PhaseAccu: Int = new Int(CHANNELS);       //28bit precision instead of 24bit
    #PrevPhaseAccu: Int = new Int(CHANNELS);   //(integerized ClockRatio fractionals, WebSID has similar solution)
    #SyncSourceMSBrise: UnsignedChar = new UnsignedChar(1); // FIXME: boolean?
    #RingSourceMSB: UnsignedShort = new UnsignedShort(1);
    #NoiseLFSR: UnsignedInt = new UnsignedInt(CHANNELS);
    #PrevWavGenOut: UnsignedInt = new UnsignedInt(CHANNELS);
    #PrevWavData: UnsignedChar = new UnsignedChar(CHANNELS);

    //Filter-related:
    #PrevLowPass: Int = new Int(1);
    #PrevBandPass: Int = new Int(1);

    //Output-stage:
    #NonFiltedSample: Int = new Int(1);
    #FilterInputSample: Int = new Int(1);
    #PrevNonFiltedSample: Int = new Int(1);
    #PrevFilterInputSample: Int = new Int(1);
    #PrevVolume: Int = new Int(1); //lowpass-filtered version of Volume-band register
    #Output: Int = new Int(1);     //not attenuated (range:0..0xFFFFF depending on SID's main-volume)
    #Level: Int = new Int(1);      //filtered version, good for VU-meter display

    set NonFiltedSample(value: number) { this.#NonFiltedSample[0] = value }
    set FilterInputSample(value: number) { this.#FilterInputSample[0] = value }
    set PrevNonFiltedSample(value: number) { this.#PrevNonFiltedSample[0] = value }
    set PrevFilterInputSample(value: number) { this.#PrevFilterInputSample[0] = value }
    set Output(value: number) { this.#Output[0] = value }
    set Level(value: number) { this.#Level[0] = value }

    constructor(model: ChipModel = ChipModel.UNKNOWN, channel: Channels = Channels.CHANNEL_BOTH, baseaddress: number = 0) {
        //SID.C64 = C64;
        this.#ChipModel = model; this.#Channel = channel;
        if (baseaddress >= 0xD400 && (baseaddress < 0xD800 || (0xDE00 <= baseaddress && baseaddress <= 0xDFE0))) { //check valid address, avoid Color-RAM
            this.#BaseAddress[0] = baseaddress; this.#BasePtr = C64.IObankWR.Ptr(baseaddress);
        }
        else { this.#BaseAddress = new UnsignedShort; this.#BasePtr = new UnsignedChar; }

        this.initSIDchip();
    }

    initSIDchip(): void {
        for (let Channel = 0; Channel < CHANNELS; Channel++) {
            this.#ADSRstate[Channel] = 0; this.#RateCounter[Channel] = 0;
            this.#EnvelopeCounter[Channel] = 0; this.#ExponentCounter[Channel] = 0;
            this.#PhaseAccu[Channel] = 0; this.#PrevPhaseAccu[Channel] = 0;
            this.#NoiseLFSR[Channel] = 0x7FFFFF;
            this.#PrevWavGenOut[Channel] = 0; this.#PrevWavData[Channel] = 0;
        }
        this.#SyncSourceMSBrise[0] = 0; this.#RingSourceMSB[0] = 0;
        this.#PrevLowPass[0] = this.#PrevBandPass[0] = this.#PrevVolume[0] = 0;
    }

    emulateADSRs(cycles: number): void {
        const PrevGate: UnsignedChar = new UnsignedChar(1), AD: UnsignedChar = new UnsignedChar(1), SR: UnsignedChar = new UnsignedChar(1);
        const PrescalePeriod: UnsignedShort = new UnsignedShort(1);

        for (let Channel = 0; Channel < CHANNELS; Channel++) {
            const ChannelPtr: UnsignedChar = this.#BasePtr.Ptr(Channel * 7, 7); AD[0] = ChannelPtr[5]; SR[0] = ChannelPtr[6];
            PrevGate[0] = (this.#ADSRstate[Channel] & GATE_BITVAL);
            if (PrevGate[0] != (ChannelPtr[4] & GATE_BITVAL)) { //gatebit-change?
                if (PrevGate[0]) this.#ADSRstate[Channel] &= ~(GATE_BITVAL | ATTACK_BITVAL | DECAYSUSTAIN_BITVAL); //falling edge
                else this.#ADSRstate[Channel] = (GATE_BITVAL | ATTACK_BITVAL | DECAYSUSTAIN_BITVAL | HOLDZEROn_BITVAL); //rising edge
            }

            if (this.#ADSRstate[Channel] & ATTACK_BITVAL) PrescalePeriod[0] = ADSRprescalePeriods[AD[0] >> 4];
            else if (this.#ADSRstate[Channel] & DECAYSUSTAIN_BITVAL) PrescalePeriod[0] = ADSRprescalePeriods[AD[0] & 0x0F];
            else PrescalePeriod[0] = ADSRprescalePeriods[SR[0] & 0x0F];

            this.#RateCounter[Channel] += cycles; if (this.#RateCounter[Channel] >= 0x8000) this.#RateCounter[Channel] -= 0x8000; //*RateCounterPtr &= 0x7FFF; //can wrap around (ADSR delay-bug: short 1st frame)

            if (PrescalePeriod[0] <= this.#RateCounter[Channel] && this.#RateCounter[Channel] < PrescalePeriod[0] + cycles) { //ratecounter shot (matches rateperiod) (in genuine SID ratecounter is LFSR)
                this.#RateCounter[Channel] -= PrescalePeriod[0]; //reset rate-counter on period-match
                if ((this.#ADSRstate[Channel] & ATTACK_BITVAL) || ++(this.#ExponentCounter[Channel]) == ADSRexponentPeriods[this.#EnvelopeCounter[Channel]]) {
                    this.#ExponentCounter[Channel] = 0;
                    if (this.#ADSRstate[Channel] & HOLDZEROn_BITVAL) {
                        if (this.#ADSRstate[Channel] & ATTACK_BITVAL) {
                            ++(this.#EnvelopeCounter[Channel]);
                            if (this.#EnvelopeCounter[Channel] == 0xFF) this.#ADSRstate[Channel] &= ~ATTACK_BITVAL;
                        }
                        else if (!(this.#ADSRstate[Channel] & DECAYSUSTAIN_BITVAL) || this.#EnvelopeCounter[Channel] != (SR[0] & 0xF0) + (SR[0] >> 4)) {
                            --(this.#EnvelopeCounter[Channel]); //resid adds 1 cycle delay, we omit that mechanism here
                            if (this.#EnvelopeCounter[Channel] == 0) this.#ADSRstate[Channel] &= ~HOLDZEROn_BITVAL;
                        }
                    }
                }
            }
        }
    }

    emulateWaves(): Int {
        const MainVolume: Char = new Char(1);
        const WF: UnsignedChar = new UnsignedChar(1), TestBit: UnsignedChar = new UnsignedChar(1), Envelope: UnsignedChar = new UnsignedChar(1), FilterSwitchReso: UnsignedChar = new UnsignedChar(1), VolumeBand: UnsignedChar = new UnsignedChar(1);
        let Channel: number;
        const Utmp: UnsignedInt = new UnsignedInt(1), PhaseAccuStep: UnsignedInt = new UnsignedInt(1), MSB: UnsignedInt = new UnsignedInt(1), WavGenOut: UnsignedInt = new UnsignedInt(1), PW: UnsignedInt = new UnsignedInt(1);
        const Tmp: Int = new Int(1), Feedback: Int = new Int(1), Steepness: Int = new Int(1), PulsePeak: Int = new Int(1);
        // let FilterInput: Int = new Int(1), Cutoff: Int = new Int(1), Resonance: Int = new Int(1), FilterOutput: Int = new Int(1), NonFilted: Int = new Int(1), Output: Int = new Int(1);
        let ChannelPtr: UnsignedChar;
        let PhaseAccuPtr: Int;

        const combinedWF = (WFarray: UnsignedChar, oscval: UnsignedShort): UnsignedShort => {
            const Pitch: UnsignedChar = new UnsignedChar(1);
            const Filt: UnsignedShort = new UnsignedShort(1);
            if (this.#ChipModel == ChipModel.MOS6581 && WFarray != PulseTriangle) oscval[0] &= 0x7FFF;
            Pitch[0] = ChannelPtr[1] ? ChannelPtr[1] : 1; //avoid division by zero
            Filt[0] = 0x7777 + (0x8888 / Pitch[0]);
            this.#PrevWavData[Channel] = (WFarray[oscval[0] >> 4] * Filt[0] + this.#PrevWavData[Channel] * (0xFFFF - Filt[0])) >> 16;
            return new UnsignedShort([this.#PrevWavData[Channel] << 8]);
        }

        this.#NonFiltedSample[0] = this.#FilterInputSample[0] = 0;
        FilterSwitchReso[0] = this.#BasePtr[0x17]; VolumeBand[0] = this.#BasePtr[0x18];

        //Waveform-generator //(phase accumulator and waveform-selector)

        for (Channel = 0; Channel < 21; Channel += 7) {
            ChannelPtr = this.#BasePtr.Ptr(Channel, 7);

            WF[0] = ChannelPtr[4]; TestBit[0] = Number((WF[0] & TEST_BITVAL) != 0);
            PhaseAccuPtr = this.#PhaseAccu.Ptr(Channel, 7);

            PhaseAccuStep[0] = ((ChannelPtr[1] << 8) + ChannelPtr[0]) * /*SID.*/C64.SampleClockRatio;
            if (TestBit[0] || ((WF[0] & SYNC_BITVAL) && this.#SyncSourceMSBrise[0])) PhaseAccuPtr[0] = 0;
            else { //stepping phase-accumulator (oscillator)
                PhaseAccuPtr[0] += PhaseAccuStep[0];
                if (PhaseAccuPtr[0] >= 0x10000000) PhaseAccuPtr[0] -= 0x10000000;
            }
            PhaseAccuPtr[0] &= 0xFFFFFFF;
            MSB[0] = PhaseAccuPtr[0] & 0x8000000;
            this.#SyncSourceMSBrise[0] = (MSB[0] > (this.#PrevPhaseAccu[Channel] & 0x8000000)) ? 1 : 0;

            if (WF[0] & NOISE_BITVAL) { //noise waveform
                Tmp[0] = this.#NoiseLFSR[Channel]; //clock LFSR all time if clockrate exceeds observable at given samplerate (last term):
                if (((PhaseAccuPtr[0] & 0x1000000) != (this.#PrevPhaseAccu[Channel] & 0x1000000)) || PhaseAccuStep[0] >= 0x1000000) {
                    Feedback[0] = Number(((Tmp[0] & 0x400000) ^ ((Tmp[0] & 0x20000) << 5)) != 0);
                    Tmp[0] = ((Tmp[0] << 1) | Feedback[0] | TestBit[0]) & 0x7FFFFF; //TEST-bit turns all bits in noise LFSR to 1 (on real SID slowly, in approx. 8000 microseconds ~ 300 samples)
                    this.#NoiseLFSR[Channel] = Tmp[0];
                } //we simply zero output when other waveform is mixed with noise. On real SID LFSR continuously gets filled by zero and locks up. ($C1 waveform with pw<8 can keep it for a while.)
                WavGenOut[0] = (WF[0] & 0x70) ? 0 : ((Tmp[0] & 0x100000) >> 5) | ((Tmp[0] & 0x40000) >> 4) | ((Tmp[0] & 0x4000) >> 1) | ((Tmp[0] & 0x800) << 1)
                    | ((Tmp[0] & 0x200) << 2) | ((Tmp[0] & 0x20) << 5) | ((Tmp[0] & 0x04) << 7) | ((Tmp[0] & 0x01) << 8);
            }

            else if (WF[0] & PULSE_BITVAL) { //simple pulse
                PW[0] = (((ChannelPtr[3] & 0x0F) << 8) + ChannelPtr[2]) << 4; //PW=0000..FFF0 from SID-register
                Utmp[0] = /*(int)*/(PhaseAccuStep[0] >> 13); if (0 < PW[0] && PW[0] < Utmp[0]) PW[0] = Utmp[0]; //Too thin pulsewidth? Correct...
                Utmp[0] ^= 0xFFFF; if (PW[0] > Utmp[0]) PW[0] = Utmp[0]; //Too thin pulsewidth? Correct it to a value representable at the current samplerate
                Utmp[0] = PhaseAccuPtr[0] >> 12;

                if ((WF[0] & 0xF0) == PULSE_BITVAL) { //simple pulse, most often used waveform, make it sound as clean as possible (by making it trapezoid)
                    Steepness[0] = (PhaseAccuStep[0] >= 4096) ? 0xFFFFFFF / PhaseAccuStep[0] : 0xFFFF; //rising/falling-edge steepness (add/sub at samples)
                    if (TestBit[0]) WavGenOut[0] = 0xFFFF;
                    else if (Utmp[0] < PW[0]) { //rising edge (interpolation)
                        PulsePeak[0] = (0xFFFF - PW[0]) * Steepness[0]; //very thin pulses don't make a full swing between 0 and max but make a little spike
                        if (PulsePeak[0] > 0xFFFF) PulsePeak[0] = 0xFFFF; //but adequately thick trapezoid pulses reach the maximum level
                        Tmp[0] = PulsePeak[0] - (PW[0] - Utmp[0]) * Steepness[0]; //draw the slope from the peak
                        WavGenOut[0] = (Tmp[0] < 0) ? 0 : Tmp[0];           //but stop at 0-level
                    }
                    else { //falling edge (interpolation)
                        PulsePeak[0] = PW[0] * Steepness[0]; //very thin pulses don't make a full swing between 0 and max but make a little spike
                        if (PulsePeak[0] > 0xFFFF) PulsePeak[0] = 0xFFFF; //adequately thick trapezoid pulses reach the maximum level
                        Tmp[0] = (0xFFFF - Utmp[0]) * Steepness[0] - PulsePeak[0]; //draw the slope from the peak
                        WavGenOut[0] = (Tmp[0] >= 0) ? 0xFFFF : Tmp[0];         //but stop at max-level
                    }
                }

                else { //combined pulse
                    WavGenOut[0] = (Utmp[0] >= PW[0] || TestBit[0]) ? 0xFFFF : 0;
                    if (WF[0] & TRI_BITVAL) {
                        if (WF[0] & SAW_BITVAL) { //pulse+saw+triangle (waveform nearly identical to tri+saw)
                            if (WavGenOut[0]) WavGenOut[0] = combinedWF(PulseSawTriangle, new UnsignedShort([Utmp[0]]))[0];
                        }
                        else { //pulse+triangle
                            Tmp[0] = PhaseAccuPtr[0] ^ ((WF[0] & RING_BITVAL) ? this.#RingSourceMSB[0] : 0);
                            if (WavGenOut[0]) WavGenOut[0] = combinedWF(PulseTriangle, new UnsignedShort([Tmp[0] >> 12]))[0];
                        }
                    }
                    else if (WF[0] & SAW_BITVAL) { //pulse+saw
                        if (WavGenOut[0]) WavGenOut[0] = combinedWF(PulseSawtooth, new UnsignedShort([Utmp[0]]))[0];
                    }
                }
            }

            else if (WF[0] & SAW_BITVAL) { //sawtooth
                WavGenOut[0] = PhaseAccuPtr[0] >> 12; //saw (this row would be enough for simple but aliased-at-high-pitch saw)
                if (WF[0] & TRI_BITVAL) WavGenOut[0] = combinedWF(SawTriangle, new UnsignedShort([WavGenOut[0]]))[0]; //saw+triangle
                else { //simple cleaned (bandlimited) saw
                    Steepness[0] = (PhaseAccuStep[0] >> 4) / 288; if (Steepness[0] == 0) Steepness[0] = 1; //avoid division by zero in next steps
                    WavGenOut[0] += (WavGenOut[0] * Steepness[0]) >> 16; //1st half (rising edge) of asymmetric triangle-like saw waveform
                    if (WavGenOut[0] > 0xFFFF) WavGenOut[0] = 0xFFFF - (((WavGenOut[0] - 0x10000) << 16) / Steepness[0]); //2nd half (falling edge, reciprocal steepness)
                }
            }

            else if (WF[0] & TRI_BITVAL) { //triangle (this waveform has no harsh edges, so it doesn't suffer from strong aliasing at high pitches)
                Tmp[0] = PhaseAccuPtr[0] ^ (WF[0] & RING_BITVAL ? this.#RingSourceMSB[0] : 0);
                WavGenOut[0] = (Tmp[0] ^ (Tmp[0] & 0x8000000 ? 0xFFFFFFF : 0)) >> 11;
            }

            WavGenOut[0] &= 0xFFFF;
            if (WF[0] & 0xF0) this.#PrevWavGenOut[Channel] = WavGenOut[0]; //emulate waveform 00 floating wave-DAC (utilized by SounDemon digis)
            else WavGenOut[0] = this.#PrevWavGenOut[Channel];  //(on real SID waveform00 decays, we just simply keep the value to avoid clicks)
            this.#PrevPhaseAccu[Channel] = PhaseAccuPtr[0];
            this.#RingSourceMSB[0] = MSB[0];

            //routing the channel signal to either the filter or the unfiltered master output depending on filter-switch SID-registers
            Envelope[0] = this.#ChipModel == ChipModel.MOS8580 ? this.#EnvelopeCounter[Channel] : ADSR_DAC_6581[this.#EnvelopeCounter[Channel]];
            if (FilterSwitchReso[0] & FilterSwitchVal[Channel]) {
                this.#FilterInputSample[0] += ((/*(int)*/WavGenOut[0] - 0x8000) * Envelope[0]) >> 8;
            }
            else if (Channel != 14 || !(VolumeBand[0] & OFF3_BITVAL)) {
                this.#NonFiltedSample[0] += ((/*(int)*/WavGenOut[0] - 0x8000) * Envelope[0]) >> 8;
            }
        }
        //update readable SID1-registers (some SID tunes might use 3rd channel ENV3/OSC3 value as control)
        /*SID.*/C64.IObankRD[this.#BaseAddress[0] + 0x1B] = WavGenOut[0] >> 8; //OSC3, ENV3 (some players rely on it, unfortunately even for timing)
        /*SID.*/C64.IObankRD[this.#BaseAddress[0] + 0x1C] = this.#EnvelopeCounter[14]; //Envelope

        return this.emulateSIDoutputStage();
    }

    emulateSIDoutputStage(): Int {
        const MainVolume: Char = new Char(1);
        const FilterSwitchReso: UnsignedChar = new UnsignedChar(1), VolumeBand: UnsignedChar = new UnsignedChar(1);
        const Tmp: Int = new Int(1), NonFilted: Int = new Int(1), FilterInput: Int = new Int(1), Cutoff: Int = new Int(1), Resonance: Int = new Int(1), FilterOutput: Int = new Int(1), Output: Int = new Int(1);

        FilterSwitchReso[0] = this.#BasePtr[0x17]; VolumeBand[0] = this.#BasePtr[0x18];
        Cutoff[0] = (this.#BasePtr[0x16] << 3) + (this.#BasePtr[0x15] & 7);
        Resonance[0] = FilterSwitchReso[0] >> 4;

        NonFilted[0] = this.#NonFiltedSample[0]; FilterInput[0] = this.#FilterInputSample[0];

        //Filter

        if (this.#ChipModel == ChipModel.MOS8580) {
            Cutoff[0] = CutoffMul8580_44100Hz[Cutoff[0]];
            Resonance[0] = Resonances8580[Resonance[0]];
        }
        else { //6581
            Cutoff[0] += (FilterInput[0] * 105) >> 16; if (Cutoff[0] > 0x7FF) Cutoff[0] = 0x7FF; else if (Cutoff[0] < 0) Cutoff[0] = 0; //MOSFET-VCR control-voltage calculation
            Cutoff[0] = CutoffMul6581_44100Hz[Cutoff[0]]; //(resistance-modulation aka 6581 filter distortion) emulation
            Resonance[0] = Resonances6581[Resonance[0]];
        }

        FilterOutput[0] = 0;
        Tmp[0] = FilterInput[0] + ((this.#PrevBandPass[0] * Resonance[0]) >> 12) + this.#PrevLowPass[0];
        if (VolumeBand[0] & HIGHPASS_BITVAL) FilterOutput[0] -= Tmp[0];
        Tmp[0] = this.#PrevBandPass[0] - ((Tmp[0] * Cutoff[0]) >> 12);
        this.#PrevBandPass[0] = Tmp[0];
        if (VolumeBand[0] & BANDPASS_BITVAL) FilterOutput[0] -= Tmp[0];
        Tmp[0] = this.#PrevLowPass[0] + ((Tmp[0] * Cutoff[0]) >> 12);
        this.#PrevLowPass[0] = Tmp[0];
        if (VolumeBand[0] & LOWPASS_BITVAL) FilterOutput[0] += Tmp[0];

        //Output-mixing stage

        //For $D418 volume-register digi playback: an AC / DC separation for $D418 value at low (20Hz or so) cutoff-frequency,
        //sending AC (highpass) value to a 4th 'digi' channel mixed to the master output, and set ONLY the DC (lowpass) value to the volume-control.
        //This solved 2 issues: Thanks to the lowpass filtering of the volume-control, SID tunes where digi is played together with normal SID channels,
        //won't sound distorted anymore, and the volume-clicks disappear when setting SID-volume. (This is useful for fade-in/out tunes like Hades Nebula, where clicking ruins the intro.)
        if (C64.RealSIDmode) {
            Tmp[0] = /*(signed int)*/ ((VolumeBand[0] & 0x0F) << 12);
            NonFilted[0] += (Tmp[0] - this.#PrevVolume[0]) * D418_DIGI_VOLUME; //highpass is digi, adding it to output must be before digifilter-code
            this.#PrevVolume[0] += (Tmp[0] - this.#PrevVolume[0]) >> 10; //arithmetic shift amount determines digi lowpass-frequency
            MainVolume[0] = this.#PrevVolume[0] >> 12; //lowpass is main volume
        }
        else MainVolume[0] = (VolumeBand[0] & 0x0F);

        this.#Output[0] = ((NonFilted[0] + FilterOutput[0]) * MainVolume[0]);

        Output[0] = this.#Output[0] / (((CHANNELS + 1) * VOLUME_MAX) + C64.Attenuation);

        return Output; // master output of a SID
    }




    //----------------------- High-quality (oversampled) waveform-generation --------------------------



    emulateHQwaves(cycles: number): SIDwavOutput {
        const WF: UnsignedChar = new UnsignedChar(1), TestBit: UnsignedChar = new UnsignedChar(1), Envelope: UnsignedChar = new UnsignedChar(1), FilterSwitchReso: UnsignedChar = new UnsignedChar(1), VolumeBand: UnsignedChar = new UnsignedChar(1);
        const Utmp: UnsignedInt = new UnsignedInt(1), PhaseAccuStep: UnsignedInt = new UnsignedInt(1), MSB: UnsignedInt = new UnsignedInt(1), WavGenOut: UnsignedInt = new UnsignedInt(1), PW: UnsignedInt = new UnsignedInt(1);
        const Tmp: Int = new Int(1), Feedback: Int = new Int(1);
        //const FilterInput: int, Cutoff: int, Resonance: int; //, FilterOutput: int, NonFilted: int, Output: int;
        // let ChannelPtr: UnsignedChar;
        // let PhaseAccuPtr: Int;
        const SIDwavOutput: SIDwavOutput = { FilterInput: 0, NonFilted: 0 };

        const FilterSwitchVal: UnsignedChar = new UnsignedChar([1, 2, 4]);

        const HQcombinedWF = (WFarray: UnsignedChar, oscval: UnsignedShort): UnsignedShort => {
            if (this.#ChipModel == ChipModel.MOS6581 && WFarray != PulseTriangle) oscval[0] &= 0x7FFF; // FIXME: mutating variable!
            return new UnsignedShort([WFarray[oscval[0] >> 4] << 8]);
        }


        SIDwavOutput.FilterInput = SIDwavOutput.NonFilted = 0;
        FilterSwitchReso[0] = this.#BasePtr[0x17]; VolumeBand[0] = this.#BasePtr[0x18];

        for (let Channel = 0; Channel < CHANNELS; Channel++) {
            const ChannelPtr: UnsignedChar = this.#BasePtr.Ptr(Channel * 7, 7);

            WF[0] = ChannelPtr[4]; TestBit[0] = Number((WF[0] & TEST_BITVAL) != 0);

            PhaseAccuStep[0] = ((ChannelPtr[1] << 8) + ChannelPtr[0]) * cycles;
            if (TestBit[0] || ((WF[0] & SYNC_BITVAL) && this.#SyncSourceMSBrise[0])) this.#PhaseAccu[Channel] = 0;
            else { //stepping phase-accumulator (oscillator)
                this.#PhaseAccu[Channel] += PhaseAccuStep[0];
                if (this.#PhaseAccu[Channel] >= 0x1000000) this.#PhaseAccu[Channel] -= 0x1000000;
            }
            this.#PhaseAccu[Channel] &= 0xFFFFFF;
            MSB[0] = this.#PhaseAccu[Channel] & 0x800000;
            this.#SyncSourceMSBrise[0] = (MSB[0] > (this.#PrevPhaseAccu[Channel] & 0x800000)) ? 1 : 0;


            if (WF[0] & NOISE_BITVAL) { //noise waveform
                Tmp[0] = this.#NoiseLFSR[Channel]; //clock LFSR all time if clockrate exceeds observable at given samplerate (last term):

                if (((this.#PhaseAccu[Channel] & 0x100000) != (this.#PrevPhaseAccu[Channel] & 0x100000))) {
                    Feedback[0] = Number(((Tmp[0] & 0x400000) ^ ((Tmp[0] & 0x20000) << 5)) != 0);
                    Tmp[0] = ((Tmp[0] << 1) | Feedback[0] | TestBit[0]) & 0x7FFFFF; //TEST-bit turns all bits in noise LFSR to 1 (on real SID slowly, in approx. 8000 microseconds ~ 300 samples)
                    this.#NoiseLFSR[Channel] = Tmp[0];
                } //we simply zero output when other waveform is mixed with noise. On real SID LFSR continuously gets filled by zero and locks up. ($C1 waveform with pw<8 can keep it for a while.)
                WavGenOut[0] = (WF[0] & 0x70) ? 0 : ((Tmp[0] & 0x100000) >> 5) | ((Tmp[0] & 0x40000) >> 4) | ((Tmp[0] & 0x4000) >> 1) | ((Tmp[0] & 0x800) << 1)
                    | ((Tmp[0] & 0x200) << 2) | ((Tmp[0] & 0x20) << 5) | ((Tmp[0] & 0x04) << 7) | ((Tmp[0] & 0x01) << 8);
            }
            else if (WF[0] & PULSE_BITVAL) { //simple pulse or pulse+combined
                PW[0] = (((ChannelPtr[3] & 0x0F) << 8) + ChannelPtr[2]) << 4; //PW=0000..FFF0 from SID-register
                Utmp[0] = this.#PhaseAccu[Channel] >> 8;
                WavGenOut[0] = (Utmp[0] >= PW[0] || TestBit[0]) ? 0xFFFF : 0;
                if ((WF[0] & 0xF0) != PULSE_BITVAL) { //combined pulse
                    if (WF[0] & TRI_BITVAL) {
                        if (WF[0] & SAW_BITVAL) { //pulse+saw+triangle (waveform nearly identical to tri+saw)
                            if (WavGenOut[0]) WavGenOut[0] = HQcombinedWF(PulseSawTriangle, new UnsignedShort([Utmp[0]]))[0];
                        }
                        else { //pulse+triangle
                            Tmp[0] = this.#PhaseAccu[Channel] ^ ((WF[0] & RING_BITVAL) ? this.#RingSourceMSB[0] : 0);
                            if (WavGenOut[0]) WavGenOut[0] = HQcombinedWF(PulseTriangle, new UnsignedShort([Tmp[0] >> 8]))[0];
                        }
                    }
                    else if (WF[0] & SAW_BITVAL) { //pulse+saw
                        if (WavGenOut[0]) WavGenOut[0] = HQcombinedWF(PulseSawtooth, new UnsignedShort([Utmp[0]]))[0];
                    }
                }
            }
            else if (WF[0] & SAW_BITVAL) { //sawtooth
                WavGenOut[0] = this.#PhaseAccu[Channel] >> 8;
                if (WF[0] & TRI_BITVAL) WavGenOut[0] = HQcombinedWF(SawTriangle, new UnsignedShort([WavGenOut[0]]))[0]; //saw+triangle
            }
            else if (WF[0] & TRI_BITVAL) { //triangle (this waveform has no harsh edges, so it doesn't suffer from strong aliasing at high pitches)
                Tmp[0] = this.#PhaseAccu[Channel] ^ (WF[0] & RING_BITVAL ? this.#RingSourceMSB[0] : 0);
                WavGenOut[0] = (Tmp[0] ^ (Tmp[0] & 0x800000 ? 0xFFFFFF : 0)) >> 7;
            }

            WavGenOut[0] &= 0xFFFF;
            if (WF[0] & 0xF0) this.#PrevWavGenOut[Channel] = WavGenOut[0]; //emulate waveform 00 floating wave-DAC (utilized by SounDemon digis)
            else WavGenOut[0] = this.#PrevWavGenOut[Channel];  //(on real SID waveform00 decays, we just simply keep the value to avoid clicks)
            this.#PrevPhaseAccu[Channel] = this.#PhaseAccu[Channel];
            this.#RingSourceMSB[0] = MSB[0];

            //routing the channel signal to either the filter or the unfiltered master output depending on filter-switch SID-registers
            Envelope[0] = (this.#ChipModel == ChipModel.MOS8580 ? this.#EnvelopeCounter[Channel] : ADSR_DAC_6581[this.#EnvelopeCounter[Channel]]);
            if (FilterSwitchReso[0] & FilterSwitchVal[Channel]) {
                SIDwavOutput.FilterInput += ((/*(int)*/WavGenOut[0] - 0x8000) * Envelope[0]) >> 8;
            }
            else if (Channel != 2 || !(VolumeBand[0] & OFF3_BITVAL)) {
                SIDwavOutput.NonFilted += ((/*(int)*/WavGenOut[0] - 0x8000) * Envelope[0]) >> 8;
            }

        }
        //update readable SID1-registers (some SID tunes might use 3rd channel ENV3/OSC3 value as control)
        C64.IObankRD[this.#BaseAddress[0] + 0x1B] = WavGenOut[0] >> 8; //OSC3, ENV3 (some players rely on it, unfortunately even for timing)
        C64.IObankRD[this.#BaseAddress[0] + 0x1C] = this.#EnvelopeCounter[2]; //Envelope

        //SIDwavOutput.NonFilted=NonFilted; SIDwavOutput.FilterInput=FilterInput; //SID->FilterInputCycle=FilterInput; //SID->NonFiltedCycle=NonFilted;
        return SIDwavOutput; //NonFilted; //+FilterInput; //WavGenOut; //(*PhaseAccuPtr)>>8;
    }

}

export enum SIDheaderOffset {                   //Offset:   default/info:
    MagicString = 0x00,                         //$00 - "PSID" or "RSID" (RSID must provide Reset-circumstances & CIA/VIC-interrupts)
    VersionH00 = 0x04,                          //$04
    Version = 0x05,                             //$05 - 1 for PSID v1, 2..4 for PSID v2..4 or RSID v2..4 (3/4 has 2SID/3SID support)
    HeaderSizeH00 = 0x06,                       //$06
    HeaderSize = 0x07,                          //$07 - $76 for v1, $7C for v2..4
    LoadAddressH = 0x08, LoadAddressL = 0x09,   //$08 - if 0 it's a PRG and its loadaddress is used (RSID: 0, PRG-loadaddress>=$07E8)
    InitAddressH = 0x0A, InitAddressL = 0x0B,   //$0A - if 0 it's taken from load-address (but should be set) (RSID: don't point to ROM, 0 if BASICflag set)
    PlayAddressH = 0x0C, PlayAddressL = 0x0D,   //$0C - if 0 play-routine-call is set by the initializer (always true for RSID)
    SubtuneAmountH00 = 0x0E,                    //$0E
    SubtuneAmount = 0x0F,                       //$0F - 1..256
    DefaultSubtuneH00 = 0x10,                   //$10
    DefaultSubtune = 0x11,                      //$11 - 1..256 (optional, defaults to 1)
    SubtuneTimeSources = 0x12,                  //$12 - 0:Vsync / 1:CIA1 (for PSID) (LSB is subtune1, MSB above 32) , always 0 for RSID
    Title = 0x16,                               //$16 - strings are using 1252 codepage
    Author = 0x36,                              //$36
    ReleaseInfo = 0x56,                         //$56

    //SID v2 additions:                                 (if SID2/SID3 model is set to unknown, they're set to the same model as SID1)
    ModelFormatStandardH = 0x76,                //$76 - bit9&8/7&6/5&4: SID3/2/1 model (00:?,01:6581,10:8580,11:both), bit3&2:VideoStandard..
    ModelFormatStandard = 0x77,                 //$77 ..(01:PAL,10:NTSC,11:both), bit1:(0:C64,1:PlaySIDsamples/RSID_BASICflag), bit0:(0:builtin-player,1:MUS)
    RelocStartPage = 0x78,                      //$78 - v2NG specific, if 0 the SID doesn't write outside its data-range, if $FF there's no place for driver
    RelocFreePages = 0x79,                      //$79 - size of area from RelocStartPage for driver-relocation (RSID: must not contain ROM or 0..$3FF)
    SID2baseAddress = 0x7A,                     //$7A - (SID2BASE-$d000)/16 //SIDv3-relevant, only $42..$FE values are valid ($d420..$DFE0), else no SID2
    SID2flagsH = 0x7A,                          //$7A: address of SID2 in WebSID-format too (same format as SID2baseAddress in HVSC format)
    SID3baseAddress = 0x7B,                     //$7B - (SID3BASE-$d000)/16 //SIDv4-relevant, only $42..$FE values are valid ($d420..$DFE0), else no SID3
    SID2flagsL = 0x7B,                          //$7B: flags for WebSID-format, bit6: output-channel (0(default):left, 1:right, ?:both?), bit5..4:SIDmodel(00:setting,01:6581,10:8580,11:both)
    //      my own (implemented in SID-Wizard too) proposal for channel-info: bit7 should be 'middle' channel-flag (overriding bit6 left/right)

    //WebSID-format (with 4 and more SIDs -support) additional fields: for each extra SID there's an 'nSIDflags' byte-pair
    SID3flagsH = 0x7C, SID3flagsL = 0x7D,       //$7C,$7D: the same address/flag-layout for SID3 as with SID2
    SID4flagsH = 0x7E, SID4baseAddress = 0x7E,  //$7E
    SID4flagsL = 0x7F,                          //$7F: the same address/flag-layout for SID4 as with SID2

    //... repeated for more SIDs, and end the list with $00,$00 (this determines the amount of SIDs)
}; //music-program follows right after the header

export type SIDheader = {
    MagicString: string
    Version: number
    HeaderSize: number

    LoadAddress: number
    InitAddress: number
    PlayAddress: number

    SubtuneAmount: number
    DefaultSubtune: number
    SubtuneTimeSources: UnsignedChar // unsigned char[4] [0, 255]

    Title: string
    Author: string
    ReleaseInfo: string

    ModelFormatStandard: number

    RelocStartPage: number
    RelocFreePages: number

    SID2baseAddress: number
    SID3baseAddress: number
    SID4baseAddress: number

    SID2flags: number
    SID3flags: number
    SID4flags: number
};
