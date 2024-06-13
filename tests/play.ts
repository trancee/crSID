import { Int, Short, UnsignedChar, debugArray } from "../src/types"

import { C64, SIDheader, SIDheaderOffset, Output, TimerSource } from "../src/C64"
import { MEM } from "../src/MEM"

// @ts-ignore
import { AudioContext } from "web-audio-api"
import Speaker from "speaker"

const DEFAULT_SAMPLERATE = 44100
const BUFFERSIZE_DEFAULT = 8192

// const samplerate = 44100

const SIDfileName = "tests/files/RoboCop_3.sid"//"tests/files/Cybernoid.sid"//"tests/files/Wizball.sid"
const SubTune = 0//4
const PrevFrameCycles: Short = new Short(1)
let CIAisSet: boolean = true

let context: AudioContext, scriptNode: any

const initSIDtune = (SIDheader: SIDheader, subtune: number) => { //subtune: 1..255
    // console.log(`initSIDtune subtune ${subtune}`)
    const PowersOf2: UnsignedChar = new UnsignedChar([0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80]);

    if (subtune == 0) subtune = 1;
    else if (subtune > SIDheader.SubtuneAmount) subtune = SIDheader.SubtuneAmount;
    C64.SubTune = subtune; C64.SecondCnt[0] = C64.PlayTime[0] = 0;
    C64.Paused = false;

    C64.setC64(); C64.initC64(); //cRSID_writeMemC64(C64,0xD418,0x0F); //set C64 hardware and init (reset) it

    //determine init-address:
    C64.InitAddress = SIDheader.InitAddress; //get info from BASIC-startupcode for some tunes
    if (C64.RAMbank[1] == 0x37) { //are there SIDs with routine under IO area? some PSIDs don't set bank-registers themselves
        if ((0xA000 <= C64.InitAddress && C64.InitAddress < 0xC000)
            || (C64.LoadAddress < 0xC000 && C64.EndAddress >= 0xA000)) C64.RAMbank[1] = 0x36;
        else if (C64.InitAddress >= 0xE000 || C64.EndAddress >= 0xE000) C64.RAMbank[1] = 0x35;
    }
    C64.CPU.initCPU(C64.InitAddress); //prepare init-routine call
    C64.CPU.A[0] = subtune - 1;
    // console.log(`C64.CPU.A ${C64.CPU.A}`)

    if (!C64.RealSIDmode) {
        //call init-routine:
        //allowed instructions, value should be selected to allow for long-running memory-copiers in init-routines (e.g. Synth Sample)
        for (let InitTimeout = 10000000; InitTimeout > 0; InitTimeout--) { if (C64.CPU.emulateCPU() >= 0xFE) break; } //give error when timed out?
    }

    //determine timing-source, if CIA, replace FrameCycles previouisly set to VIC-timing
    if (subtune > 32) C64.TimerSource = C64.SIDheader.SubtuneTimeSources[0] & 0x80; //subtunes above 32 should use subtune32's timing
    else C64.TimerSource = C64.SIDheader.SubtuneTimeSources[(32 - subtune) >> 3] & PowersOf2[(subtune - 1) & 7];
    if (C64.TimerSource || C64.IObankWR[0xDC05] != 0x40 || C64.IObankWR[0xDC04] != 0x24) { //CIA1-timing (probably multispeed tune)
        C64.FrameCycles[0] = ((C64.IObankWR[0xDC04] + (C64.IObankWR[0xDC05] << 8))); //<< 4) / C64->ClockRatio;
        C64.TimerSource = TimerSource.CIA; //if init-routine changed DC04 or DC05, assume CIA-timing
    }

    //determine playaddress:
    C64.PlayAddress = SIDheader.PlayAddress;
    if (C64.PlayAddress) { //normal play-address called with JSR
        if (C64.RAMbank[1] == 0x37) { //are there SIDs with routine under IO area?
            if (0xA000 <= C64.PlayAddress && C64.PlayAddress < 0xC000) C64.RAMbank[1] = 0x36;
        }
        else if (C64.PlayAddress >= 0xE000) C64.RAMbank[1] = 0x35; //player under KERNAL (e.g. Crystal Kingdom Dizzy)
    }
    else { //IRQ-playaddress for multispeed-tunes set by init-routine (some tunes turn off KERNAL ROM but doesn't set IRQ-vector!)
        C64.PlayAddress = (C64.RAMbank[1] & 3) < 2 ? MEM.readMem(0xFFFE)[0] + (MEM.readMem(0xFFFF)[0] << 8) //for PSID
            : MEM.readMem(0x314)[0] + (MEM.readMem(0x315)[0] << 8);
        if (C64.PlayAddress == 0) { //if 0, still try with RSID-mode fallback
            C64.CPU.initCPU(C64.PlayAddress); //point CPU to play-routine
            C64.Finished = true; C64.Returned = true; return;
        }
    }

    if (!C64.RealSIDmode) {  //prepare (PSID) play-routine playback:
        C64.CPU.initCPU(C64.PlayAddress); //point CPU to play-routine
        C64.FrameCycleCnt[0] = 0; C64.Finished = true; C64.SampleCycleCnt[0] = 0; //C64->CIAisSet=0;
    }
    else { C64.Finished = false; C64.Returned = false; }
}

