//C64 emulation (SID-playback related)

import { Int, Short, UnsignedChar, UnsignedInt, UnsignedShort } from "./types"

import { CPU } from "./CPU"
import { MEM } from "./MEM"
import { SID } from "./SID"
import { CIA } from "./CIA"
import { VIC } from "./VIC"
import { ChipModel, Channels } from "./SID";

const DebugSample = false
const DebugOutput = false

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
// const
//  PAL_FRAMERATE = 50, NTSC_FRAMERATE = 60 //Hz

// Oversampling
const
    OVERSAMPLING_RATIO = 7, OVERSAMPLING_CYCLES = ((C64_PAL_CPUCLK / DEFAULT_SAMPLERATE) / OVERSAMPLING_RATIO) | 0

// PSIDdigiSpecs
const DIGI_VOLUME = 1200 //80

const CPUspeeds: UnsignedInt = new UnsignedInt([C64_NTSC_CPUCLK, C64_PAL_CPUCLK]);
export const ScanLines: UnsignedShort = new UnsignedShort([C64_NTSC_SCANLINES, C64_PAL_SCANLINES]);
export const ScanLineCycles: UnsignedChar = new UnsignedChar([C64_NTSC_SCANLINE_CYCLES, C64_PAL_SCANLINE_CYCLES]);
//const FrameRates: char[] = [NTSC_FRAMERATE, PAL_FRAMERATE];

const Attenuations: Short = new Short([0, 26, 43, 137, 200]); //increase for 2SID (to 43) and 3SID (to 137)

