//C64 emulation (SID-playback related)

import { UnsignedChar, Char, UnsignedInt, Int, UnsignedShort, Short } from "./types"

import { CPU } from "./CPU"
import { MEM } from "./MEM"
import { SID } from "./SID"
import { CIA } from "./CIA"
import { VIC } from "./VIC"
import { ChipModel, Channels, SIDheader } from "./SID";

const
    abs = Math.abs

// Specifications
const
    SIDCOUNT_MAX = 4, CIACOUNT = 2, FILEVERSION_WEBSID = 0x4E

export enum VideoStandard { NTSC = 0, PAL = 1 }
export enum TimerSource { VIC = 0, CIA = 1 }

// C64clocks
const
    C64_PAL_CPUCLK = 985248, C64_NTSC_CPUCLK = 1022727, DEFAULT_SAMPLERATE = 44100

// C64scanlines
const
    C64_PAL_SCANLINES = 312, C64_NTSC_SCANLINES = 263

// C64scanlineCycles
const
    C64_PAL_SCANLINE_CYCLES = 63, C64_NTSC_SCANLINE_CYCLES = 65

// C64framerates
const
    PAL_FRAMERATE = 50, NTSC_FRAMERATE = 60 //Hz

// Oversampling
const
    OVERSAMPLING_RATIO = 7, OVERSAMPLING_CYCLES = ((C64_PAL_CPUCLK / DEFAULT_SAMPLERATE) / OVERSAMPLING_RATIO) | 0

// PSIDdigiSpecs
const DIGI_VOLUME = 1200 //80

const CPUspeeds: UnsignedInt = new UnsignedInt([C64_NTSC_CPUCLK, C64_PAL_CPUCLK]);
export const ScanLines: UnsignedShort = new UnsignedShort([C64_NTSC_SCANLINES, C64_PAL_SCANLINES]);
export const ScanLineCycles: UnsignedChar = new UnsignedChar([C64_NTSC_SCANLINE_CYCLES, C64_PAL_SCANLINE_CYCLES]);
export const FrameRates: Char = new Char([NTSC_FRAMERATE, PAL_FRAMERATE]);

const Attenuations: Short = new Short([0, 26, 43, 137, 200]); //increase for 2SID (to 43) and 3SID (to 137)

export type Output = {
    L: Int // signed int [−32767, +32767]
    R: Int // signed int [−32767, +32767]
}

export class C64 {
    //platform-related:
    static SampleRate: number;
    // static BufferSize: UnsignedInt = new UnsignedInt(1);
    static HighQualitySID: boolean;
    static SIDchipCount: number;
    static Stereo: boolean;
    static PlaybackSpeed: number;
    static Paused: boolean;

    //C64-machine related:
    static VideoStandard: VideoStandard;    //0:NTSC, 1:PAL (based on the SID-header field)
    static #CPUfrequency: UnsignedInt = new UnsignedInt(1);
    static #SampleClockRatio: UnsignedShort = new UnsignedShort(1);        //ratio of CPU-clock and samplerate
    static SelectedSIDmodel: ChipModel;
    static #MainVolume: UnsignedChar = new UnsignedChar(1);

