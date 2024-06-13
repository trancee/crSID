import { CIA } from "../src/CIA"
import { CONTROLB, FORCELOADB_STROBE, ONESHOT_TIMERB, ENABLE_TIMERB, TIMERB, TIMERBH, TIMERBL } from "../src/CIA"
import { INTERRUPTS, INTERRUPT_HAPPENED } from "../src/CIA"

import { C64 } from "../src/C64"

const baseaddress = 0xDD00
const timer = 3

describe("CIA", () => {
    const cia = new CIA(baseaddress)

    const BasePtrWR = C64.IObankWR.Ptr(baseaddress)
    const BasePtrRD = C64.IObankRD.Ptr(baseaddress)

    BasePtrWR[TIMERBH] = 0
    BasePtrWR[TIMERBL] = timer

    BasePtrWR[CONTROLB] |= ENABLE_TIMERB
    BasePtrWR[INTERRUPTS] |= TIMERB

    it("instantiate", () => {
        expect(cia).toBeInstanceOf(CIA)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(0)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(0)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(0)
    })

    it("ENABLE_TIMERA", () => {
        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 1)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 2)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)
    })

    it("FORCELOADA_STROBE", () => {
        BasePtrWR[CONTROLB] |= ENABLE_TIMERB | FORCELOADB_STROBE

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 1)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 2)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)
    })

    it("ONESHOT_TIMERA", () => {
        BasePtrWR[CONTROLB] |= ENABLE_TIMERB | ONESHOT_TIMERB

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 1)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer - 2)

        expect(BasePtrWR[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ENABLE_TIMERB | ONESHOT_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)

        expect(cia.emulateCIA(1)).toEqual(INTERRUPT_HAPPENED)

        expect(BasePtrWR[TIMERBH]).toEqual(0)
        expect(BasePtrWR[TIMERBL]).toEqual(timer)
        expect(BasePtrRD[TIMERBH]).toEqual(0)
        expect(BasePtrRD[TIMERBL]).toEqual(timer)

        expect(BasePtrWR[CONTROLB]).toEqual(ONESHOT_TIMERB)
        expect(BasePtrRD[CONTROLB]).toEqual(ONESHOT_TIMERB)

        expect(BasePtrWR[INTERRUPTS]).toEqual(TIMERB)
        expect(BasePtrRD[INTERRUPTS]).toEqual(TIMERB | INTERRUPT_HAPPENED)
    })
})