export type Output = {
    L: Int // signed int [−32767, +32767]
    R: Int // signed int [−32767, +32767]
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

export class C64 {
    //platform-related:
    static SampleRate: number;      // unsigned short [0, 65535]
    static BufferSize: UnsignedInt = new UnsignedInt(1);      // unsigned int [0, 65535]
    static HighQualitySID: boolean;  // unsigned char [0, 255]
    static SIDchipCount: number;    // unsigned char [0, 255]
    static Stereo: boolean;          // unsigned char [0, 255]
    static PlaybackSpeed: number;   // unsigned char [0, 255]
    static Paused: boolean;          // unsigned char [0, 255]

    //C64-machine related:
    static VideoStandard: VideoStandard;    // unsigned char [0, 255] //0:NTSC, 1:PAL (based on the SID-header field)
    static CPUfrequency: UnsignedInt = new UnsignedInt(1);            // unsigned int [0, 65535]
    static SampleClockRatio: UnsignedShort = new UnsignedShort(1);        // unsigned short [0, 65535] //ratio of CPU-clock and samplerate
    static SelectedSIDmodel: ChipModel;        // unsigned short [0, 65535]
    static MainVolume: UnsignedChar = new UnsignedChar(1);              // unsigned char [0, 255]

    //SID-file related:
    static SIDheader: SIDheader;

    static Attenuation: number;         // unsigned short [0, 65535]
    static RealSIDmode: boolean;        // char [0, 255]
    static PSIDdigiMode: boolean;       // char [0, 255]
    static SubTune: number;             // unsigned char [0, 255]
    static LoadAddress: number;         // unsigned short [0, 65535]
    static InitAddress: number;         // unsigned short [0, 65535]
    static PlayAddress: number;         // unsigned short [0, 65535]
    static EndAddress: number;          // unsigned short [0, 65535]
    static TimerSource: TimerSource;    // char [0, 255] //for current subtune, 0:VIC, 1:CIA (as in SID-header)

    //PSID-playback related:
    static SoundStarted: boolean;        // unsigned char [0, 255]
    //static CIAisSet: char;          // char [0, 255] //for dynamic CIA setting from player-routine (RealSID substitution)
    static FrameCycles: Int = new Int(1);         // int [−32767, +32767]
    static FrameCycleCnt: Int = new Int(1);       // int [−32767, +32767] //this is a substitution in PSID-mode for CIA/VIC counters
    static PrevRasterLine: Short = new Short(1);      // short [−32767, +32767]
    static SampleCycleCnt: Short = new Short(1);      // short [−32767, +32767]
    static OverSampleCycleCnt: Short = new Short(1);  // short [−32767, +32767]
    static TenthSecondCnt: Short = new Short(1);      // short [−32767, +32767]
    static SecondCnt: UnsignedShort = new UnsignedShort(1);           // unsigned short [0, 65535]
    static PlayTime: Short = new Short(1);            // short [−32767, +32767]
    static Finished: boolean;           // char [0, 255]
    static Returned: boolean;           // char [0, 255]
    static IRQ: UnsignedChar = new UnsignedChar(1);                 // unsigned char [0, 255] //collected IRQ line from devices
    static NMI: UnsignedChar = new UnsignedChar(1);                 // unsigned char [0, 255] //collected NMI line from devices

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
        // console.debug("createC64", samplerate)
        if (samplerate) C64.SampleRate = samplerate;
        else C64.SampleRate = samplerate = DEFAULT_SAMPLERATE;
        C64.SampleClockRatio[0] = (C64_PAL_CPUCLK << 4) / samplerate; //shifting (multiplication) enhances SampleClockRatio precision

        C64.Attenuation = 26; C64.SIDchipCount = 1;
        // C64.CPU.C64 = C64;

        C64.SID[1] = new SID(ChipModel.MOS8580, Channels.CHANNEL_BOTH, 0xD400); //default C64 setup with only 1 SID and 2 CIAs and 1 VIC

        // if (C64.HighQualitySID) {
        //     C64.SID[2] = new SID(ChipModel.MOS8580, Channels.CHANNEL_BOTH, 0xD400);
        //     C64.SID[3] = new SID(ChipModel.MOS8580, Channels.CHANNEL_BOTH, 0xD400);
        //     C64.SID[4] = new SID(ChipModel.MOS8580, Channels.CHANNEL_BOTH, 0xD400);
        // }

        C64.CIA[1] = new CIA(0xDC00);
        C64.CIA[2] = new CIA(0xDD00);

        C64.VIC = new VIC(0xD000);

        //if(C64->RealSIDmode) {
        MEM.setROMcontent();
        //}

        C64.initC64();
    }

    static setC64(): void {   //set hardware-parameters (Models, SIDs) for playback of loaded SID-tune
        // console.debug("setC64")
        let SIDmodel: ChipModel;
        let SIDchannel: Channels;

        C64.VideoStandard = Number(((C64.SIDheader.ModelFormatStandard & 0x0C) >> 2) != 2);
        if (C64.SampleRate == 0) C64.SampleRate = 44100;
        C64.CPUfrequency[0] = CPUspeeds[C64.VideoStandard];
        C64.SampleClockRatio[0] = (C64.CPUfrequency[0] << 4) / C64.SampleRate; //shifting (multiplication) enhances SampleClockRatio precision

        C64.VIC.RasterLines = ScanLines[C64.VideoStandard];
        C64.VIC.RasterRowCycles = ScanLineCycles[C64.VideoStandard];
        C64.FrameCycles[0] = C64.VIC.RasterLines * C64.VIC.RasterRowCycles; ///C64->SampleRate / PAL_FRAMERATE; //1x speed tune with VIC Vertical-blank timing

        C64.PrevRasterLine[0] = -1; //so if $d012 is set once only don't disturb FrameCycleCnt

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

        C64.SIDchipCount = 1 + Number(C64.SID[2].BaseAddress.length > 0) + Number(C64.SID[3].BaseAddress.length > 0) + Number(C64.SID[4].BaseAddress.length > 0);
        if (C64.SIDchipCount == 1) C64.SID[1].Channel = Channels.CHANNEL_BOTH;
        C64.Attenuation = Attenuations[C64.SIDchipCount];
    }

    static initC64() { //C64 Reset
        // console.debug("initC64")
        C64.SID[1].initSIDchip();
        C64.SID[1].NonFiltedSample[0] = 0; C64.SID[1].FilterInputSample[0] = 0;
        C64.SID[1].PrevNonFiltedSample[0] = 0; C64.SID[1].PrevFilterInputSample[0] = 0;
        C64.CIA[1].initCIAchip(); C64.CIA[2].initCIAchip();
        MEM.initMem();
        C64.CPU = new CPU((MEM.readMem(0xFFFD)[0] << 8) + MEM.readMem(0xFFFC)[0]);
        C64.IRQ[0] = C64.NMI[0] = 0;
        if (C64.HighQualitySID) {
            if (C64.SID[2]) {
                C64.SID[2].NonFiltedSample[0] = 0; C64.SID[2].FilterInputSample[0] = 0;
                C64.SID[2].PrevNonFiltedSample[0] = 0; C64.SID[2].PrevFilterInputSample[0] = 0;
            }
            if (C64.SID[3]) {
                C64.SID[3].NonFiltedSample[0] = 0; C64.SID[3].FilterInputSample[0] = 0;
                C64.SID[3].PrevNonFiltedSample[0] = 0; C64.SID[3].PrevFilterInputSample[0] = 0;
            }
            if (C64.SID[4]) {
                C64.SID[4].NonFiltedSample[0] = 0; C64.SID[4].FilterInputSample[0] = 0;
                C64.SID[4].PrevNonFiltedSample[0] = 0; C64.SID[4].PrevFilterInputSample[0] = 0;
            }
        }
        C64.SampleCycleCnt[0] = C64.OverSampleCycleCnt[0] = 0;
    }

    static emulateC64(): Output {
        // console.debug("emulateC64")
        let InstructionCycles: number = 0, HQsampleCount: number = 0;
        let Tmp: Int = new Int(1);
        let Output: Output = { L: new Int(1), R: new Int(1) };

        //Cycle-based part of emulations:
        // console.debug("SampleCycleCnt", C64.SampleCycleCnt[0], "SampleClockRatio", C64.SampleClockRatio[0], Number(C64.SampleCycleCnt[0] <= C64.SampleClockRatio[0]))
        while (C64.SampleCycleCnt[0] <= C64.SampleClockRatio[0]) {

            if (!C64.RealSIDmode) {
                if (C64.FrameCycleCnt[0] >= C64.FrameCycles[0]) {
                    C64.FrameCycleCnt[0] -= C64.FrameCycles[0];
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
                    // console.debug("SampleCycleCnt", C64.SampleCycleCnt[0], "InstructionCycles", InstructionCycles)
                }
                else InstructionCycles = 7; //idle between player-calls
                C64.FrameCycleCnt[0] += InstructionCycles;
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
                C64.IRQ[0] = C64.NMI[0] = 0; //prepare for collecting IRQ sources
                C64.IRQ[0] |= C64.CIA[1].emulateCIA(InstructionCycles);
                C64.NMI[0] |= C64.CIA[2].emulateCIA(InstructionCycles);
                C64.IRQ[0] |= C64.VIC.emulateVIC(InstructionCycles);
            }

            C64.SampleCycleCnt[0] += (InstructionCycles << 4);
            // console.debug("SampleCycleCnt", C64.SampleCycleCnt[0], "InstructionCycles", InstructionCycles, InstructionCycles << 4)

            C64.SID[1].emulateADSRs(InstructionCycles);
            if (C64.SID[2].BaseAddress.length > 0) C64.SID[2].emulateADSRs(InstructionCycles);
            if (C64.SID[3].BaseAddress.length > 0) C64.SID[3].emulateADSRs(InstructionCycles);
            if (C64.SID[4].BaseAddress.length > 0) C64.SID[4].emulateADSRs(InstructionCycles);

        }
        C64.SampleCycleCnt[0] -= C64.SampleClockRatio[0];

        if (C64.HighQualitySID) { //oversampled waveform-generation
            HQsampleCount = 0;
            C64.SID[1].NonFiltedSample[0] = C64.SID[1].FilterInputSample[0] = 0;
            C64.SID[2].NonFiltedSample[0] = C64.SID[2].FilterInputSample[0] = 0;
            C64.SID[3].NonFiltedSample[0] = C64.SID[3].FilterInputSample[0] = 0;
            C64.SID[4].NonFiltedSample[0] = C64.SID[4].FilterInputSample[0] = 0;

            while (C64.OverSampleCycleCnt[0] <= C64.SampleClockRatio[0]) {
                const SIDwavOutput = C64.SID[1].emulateHQwaves(OVERSAMPLING_CYCLES);
                // console.debug(`emulateC64 SIDwavOutput { NonFilted: ${SIDwavOutput.NonFilted} FilterInput: ${SIDwavOutput.FilterInput} }`)
                C64.SID[1].NonFiltedSample[0] += SIDwavOutput.NonFilted; C64.SID[1].FilterInputSample[0] += SIDwavOutput.FilterInput;
                if (C64.SID[2].BaseAddress.length > 0) {
                    const SIDwavOutput = C64.SID[2].emulateHQwaves(OVERSAMPLING_CYCLES);
                    C64.SID[2].NonFiltedSample[0] += SIDwavOutput.NonFilted; C64.SID[2].FilterInputSample[0] += SIDwavOutput.FilterInput;
                }
                if (C64.SID[3].BaseAddress.length > 0) {
                    const SIDwavOutput = C64.SID[3].emulateHQwaves(OVERSAMPLING_CYCLES);
                    C64.SID[3].NonFiltedSample[0] += SIDwavOutput.NonFilted; C64.SID[3].FilterInputSample[0] += SIDwavOutput.FilterInput;
                }
                if (C64.SID[4].BaseAddress.length > 0) {
                    const SIDwavOutput = C64.SID[4].emulateHQwaves(OVERSAMPLING_CYCLES);
                    C64.SID[4].NonFiltedSample[0] += SIDwavOutput.NonFilted; C64.SID[4].FilterInputSample[0] += SIDwavOutput.FilterInput;
                }
                ++HQsampleCount;
                C64.OverSampleCycleCnt[0] += (OVERSAMPLING_CYCLES << 4);
            }
            C64.OverSampleCycleCnt[0] -= C64.SampleClockRatio[0];
        }

        //Samplerate-based part of emulations:

        if (!C64.RealSIDmode) { //some PSID tunes use CIA TOD-clock (e.g. Kawasaki Synthesizer Demo)
            --C64.TenthSecondCnt[0];
            if (C64.TenthSecondCnt[0] <= 0) {
                C64.TenthSecondCnt[0] = C64.SampleRate / 10;
                ++(C64.IObankRD[0xDC08]);
                if (C64.IObankRD[0xDC08] >= 10) {
                    C64.IObankRD[0xDC08] = 0; ++(C64.IObankRD[0xDC09]);
                    //if(C64->IObankRD[0xDC09]%
                }
            }
        }

        if (C64.SecondCnt[0] < C64.SampleRate) ++C64.SecondCnt[0]; else { C64.SecondCnt[0] = 0; if (C64.PlayTime[0] < 3600) ++C64.PlayTime[0]; }


        if (!C64.HighQualitySID) {
            if (!C64.Stereo || C64.SIDchipCount == 1) {
                Output.L[0] = Output.R[0] = C64.SID[1].emulateWaves()[0];
                if (C64.SID[2].BaseAddress.length > 0) Output.L[0] = Output.R[0] += C64.SID[2].emulateWaves()[0];
                if (C64.SID[3].BaseAddress.length > 0) Output.L[0] = Output.R[0] += C64.SID[3].emulateWaves()[0];
                if (C64.SID[4].BaseAddress.length > 0) Output.L[0] = Output.R[0] += C64.SID[4].emulateWaves()[0];
            }
            else {
                Tmp = C64.SID[1].emulateWaves();
                if (C64.SID[1].Channel == Channels.CHANNEL_LEFT) { Output.L[0] = Tmp[0] * 2; Output.R[0] = 0; }
                else if (C64.SID[1].Channel == Channels.CHANNEL_RIGHT) { Output.R[0] = Tmp[0] * 2; Output.L[0] = 0; }
                else Output.L[0] = Output.R[0] = Tmp[0];
                if (C64.SID[2].BaseAddress.length > 0) {
                    Tmp = C64.SID[2].emulateWaves();
                    if (C64.SID[2].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[2].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
                if (C64.SID[3].BaseAddress.length > 0) {
                    Tmp = C64.SID[3].emulateWaves();
                    if (C64.SID[3].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[3].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
                if (C64.SID[4].BaseAddress.length > 0) {
                    Tmp = C64.SID[4].emulateWaves();
                    if (C64.SID[4].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[4].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
            }
        }

        else { //SID output-stages and mono/stereo handling for High-Quality SID-emulation
            DebugSample && console.log("NonFiltedSample", C64.SID[1].NonFiltedSample[0], C64.SID[1].NonFiltedSample[0] / HQsampleCount|0, "FilterInputSample", C64.SID[1].FilterInputSample[0], C64.SID[1].FilterInputSample[0] / HQsampleCount|0, "HQsampleCount", HQsampleCount)
            C64.SID[1].NonFiltedSample[0] /= HQsampleCount; C64.SID[1].FilterInputSample[0] /= HQsampleCount;
            if (C64.SID[2].BaseAddress.length > 0) {
                C64.SID[2].NonFiltedSample[0] /= HQsampleCount; C64.SID[2].FilterInputSample[0] /= HQsampleCount;
            }
            if (C64.SID[3].BaseAddress.length > 0) {
                C64.SID[3].NonFiltedSample[0] /= HQsampleCount; C64.SID[3].FilterInputSample[0] /= HQsampleCount;
            }
            if (C64.SID[4].BaseAddress.length > 0) {
                C64.SID[4].NonFiltedSample[0] /= HQsampleCount; C64.SID[4].FilterInputSample[0] /= HQsampleCount;
            }
            if (!C64.Stereo || C64.SIDchipCount == 1) {
                Output.L[0] = Output.R[0] = C64.SID[1].emulateSIDoutputStage()[0];
                if (C64.SID[2].BaseAddress.length > 0) Output.L[0] += C64.SID[2].emulateSIDoutputStage()[0];
                if (C64.SID[3].BaseAddress.length > 0) Output.L[0] += C64.SID[3].emulateSIDoutputStage()[0];
                if (C64.SID[4].BaseAddress.length > 0) Output.L[0] += C64.SID[4].emulateSIDoutputStage()[0];
                Output.R[0] = Output.L[0];
            }
            else {
                Tmp = C64.SID[1].emulateSIDoutputStage();
                if (C64.SID[1].Channel == Channels.CHANNEL_LEFT) { Output.L[0] = Tmp[0] * 2; Output.R[0] = 0; }
                else if (C64.SID[1].Channel == Channels.CHANNEL_RIGHT) { Output.R[0] = Tmp[0] * 2; Output.L[0] = 0; }
                else Output.L[0] = Output.R[0] = Tmp[0];
                if (C64.SID[2].BaseAddress.length > 0) {
                    Tmp = C64.SID[2].emulateSIDoutputStage();
                    if (C64.SID[2].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[2].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
                if (C64.SID[3].BaseAddress.length > 0) {
                    Tmp = C64.SID[3].emulateSIDoutputStage();
                    if (C64.SID[3].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[3].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
                if (C64.SID[4].BaseAddress.length > 0) {
                    Tmp = C64.SID[4].emulateSIDoutputStage();
                    if (C64.SID[4].Channel == Channels.CHANNEL_LEFT) Output.L[0] += Tmp[0] * 2;
                    else if (C64.SID[4].Channel == Channels.CHANNEL_RIGHT) Output.R[0] += Tmp[0] * 2;
                    else { Output.L[0] += Tmp[0]; Output.R[0] += Tmp[0]; }
                }
            }
        }


        //average level (for VU-meter)
        C64.SID[1].Level[0] += ((abs(C64.SID[1].Output[0]) >> 4) - C64.SID[1].Level[0]) / 1024;
        if (C64.SID[2].BaseAddress.length > 0) C64.SID[2].Level[0] += ((abs(C64.SID[2].Output[0]) >> 4) - C64.SID[2].Level[0]) / 1024;
        if (C64.SID[3].BaseAddress.length > 0) C64.SID[3].Level[0] += ((abs(C64.SID[3].Output[0]) >> 4) - C64.SID[3].Level[0]) / 1024;
        if (C64.SID[4].BaseAddress.length > 0) C64.SID[4].Level[0] += ((abs(C64.SID[4].Output[0]) >> 4) - C64.SID[4].Level[0]) / 1024;

        DebugOutput && console.log(`Output { L: ${Output.L} R: ${Output.R} }`)
        // C64.OUTPUT += `${Output.L} ${Output.R}, `; if (C64.COUNT++ > 10) { console.debug(C64.OUTPUT); C64.OUTPUT = ""; C64.COUNT = 0 };
        return Output;
    }
    // static OUTPUT: String = ""
    // static COUNT: number = 0

    static playPSIDdigi(): Short {
        // console.debug("playPSIDdigi")
        let PlaybackEnabled: boolean = false, NybbleCounter: boolean = false, RepeatCounter: UnsignedChar = new UnsignedChar(1), Shifts: number;
        let SampleAddress: UnsignedShort = new UnsignedShort(1), RatePeriod: UnsignedShort = new UnsignedShort(1);
        let Output: Short = new Short(1);
        let PeriodCounter: number = 0;

        if (C64.IObankWR[0xD41D]) {
            PlaybackEnabled = (C64.IObankWR[0xD41D] >= 0xFE);
            // PeriodCounter = 0; NybbleCounter = false;
            SampleAddress[0] = C64.IObankWR[0xD41E] + (C64.IObankWR[0xD41F] << 8);
            RepeatCounter[0] = C64.IObankWR[0xD43F];
        }
        C64.IObankWR[0xD41D] = 0;

        if (PlaybackEnabled) {
            RatePeriod[0] = C64.IObankWR[0xD45D] + (C64.IObankWR[0xD45E] << 8);
            if (RatePeriod[0]) PeriodCounter += C64.CPUfrequency[0] / RatePeriod[0] | 0; // HINT: avoid float
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