const generateSound = (L: Float32Array, R: Float32Array, len: number) => {
    let Output: Output = { L: new Int(1), R: new Int(1) };
    for (let i = 0; i < len; i += 4) {
        for (let j = 0; j < C64.PlaybackSpeed; ++j) Output = generateSample();
        Output.L[0] = Output.L[0] * C64.MainVolume[0] / 256; Output.R[0] = Output.R[0] * C64.MainVolume[0] / 256;
        // buf[i + 0] = Output.L[0] & 0xFF; buf[i + 1] = Output.L[0] >> 8;
        // buf[i + 2] = Output.R[0] & 0xFF; buf[i + 3] = Output.R[0] >> 8;
        L[i] = Output.L[0];
        R[i] = Output.R[0];
    }
}

const generateSample = (): Output => { //call this from custom buffer-filler
    const Output: Output = C64.emulateC64();
    if (C64.PSIDdigiMode) { const PSIDdigi: Short = C64.playPSIDdigi(); Output.L[0] += PSIDdigi[0]; Output.R[0] += PSIDdigi[0]; }
    // if (Output.L[0] >= 32767) Output.L[0] = 32767; else if (Output.L[0] <= -32768) Output.L[0] = -32768; //saturation logic on overflow
    // if (Output.R[0] >= 32767) Output.R[0] = 32767; else if (Output.R[0] <= -32768) Output.R[0] = -32768; //saturation logic on overflow
    return Output;
}

import fs from "fs"
import { ChipModel } from "../src/SID"

const loadSIDfile = (filename: string): UnsignedChar /* unsigned char* [0, 255] */ => {
    return new UnsignedChar(fs.readFileSync(filename))
}

