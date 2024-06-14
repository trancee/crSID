import { CIA } from "../src/CIA"
import { CONTROLB, FORCELOADB_STROBE, ONESHOT_TIMERB, ENABLE_TIMERB, TIMERB, TIMERBH, TIMERBL } from "../src/CIA"
import { INTERRUPTS, INTERRUPT_HAPPENED, SET_OR_CLEAR_FLAGS } from "../src/CIA"

import { C64 } from "../src/C64"

const baseaddress = 0xDD00
const timer = 3

describe("CIA", () => {
    const cia = new CIA(baseaddress)

    const BasePtrWR = C64.IObankWR.Ptr(baseaddress)
    const BasePtrRD = C64.IObankRD.Ptr(baseaddress)

    BasePtrWR[TIMERBH] = 0
    BasePtrWR[TIMERBL] = timer

    it("instantiate", () => {
        expect(cia).toBeInstanceOf(CIA)

        cia.writeCIAIRQmask(0x00)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(0)

        expect(BasePtrWR[CONTROLB]).toEqual(0)
        expect(BasePtrRD[CONTROLB]).toEqual(0)

        expect(BasePtrWR[INTERRUPTS]).toEqual(0)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)
    })

    it("FORCELOADA_STROBE", () => {
        cia.writeCIAIRQmask(SET_OR_CLEAR_FLAGS | TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        BasePtrWR[CONTROLB] = ENABLE_TIMERB | FORCELOADB_STROBE
        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB | FORCELOADB_STROBE)
        expect(BasePtrRD[CONTROLB]).toEqual(0)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 1)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 2)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        cia.acknowledgeCIAIRQ()

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)
    })

    it("ENABLE_TIMERA", () => {
        cia.writeCIAIRQmask(SET_OR_CLEAR_FLAGS | TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        BasePtrWR[CONTROLB] = ENABLE_TIMERB
        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 1)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 2)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        cia.acknowledgeCIAIRQ()

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)
    })

    it("ONESHOT_TIMERA", () => {
        cia.writeCIAIRQmask(SET_OR_CLEAR_FLAGS | TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        BasePtrWR[CONTROLB] = ENABLE_TIMERB | ONESHOT_TIMERB
        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 1)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(0)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 2)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(BasePtrWR[CONTROLB]).toEqual(ONESHOT_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ONESHOT_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        cia.acknowledgeCIAIRQ()

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)
    })
})