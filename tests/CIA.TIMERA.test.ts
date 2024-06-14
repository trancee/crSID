import { CIA } from "../src/CIA"
import { CONTROLA, FORCELOADA_STROBE, ONESHOT_TIMERA, ENABLE_TIMERA, TIMERA, TIMERAH, TIMERAL } from "../src/CIA"
import { INTERRUPTS, INTERRUPT_HAPPENED, SET_OR_CLEAR_FLAGS } from "../src/CIA"

import { C64 } from "../src/C64"

const baseaddress = 0xDC00
const timer = 3

describe("CIA", () => {
    const cia = new CIA(baseaddress)

    const BasePtrWR = C64.IObankWR.Ptr(baseaddress)
    const BasePtrRD = C64.IObankRD.Ptr(baseaddress)

    BasePtrWR[TIMERAH] = 0
    BasePtrWR[TIMERAL] = timer

    it("instantiate", () => {
        expect(cia).toBeInstanceOf(CIA)

        cia.writeCIAIRQmask(0x00)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(0)

        expect(BasePtrWR[CONTROLA]).toEqual(0)
        expect(BasePtrRD[CONTROLA]).toEqual(0)

        expect(BasePtrWR[INTERRUPTS]).toEqual(0)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)
    })

    it("FORCELOADA_STROBE", () => {
        cia.writeCIAIRQmask(SET_OR_CLEAR_FLAGS | TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        BasePtrWR[CONTROLA] = ENABLE_TIMERA | FORCELOADA_STROBE
        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA | FORCELOADA_STROBE)
        expect(BasePtrRD[CONTROLA]).toEqual(0)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer)

        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer - 1)

        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer - 2)

        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer)

        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERA | INTERRUPT_HAPPENED)

        cia.acknowledgeCIAIRQ()

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)
    })

    it("ENABLE_TIMERA", () => {
        cia.writeCIAIRQmask(SET_OR_CLEAR_FLAGS | TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        BasePtrWR[CONTROLA] = ENABLE_TIMERA
        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer - 1)

        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer - 2)

        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer)

        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERA | INTERRUPT_HAPPENED)

        cia.acknowledgeCIAIRQ()

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)
    })

    it("ONESHOT_TIMERA", () => {
        cia.writeCIAIRQmask(SET_OR_CLEAR_FLAGS | TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        BasePtrWR[CONTROLA] = ENABLE_TIMERA | ONESHOT_TIMERA
        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA | ONESHOT_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer - 1)

        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA | ONESHOT_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA | ONESHOT_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer - 2)

        expect(BasePtrWR[CONTROLA]).toEqual(ENABLE_TIMERA | ONESHOT_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ENABLE_TIMERA | ONESHOT_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERAH]).toEqual(0)
        expect(BasePtrWR[TIMERAL]).toEqual(timer)
        expect(BasePtrRD[TIMERAH]).toEqual(0)
        expect(BasePtrRD[TIMERAL]).toEqual(timer)

        expect(BasePtrWR[CONTROLA]).toEqual(ONESHOT_TIMERA)
        expect(BasePtrRD[CONTROLA]).toEqual(ONESHOT_TIMERA)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERA | INTERRUPT_HAPPENED)

        cia.acknowledgeCIAIRQ()

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERA)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)
    })
})