const toString = (data: UnsignedChar, offset: number, length: number) => new TextDecoder().decode(data.Ptr(offset, length)).split("\0")[0]
const processSIDfile = (filedata: UnsignedChar): SIDheader | undefined => {
    let SIDdataOffset: number;

    const MagicStringPSID: string = "PSID";
    const MagicStringRSID: string = "RSID";

    const SIDheader: SIDheader = {
        MagicString: toString(filedata, SIDheaderOffset.MagicString, 4),
        Version: (filedata[SIDheaderOffset.VersionH00] << 8) + filedata[SIDheaderOffset.Version],
        HeaderSize: (filedata[SIDheaderOffset.HeaderSizeH00] << 8) + filedata[SIDheaderOffset.HeaderSize],

        LoadAddress: (filedata[SIDheaderOffset.LoadAddressH] << 8) + filedata[SIDheaderOffset.LoadAddressL],
        InitAddress: (filedata[SIDheaderOffset.InitAddressH] << 8) + filedata[SIDheaderOffset.InitAddressL],
        PlayAddress: (filedata[SIDheaderOffset.PlayAddressH] << 8) + filedata[SIDheaderOffset.PlayAddressL],

        SubtuneAmount: (filedata[SIDheaderOffset.SubtuneAmountH00] << 8) + filedata[SIDheaderOffset.SubtuneAmount],
        DefaultSubtune: (filedata[SIDheaderOffset.DefaultSubtuneH00] << 8) + filedata[SIDheaderOffset.DefaultSubtune],
        SubtuneTimeSources: filedata.Ptr(SIDheaderOffset.SubtuneTimeSources, 4),

        Title: toString(filedata, SIDheaderOffset.Title, 32),
        Author: toString(filedata, SIDheaderOffset.Author, 32),
        ReleaseInfo: toString(filedata, SIDheaderOffset.ReleaseInfo, 32),

        ModelFormatStandard: (filedata[SIDheaderOffset.ModelFormatStandardH] << 8) + filedata[SIDheaderOffset.ModelFormatStandard],

        RelocStartPage: filedata[SIDheaderOffset.RelocStartPage],
        RelocFreePages: filedata[SIDheaderOffset.RelocFreePages],

        SID2baseAddress: filedata[SIDheaderOffset.SID2baseAddress],
        SID3baseAddress: filedata[SIDheaderOffset.SID3baseAddress],
        SID4baseAddress: filedata[SIDheaderOffset.SID4baseAddress],

        SID2flags: (filedata[SIDheaderOffset.SID2flagsH] << 8) + filedata[SIDheaderOffset.SID2flagsL],
        SID3flags: (filedata[SIDheaderOffset.SID3flagsH] << 8) + filedata[SIDheaderOffset.SID3flagsL],
        SID4flags: (filedata[SIDheaderOffset.SID4flagsH] << 8) + filedata[SIDheaderOffset.SID4flagsL],
    };

    C64.SIDheader = SIDheader;

    for (let i = 0x0000; i < 0xA000; ++i) C64.RAMbank[i] = 0; //fresh start (maybe some bugged SIDs want 0 at certain RAM-locations)
    for (let i = 0xC000; i < 0xD000; ++i) C64.RAMbank[i] = 0;

    if (SIDheader.MagicString !== MagicStringPSID && SIDheader.MagicString !== MagicStringRSID) return;
    C64.RealSIDmode = SIDheader.MagicString === MagicStringRSID;

    if (!SIDheader.LoadAddress) { //load-address taken from first 2 bytes of the C64 PRG
        C64.LoadAddress = (filedata[SIDheader.HeaderSize + 1] << 8) + filedata[SIDheader.HeaderSize + 0];
        SIDdataOffset = SIDheader.HeaderSize + 2;
    }
    else { //load-adress taken from SID-header
        C64.LoadAddress = C64.SIDheader.LoadAddress;
        SIDdataOffset = SIDheader.HeaderSize;
    }

    for (let i = SIDdataOffset; i < filedata.length; ++i) C64.RAMbank[C64.LoadAddress + (i - SIDdataOffset)] = filedata[i];

    const i = C64.LoadAddress + (filedata.length - SIDdataOffset);
    C64.EndAddress = (i < 0x10000) ? i : 0xFFFF;

    C64.PSIDdigiMode = Boolean(!C64.RealSIDmode && (filedata[SIDheader.ModelFormatStandard] & 0x0002));

    return C64.SIDheader;
}

const init = (samplerate: number, buflen: number) => {
    // static cRSID_C64instance* C64 = &cRSID_C64;

    C64.HighQualitySID = true; C64.Stereo = false; C64.SelectedSIDmodel = ChipModel.Unknown; C64.PlaybackSpeed = 1; //default model and mode selections
    C64.MainVolume[0] = 255;

    /*C64 =*/ C64.createC64(samplerate);

    // if (C64.initSound(samplerate, buflen) == NULL) return NULL;

    // return C64;
}

const close = () => {
    // scriptNode.disconnect(context.destination)
    // scriptNode && scriptNode.disconnect(context.destination);
    // context[Symbol.dispose]
}

const loadSIDtune = (filename: string): SIDheader | undefined => {
    const SIDfileData: UnsignedChar = loadSIDfile(filename) // unsigned char[FILESIZE_MAX] [0, 255]

    return processSIDfile(SIDfileData);
}