    static set CPUfrequency(value: number) { C64.#CPUfrequency[0] = value }
    static set SampleClockRatio(value: number) { C64.#SampleClockRatio[0] = value }
    // static get SampleClockRatio(): number { return C64.#SampleClockRatio[0] }
    static set MainVolume(value: number) { C64.#MainVolume[0] = value }

    //SID-file related:
    static SIDheader: SIDheader;

    static Attenuation: number;
    static RealSIDmode: boolean;
    static PSIDdigiMode: boolean;
    static SubTune: number;
    static LoadAddress: number;
    static InitAddress: number;
    static PlayAddress: number;
    static EndAddress: number;
    static TimerSource: TimerSource;    //for current subtune, 0:VIC, 1:CIA (as in SID-header)

    //PSID-playback related:
    static SoundStarted: boolean;
    //static CIAisSet: char;          //for dynamic CIA setting from player-routine (RealSID substitution)
    static #FrameCycles: Int = new Int(1);
    static #FrameCycleCnt: Int = new Int(1);       //this is a substitution in PSID-mode for CIA/VIC counters
    static #PrevRasterLine: Short = new Short(1);
    static #SampleCycleCnt: Short = new Short(1);
    static #OverSampleCycleCnt: Short = new Short(1);
    static #TenthSecondCnt: Short = new Short(1);
    static #SecondCnt: UnsignedShort = new UnsignedShort(1);
    static #PlayTime: Short = new Short(1);
    static Finished: boolean;
    static Returned: boolean;
    static #IRQ: UnsignedChar = new UnsignedChar(1);                 //collected IRQ line from devices
    static #NMI: UnsignedChar = new UnsignedChar(1);                 //collected NMI line from devices

    static set FrameCycles(value: number) { this.#FrameCycles[0] = value }
    static set FrameCycleCnt(value: number) { this.#FrameCycleCnt[0] = value }
    static set PrevRasterLine(value: number) { this.#PrevRasterLine[0] = value }
    static set SampleCycleCnt(value: number) { this.#SampleCycleCnt[0] = value }
    static set OverSampleCycleCnt(value: number) { this.#OverSampleCycleCnt[0] = value }
    static set TenthSecondCnt(value: number) { this.#TenthSecondCnt[0] = value }
    static set SecondCnt(value: number) { this.#SecondCnt[0] = value }
    static set PlayTime(value: number) { this.#PlayTime[0] = value }
    static set IRQ(value: number) { this.#IRQ[0] = value }
    static set NMI(value: number) { this.#NMI[0] = value }

    //Hardware-elements:
    static CPU: CPU;
    static SID: SID[] = new Array<SID>(SIDCOUNT_MAX + 1);
    static CIA: CIA[] = new Array<CIA>(CIACOUNT + 1);
    static VIC: VIC;

    //Overlapping system memories, which one is read/written in an address region depends on CPU-port bankselect-bits)
    //Address $00 and $01 - data-direction and data-register of port built into CPU (used as bank-selection) (overriding RAM on C64)
    static RAMbank: UnsignedChar = new UnsignedChar(0x10100);  // unsigned char[0x10100] [0, 255] //$0000..$FFFF RAM (and RAM under IO/ROM/CPUport)
    static IObankWR: UnsignedChar = new UnsignedChar(0x10100); // unsigned char[0x10100] [0, 255] //$D000..$DFFF IO-RAM (registers) to write (VIC/SID/CIA/ColorRAM/IOexpansion)
    static IObankRD: UnsignedChar = new UnsignedChar(0x10100); // unsigned char[0x10100] [0, 255] //$D000..$DFFF IO-RAM (registers) to read from (VIC/SID/CIA/ColorRAM/IOexpansion)
    static ROMbanks: UnsignedChar = new UnsignedChar(0x10100); // unsigned char[0x10100] [0, 255] //$1000..$1FFF/$9000..$9FFF (CHARGEN), $A000..$BFFF (BASIC), $E000..$FFFF (KERNAL)

    static createC64(samplerate: number): void { //init a basic PAL C64 instance
        if (samplerate) C64.SampleRate = samplerate;
        else C64.SampleRate = samplerate = DEFAULT_SAMPLERATE;
        C64.SampleClockRatio = (C64_PAL_CPUCLK << 4) / samplerate; //shifting (multiplication) enhances SampleClockRatio precision

        C64.Attenuation = 26; C64.SIDchipCount = 1;
        //C64.CPU.C64 = C64;

        C64.SID[1] = new SID(ChipModel.MOS8580, Channels.CHANNEL_BOTH, 0xD400); //default C64 setup with only 1 SID and 2 CIAs and 1 VIC

        C64.CIA[1] = new CIA(0xDC00);
        C64.CIA[2] = new CIA(0xDD00);

        C64.VIC = new VIC(0xD000);

        //if(C64->RealSIDmode) {
        MEM.setROMcontent();
        //}

        C64.initC64();
    }

    static setC64(): void {   //set hardware-parameters (Models, SIDs) for playback of loaded SID-tune
        let SIDmodel: ChipModel;
        let SIDchannel: Channels;

        C64.VideoStandard = Number(((C64.SIDheader.ModelFormatStandard & 0x0C) >> 2) != 2);
        if (C64.SampleRate == 0) C64.SampleRate = 44100;
        C64.CPUfrequency = CPUspeeds[C64.VideoStandard];
        C64.SampleClockRatio = (C64.CPUfrequency << 4) / C64.SampleRate; //shifting (multiplication) enhances SampleClockRatio precision

        C64.VIC.RasterLines = ScanLines[C64.VideoStandard];
        C64.VIC.RasterRowCycles = ScanLineCycles[C64.VideoStandard];
        C64.FrameCycles = C64.VIC.RasterLines * C64.VIC.RasterRowCycles; ///C64->SampleRate / PAL_FRAMERATE; //1x speed tune with VIC Vertical-blank timing

        C64.PrevRasterLine = -1; //so if $d012 is set once only don't disturb FrameCycleCnt

        SIDmodel = (C64.SIDheader.ModelFormatStandard & 0x30) >= 0x20 ? ChipModel.MOS8580 : ChipModel.MOS6581;
        C64.SID[1].ChipModel = C64.SelectedSIDmodel ? C64.SelectedSIDmodel : SIDmodel;

        if (C64.SIDheader.Version != FILEVERSION_WEBSID) {

            C64.SID[1].Channel = Channels.CHANNEL_LEFT;

            SIDmodel = C64.SIDheader.ModelFormatStandard & 0xC0;
            if (SIDmodel) SIDmodel = (SIDmodel >= 0x80) ? ChipModel.MOS8580 : ChipModel.MOS6581; else SIDmodel = C64.SID[1].ChipModel;
            if (C64.SelectedSIDmodel) SIDmodel = C64.SelectedSIDmodel;
            C64.SID[2] = new SID(SIDmodel, Channels.CHANNEL_RIGHT, 0xD000 + C64.SIDheader.SID2baseAddress * 16);

            SIDmodel = C64.SIDheader.ModelFormatStandard & 0x0300;
            if (SIDmodel) SIDmodel = (SIDmodel >= 0x02) ? ChipModel.MOS8580 : ChipModel.MOS6581; else SIDmodel = C64.SID[1].ChipModel;
            if (C64.SelectedSIDmodel) SIDmodel = C64.SelectedSIDmodel;
            C64.SID[3] = new SID(SIDmodel, Channels.CHANNEL_BOTH, 0xD000 + C64.SIDheader.SID3baseAddress * 16);

            C64.SID[4] = new SID(); //ensure disabling SID4 in non-WebSID format

        }
        else {

            C64.SID[1].Channel = (C64.SIDheader.ModelFormatStandard & 0x4000) ? Channels.CHANNEL_RIGHT : Channels.CHANNEL_LEFT;
            if (C64.SIDheader.ModelFormatStandard & 0x8000) C64.SID[1].Channel = Channels.CHANNEL_BOTH; //my own proposal for 'middle' channel

            SIDmodel = C64.SIDheader.SID2flags & 0x30;
            SIDchannel = (C64.SIDheader.SID2flags & 0x40) ? Channels.CHANNEL_RIGHT : Channels.CHANNEL_LEFT;
            if (C64.SIDheader.SID2flags & 0x80) SIDchannel = Channels.CHANNEL_BOTH;
            if (SIDmodel) SIDmodel = (SIDmodel >= 0x20) ? ChipModel.MOS8580 : ChipModel.MOS6581; else SIDmodel = C64.SID[1].ChipModel;
            if (C64.SelectedSIDmodel) SIDmodel = C64.SelectedSIDmodel;
            C64.SID[2] = new SID(SIDmodel, SIDchannel, 0xD000 + C64.SIDheader.SID2baseAddress * 16);

            SIDmodel = C64.SIDheader.SID3flags & 0x30;
            SIDchannel = (C64.SIDheader.SID3flags & 0x40) ? Channels.CHANNEL_RIGHT : Channels.CHANNEL_LEFT;
            if (C64.SIDheader.SID3flags & 0x80) SIDchannel = Channels.CHANNEL_BOTH;
            if (SIDmodel) SIDmodel = (SIDmodel >= 0x20) ? ChipModel.MOS8580 : ChipModel.MOS6581; else SIDmodel = C64.SID[1].ChipModel;
            if (C64.SelectedSIDmodel) SIDmodel = C64.SelectedSIDmodel;
            C64.SID[3] = new SID(SIDmodel, SIDchannel, 0xD000 + C64.SIDheader.SID3baseAddress * 16);

            SIDmodel = C64.SIDheader.SID4flags & 0x30;
            SIDchannel = (C64.SIDheader.SID4flags & 0x40) ? Channels.CHANNEL_RIGHT : Channels.CHANNEL_LEFT;
            if (C64.SIDheader.SID4flags & 0x80) SIDchannel = Channels.CHANNEL_BOTH;
            if (SIDmodel) SIDmodel = (SIDmodel >= 0x20) ? ChipModel.MOS8580 : ChipModel.MOS6581; else SIDmodel = C64.SID[1].ChipModel;
            if (C64.SelectedSIDmodel) SIDmodel = C64.SelectedSIDmodel;
            C64.SID[4] = new SID(SIDmodel, SIDchannel, 0xD000 + C64.SIDheader.SID4baseAddress * 16);

        }

        C64.SIDchipCount = 1 + Number(C64.SID[2].Available) + Number(C64.SID[3].Available) + Number(C64.SID[4].Available);
        if (C64.SIDchipCount == 1) C64.SID[1].Channel = Channels.CHANNEL_BOTH;
        C64.Attenuation = Attenuations[C64.SIDchipCount];
    }

    static initC64() { //C64 Reset
        C64.SID[1].initSIDchip();
        C64.SID[1].NonFiltedSample = 0; C64.SID[1].FilterInputSample = 0;
        C64.SID[1].PrevNonFiltedSample = 0; C64.SID[1].PrevFilterInputSample = 0;
        C64.CIA[1].initCIAchip(); C64.CIA[2].initCIAchip();
        MEM.initMem();
        C64.CPU = new CPU((MEM.readMem(0xFFFD)[0] << 8) + MEM.readMem(0xFFFC)[0]);
        C64.IRQ = C64.NMI = 0;
        if (C64.HighQualitySID) {
            if (C64.SID[2]) {
                C64.SID[2].NonFiltedSample = 0; C64.SID[2].FilterInputSample = 0;
                C64.SID[2].PrevNonFiltedSample = 0; C64.SID[2].PrevFilterInputSample = 0;
            }
            if (C64.SID[3]) {
                C64.SID[3].NonFiltedSample = 0; C64.SID[3].FilterInputSample = 0;
                C64.SID[3].PrevNonFiltedSample = 0; C64.SID[3].PrevFilterInputSample = 0;
            }
            if (C64.SID[4]) {
                C64.SID[4].NonFiltedSample = 0; C64.SID[4].FilterInputSample = 0;
                C64.SID[4].PrevNonFiltedSample = 0; C64.SID[4].PrevFilterInputSample = 0;
            }
        }
        C64.SampleCycleCnt = C64.OverSampleCycleCnt = 0;
    }

    static emulateC64(): Output {
        let InstructionCycles: number = 0, HQsampleCount: number = 0;
        let Tmp: Int = new Int(1);
        let Output: Output = { L: new Int(1), R: new Int(1) };

        //Cycle-based part of emulations:

        while (C64.SampleCycleCnt <= C64.SampleClockRatio) {

            if (!C64.RealSIDmode) {
                if (C64.FrameCycleCnt >= C64.FrameCycles) {
                    C64.FrameCycleCnt -= C64.FrameCycles;
                    if (C64.Finished) { //some tunes (e.g. Barbarian, A-Maze-Ing) doesn't always finish in 1 frame
                        C64.CPU = new CPU(C64.PlayAddress); //(PSID docs say bank-register should always be set for each call's region)
                        C64.Finished = false; //C64->SampleCycleCnt=0; //PSID workaround for some tunes (e.g. Galdrumway):
                        if (C64.TimerSource == TimerSource.VIC) C64.IObankRD[0xD019] = 0x81; //always simulate to player-calls that VIC-IRQ happened
                        else C64.IObankRD[0xDC0D] = 0x83; //always simulate to player-calls that CIA TIMERA/TIMERB-IRQ happened
                    }
                }
                if (!C64.Finished) {
                    InstructionCycles = C64.CPU.emulateCPU();
                    if (InstructionCycles >= 0xFE) { InstructionCycles = 6; C64.Finished = true; }
                }
                else InstructionCycles = 7; //idle between player-calls
                C64.FrameCycleCnt += InstructionCycles;
                C64.IObankRD[0xDC04] += InstructionCycles; //very simple CIA1 TimerA simulation for PSID (e.g. Delta-Mix_E-Load_loader)
            }

            else { //RealSID emulations:
                if (C64.CPU.handleCPUinterrupts()) { C64.Finished = false; InstructionCycles = 7; }
                else if (!C64.Finished) {
                    InstructionCycles = C64.CPU.emulateCPU()
                    if (InstructionCycles >= 0xFE) {
                        InstructionCycles = 6; C64.Finished = true;
                    }
                }
                else InstructionCycles = 7; //idle between IRQ-calls
                C64.IRQ = C64.NMI = 0; //prepare for collecting IRQ sources
                C64.IRQ |= C64.CIA[1].emulateCIA(InstructionCycles);
                C64.NMI |= C64.CIA[2].emulateCIA(InstructionCycles);
                C64.IRQ |= C64.VIC.emulateVIC(InstructionCycles);
            }

            C64.SampleCycleCnt += (InstructionCycles << 4);

            C64.SID[1].emulateADSRs(InstructionCycles);
            if (C64.SID[2].Available) C64.SID[2].emulateADSRs(InstructionCycles);
            if (C64.SID[3].Available) C64.SID[3].emulateADSRs(InstructionCycles);
            if (C64.SID[4].Available) C64.SID[4].emulateADSRs(InstructionCycles);

        }
        C64.SampleCycleCnt -= C64.SampleClockRatio;

        if (C64.HighQualitySID) { //oversampled waveform-generation
            HQsampleCount = 0;
            C64.SID[1].NonFiltedSample = C64.SID[1].FilterInputSample = 0;
            C64.SID[2].NonFiltedSample = C64.SID[2].FilterInputSample = 0;
            C64.SID[3].NonFiltedSample = C64.SID[3].FilterInputSample = 0;
            C64.SID[4].NonFiltedSample = C64.SID[4].FilterInputSample = 0;

            while (C64.OverSampleCycleCnt <= C64.SampleClockRatio) {
                const SIDwavOutput = C64.SID[1].emulateHQwaves(OVERSAMPLING_CYCLES);
                C64.SID[1].NonFiltedSample += SIDwavOutput.NonFilted; C64.SID[1].FilterInputSample += SIDwavOutput.FilterInput;
                if (C64.SID[2].Available) {
                    const SIDwavOutput = C64.SID[2].emulateHQwaves(OVERSAMPLING_CYCLES);
                    C64.SID[2].NonFiltedSample += SIDwavOutput.NonFilted; C64.SID[2].FilterInputSample += SIDwavOutput.FilterInput;
                }
                if (C64.SID[3].Available) {
                    const SIDwavOutput = C64.SID[3].emulateHQwaves(OVERSAMPLING_CYCLES);
                    C64.SID[3].NonFiltedSample += SIDwavOutput.NonFilted; C64.SID[3].FilterInputSample += SIDwavOutput.FilterInput;
                }
                if (C64.SID[4].Available) {
                    const SIDwavOutput = C64.SID[4].emulateHQwaves(OVERSAMPLING_CYCLES);
                    C64.SID[4].NonFiltedSample += SIDwavOutput.NonFilted; C64.SID[4].FilterInputSample += SIDwavOutput.FilterInput;
                }
                ++HQsampleCount;
                C64.OverSampleCycleCnt += (OVERSAMPLING_CYCLES << 4);
            }
            C64.OverSampleCycleCnt -= C64.SampleClockRatio;
        }

        //Samplerate-based part of emulations:

        if (!C64.RealSIDmode) { //some PSID tunes use CIA TOD-clock (e.g. Kawasaki Synthesizer Demo)
            --C64.TenthSecondCnt;
            if (C64.TenthSecondCnt <= 0) {
                C64.TenthSecondCnt = C64.SampleRate / 10;
                ++(C64.IObankRD[0xDC08]);
                if (C64.IObankRD[0xDC08] >= 10) {
                    C64.IObankRD[0xDC08] = 0; ++(C64.IObankRD[0xDC09]);
                    //if(C64->IObankRD[0xDC09]%
                }
            }
        }

        if (C64.SecondCnt < C64.SampleRate) ++C64.SecondCnt; else { C64.SecondCnt = 0; if (C64.PlayTime < 3600) ++C64.PlayTime; }


        if (!C64.HighQualitySID) {
            if (!C64.Stereo || C64.SIDchipCount == 1) {
                Output.L[0] = Output.R[0] = C64.SID[1].emulateWaves()[0];
                if (C64.SID[2].Available) Output.L[0] = Output.R[0] += C64.SID[2].emulateWaves()[0];
                if (C64.SID[3].Available) Output.L[0] = Output.R[0] += C64.SID[3].emulateWaves()[0];
                if (C64.SID[4].Available) Output.L[0] = Output.R[0] += C64.SID[4].emulateWaves()[0];
            }
            else {
                Tmp = C64.SID[1].emulateWaves();
                if (C64.SID[1].Channel == Channels.CHANNEL_LEFT) { Output.L[0] = Tmp[0] * 2; Output.R[0] = 0; }
                else if (C64.SID[1].Channel == Channels.CHANNEL_RIGHT) { Output.R[0] = Tmp[0] * 2; Output.L[0] = 0; }
                else Output.L[0] = Output.R[0] = Tmp[0];
                if (C64.SID[2].Available) {
                    Tmp = C64.SID[2].emulateWaves();
                    if (C64.SID[2].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[2].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
                if (C64.SID[3].Available) {
                    Tmp = C64.SID[3].emulateWaves();
                    if (C64.SID[3].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[3].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
                if (C64.SID[4].Available) {
                    Tmp = C64.SID[4].emulateWaves();
                    if (C64.SID[4].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[4].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
            }
        }

        else { //SID output-stages and mono/stereo handling for High-Quality SID-emulation
            C64.SID[1].NonFiltedSample /= HQsampleCount; C64.SID[1].FilterInputSample /= HQsampleCount;
            if (C64.SID[2].Available) {
                C64.SID[2].NonFiltedSample /= HQsampleCount; C64.SID[2].FilterInputSample /= HQsampleCount;
            }
            if (C64.SID[3].Available) {
                C64.SID[3].NonFiltedSample /= HQsampleCount; C64.SID[3].FilterInputSample /= HQsampleCount;
            }
            if (C64.SID[4].Available) {
                C64.SID[4].NonFiltedSample /= HQsampleCount; C64.SID[4].FilterInputSample /= HQsampleCount;
            }
            if (!C64.Stereo || C64.SIDchipCount == 1) {
                Output.L[0] = Output.R[0] = C64.SID[1].emulateSIDoutputStage()[0];
                if (C64.SID[2].Available) Output.L[0] += C64.SID[2].emulateSIDoutputStage()[0];
                if (C64.SID[3].Available) Output.L[0] += C64.SID[3].emulateSIDoutputStage()[0];
                if (C64.SID[4].Available) Output.L[0] += C64.SID[4].emulateSIDoutputStage()[0];
                Output.R[0] = Output.L[0];
            }
            else {
                Tmp = C64.SID[1].emulateSIDoutputStage();
                if (C64.SID[1].Channel == Channels.CHANNEL_LEFT) { Output.L[0] = Tmp[0] * 2; Output.R[0] = 0; }
                else if (C64.SID[1].Channel == Channels.CHANNEL_RIGHT) { Output.R[0] = Tmp[0] * 2; Output.L[0] = 0; }
                else Output.L[0] = Output.R[0] = Tmp[0];
                if (C64.SID[2].Available) {
                    Tmp = C64.SID[2].emulateSIDoutputStage();
                    if (C64.SID[2].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[2].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
                if (C64.SID[3].Available) {
                    Tmp = C64.SID[3].emulateSIDoutputStage();
                    if (C64.SID[3].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[3].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
                if (C64.SID[4].Available) {
                    Tmp = C64.SID[4].emulateSIDoutputStage();
                    if (C64.SID[4].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[4].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
            }
        }


        //average level (for VU-meter)
        C64.SID[1].Level += ((abs(C64.SID[1].Output) >> 4) - C64.SID[1].Level) / 1024;
        if (C64.SID[2].Available) C64.SID[2].Level += ((abs(C64.SID[2].Output) >> 4) - C64.SID[2].Level) / 1024;
        if (C64.SID[3].Available) C64.SID[3].Level += ((abs(C64.SID[3].Output) >> 4) - C64.SID[3].Level) / 1024;
        if (C64.SID[4].Available) C64.SID[4].Level += ((abs(C64.SID[4].Output) >> 4) - C64.SID[4].Level) / 1024;

        return Output;
    }

    static playPSIDdigi(): Short {
        let PlaybackEnabled: boolean = false, NybbleCounter: boolean = false, RepeatCounter: UnsignedChar = new UnsignedChar(1), Shifts: number;
        let SampleAddress: UnsignedShort = new UnsignedShort(1), RatePeriod: UnsignedShort = new UnsignedShort(1);
        let Output: Short = new Short(1);
        let PeriodCounter: number = 0;

        if (C64.IObankWR[0xD41D]) {
            PlaybackEnabled = (C64.IObankWR[0xD41D] >= 0xFE);
            PeriodCounter = 0; NybbleCounter = false;
            SampleAddress[0] = C64.IObankWR[0xD41E] + (C64.IObankWR[0xD41F] << 8);
            RepeatCounter[0] = C64.IObankWR[0xD43F];
        }
        C64.IObankWR[0xD41D] = 0;

        if (PlaybackEnabled) {
            RatePeriod[0] = C64.IObankWR[0xD45D] + (C64.IObankWR[0xD45E] << 8);
            if (RatePeriod[0]) PeriodCounter += C64.CPUfrequency / RatePeriod[0] | 0; // HINT: avoid float
            if (PeriodCounter >= C64.SampleRate) {
                PeriodCounter -= C64.SampleRate;

                if (SampleAddress[0] < C64.IObankWR[0xD43D] + (C64.IObankWR[0xD43E] << 8)) {
                    if (NybbleCounter) {
                        Shifts = C64.IObankWR[0xD47D] ? 4 : 0;
                        ++SampleAddress[0];
                    }
                    else Shifts = C64.IObankWR[0xD47D] ? 0 : 4;
                    Output[0] = (((C64.RAMbank[SampleAddress[0]] >> Shifts) & 0x0F) - 8) * DIGI_VOLUME; //* (C64->IObankWR[0xD418]&0x0F);
                    NybbleCounter = !NybbleCounter;
                }
                else if (RepeatCounter[0]) {
                    SampleAddress[0] = C64.IObankWR[0xD47F] + (C64.IObankWR[0xD47E] << 8);
                    RepeatCounter[0]--;
                }
            }
        }

        return Output;
    }
}