const playSIDtune = () => {
    // const len = 10000//2945
    // const output = new UnsignedChar(len)
    // generateSound(output, output.length)
    // console.log(debugArray("output", output))
    // return

    context = new AudioContext({ latencyHint: 'interactive' })

    // console.log('encoding format : '
    //     + context.format.numberOfChannels + ' channels ; '
    //     + context.format.bitDepth + ' bits ; '
    //     + context.sampleRate + ' Hz'
    // )
    context.outStream = new Speaker({
        channels: context.format.numberOfChannels,
        bitDepth: context.format.bitDepth,
        sampleRate: context.sampleRate
    })

    scriptNode = context.createScriptProcessor(16384, 0, 1) // bufferSize, numberOfInputChannels, numberOfOutputChannels
    scriptNode.onaudioprocess = function (audioProcessingEvent: any) { //scriptNode will be replaced by AudioWorker in new browsers sooner or later
        // The input buffer is a song we loaded earlier
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);

        // The output buffer contains the samples that will be modified and played
        const outputBuffer = audioProcessingEvent.outputBuffer;

        // Loop through the samples
        for (let sample = 0; sample < inputBuffer.length; sample++) {
            // make output equal to the same as the input
            outputBuffer.getChannelData(0)[sample] = inputData[sample];
            // outputBuffer.getChannelData(1)[sample] = inputData[sample];

            let Output;
            for (let j = 0; j < C64.PlaybackSpeed; ++j) Output = generateSample(); // C64.emulateC64();

            if (Output) {
                var short = Output.L[0]
                var range = 1 << 16 - 1;

                if (short >= range) {
                    short |= ~(range - 1);
                }
                const value = (short / range);

                outputBuffer.getChannelData(0)[sample] = value// * C64.MainVolume[0] / 255;
                // outputBuffer.getChannelData(1)[sample] = Output.R[0]// * C64.MainVolume[0] / 256;
            }

            // // Loop through the output channels (in this case there is only one)
            // for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
            //     const outputData = outputBuffer.getChannelData(channel);

            //     // make output equal to the same as the input
            //     outputData[sample] = inputData[sample];
            // }
        }
    }
    scriptNode.connect(context.destination);
}

const main = async () => {
    init(DEFAULT_SAMPLERATE, BUFFERSIZE_DEFAULT);

    const SIDheader: SIDheader | undefined = loadSIDtune(SIDfileName)

    // console.log("LoadAddress", C64.LoadAddress)
    // console.log("EndAddress", C64.EndAddress)

    if (SIDheader) {
        initSIDtune(SIDheader, SubTune)

        // console.log(debugArray("RAMbank", C64.RAMbank))
        // console.log(debugArray("IObankWR", C64.IObankWR))
        // console.log(debugArray("IObankRD", C64.IObankRD))
        // console.log(debugArray("ROMbanks", C64.ROMbanks))

        console.log(`Author: ${SIDheader.Author} , Title: ${SIDheader.Title} , Info: ${SIDheader.ReleaseInfo}`)

        console.log(`Load-address:$${C64.LoadAddress.toString(16)}, End-address:$${C64.EndAddress.toString(16)}, Size:${C64.EndAddress - C64.LoadAddress} bytes`);
        let str = `Init-address:$${C64.InitAddress.toString(16)}, `
        if (!C64.RealSIDmode) {
            str += `Play-address:$${C64.PlayAddress.toString(16)}, `
            if (SIDheader.PlayAddress == 0)
                str += "(IRQ), "
        }
        str += `Subtune:${C64.SubTune} (of ${SIDheader.SubtuneAmount})`
        if (C64.RealSIDmode)
            str += ", RealSID"
        else if (C64.PSIDdigiMode)
            str += ", PSID-digi"
        console.log(str)
    }

    PrevFrameCycles[0] = C64.FrameCycles[0];
    let str = ""
    if (!C64.RealSIDmode) {
        str += `Speed: ${((C64.VideoStandard <= 1 ? 19656.0 : 17095.0) / C64.FrameCycles[0]).toFixed(1)}x (player-call at every ${C64.FrameCycles} cycle) TimerSource:${C64.TimerSource ? "CIA" : "VIC"} `
    }
    console.log(str + `Standard:${C64.VideoStandard ? "PAL" : "NTSC"}`)

    playSIDtune();
    for (let i = 1000; i > 0; i--) {
        await delay(100);
        // console.debug(`FrameCycles ${C64.FrameCycles} PrevFrameCycles ${PrevFrameCycles} ${Number(CIAisSet)}`)
        if (C64.FrameCycles[0] != PrevFrameCycles[0]) {
            if (!CIAisSet) {
                CIAisSet = true;
                console.log(`New FrameSpeed: ${((C64.VideoStandard <= 1 ? 19656.0 : 17095.0) / C64.FrameCycles[0]).toFixed(1)}x (${C64.FrameCycles} cycles between playercalls)`)
            }
        }
    }

    close()

    process.exit(0)
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

main()
