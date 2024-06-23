import { C64 } from "../src/C64"
import { B, C, CPU, D, I, IRQ, N, U, V, Z } from "../src/CPU"
import { debugArray } from "../src/types"

// https://github.com/floooh/chips-test/blob/master/tests/m6502-test.c

describe("6502", () => {
    const mem = C64.RAMbank, rom = C64.ROMbanks
    const cpu = new CPU()

    const PC = "PC", A = "A", X = "X", Y = "Y", P = "P", S = "S"

    const T = (a: any, b: any = true) => expect(b).toEqual(a)
    const R = (r: "PC" | "A" | "X" | "Y" | "P" | "S"): number => cpu[r]
    const tf = (expected: number) => (R(P) & ~(U | I | B)) === expected

    const w8 = (addr: number, data: number) => mem[addr] = data & 0xFF
    const w16 = (addr: number, data: number, m = mem) => { m[addr] = data & 0xFF; m[(addr + 1) & 0xFFFF] = data >> 8 }
    const r8 = (addr: number) => mem[addr]
    const r16 = (addr: number) => mem[(addr + 1) & 0xFFFF] | mem[addr]

    const init = () => {
        C64.RAMbank.fill(0x00)
        C64.IObankWR.fill(0x00)
        C64.IObankRD.fill(0x00)
        C64.ROMbanks.fill(0x00)

        cpu.initCPU(0x0000)

        cpu.ST = Z | B | I
        cpu.SP = 0xBD
    }

    const prefetch = (pc: number) => cpu.PC = pc
    const step = () => cpu.emulateCPU()

    const copy = (addr: number, bytes: Uint8Array, num: number = bytes.length) => {
        for (let i = 0; i < num; i++) {
            mem[addr + i] = bytes[i]
        }
    }

    it("BRK", () => {
        init()

        const prog = new Uint8Array([
            0xA9, 0xAA,     // LDA #$AA
            0x00,           // BRK
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            0xA9, 0xBB,     // LDA #$BB
        ])
        copy(0x0000, prog)
        // set BRK/IRQ vector
        w16(IRQ, 0x0010, rom)
        prefetch(0x0000)

        // console.log(debugArray(`S ${SP}`, C64.RAMbank, 0x100, 0x100))
        // 0x94: N | B | I
        // 0xB4: N | U | B | I
        T(2, step()); T(R(PC), 0x0002); T(R(A), 0xAA)
        T(7, step()); T(R(PC), 0x0010); T(R(S), 0xBA); T(r8(0x01BB), N | B | I /* FIXME: 0xB4 */); T(r16(0x01BC), 0x0004)
        T(2, step()); T(R(A), 0xBB)
    })
    it("LDA", () => {
        init()

        const prog = new Uint8Array([
            // immediate
            0xA9, 0x00,         // LDA #$00
            0xA9, 0x01,         // LDA #$01
            0xA9, 0x00,         // LDA #$00
            0xA9, 0x80,         // LDA #$80

            // zero page
            0xA5, 0x02,         // LDA $02
            0xA5, 0x03,         // LDA $03
            0xA5, 0x80,         // LDA $80
            0xA5, 0xFF,         // LDA $FF

            // absolute
            0xAD, 0x00, 0x10,   // LDA $1000
            0xAD, 0xFF, 0xFF,   // LDA $FFFF
            0xAD, 0x21, 0x00,   // LDA $0021

            // zero page,X
            0xA2, 0x0F,         // LDX #$0F
            0xB5, 0x10,         // LDA $10,X    => 0x1F
            0xB5, 0xF8,         // LDA $FE,X    => 0x07
            0xB5, 0x78,         // LDA $78,X    => 0x87

            // absolute,X
            0xBD, 0xF1, 0x0F,   // LDA $0x0FF1,X    => 0x1000
            0xBD, 0xF0, 0xFF,   // LDA $0xFFF0,X    => 0xFFFF
            0xBD, 0x12, 0x00,   // LDA $0x0012,X    => 0x0021

            // absolute,Y
            0xA0, 0xF0,         // LDY #$F0
            0xB9, 0x10, 0x0F,   // LDA $0x0F10,Y    => 0x1000
            0xB9, 0x0F, 0xFF,   // LDA $0xFF0F,Y    => 0xFFFF
            0xB9, 0x31, 0xFF,   // LDA $0xFF31,Y    => 0x0021

            // indirect,X
            0xA1, 0xF0,         // LDA ($F0,X)  => 0xFF, second byte in 0x00 => 0x1234
            0xA1, 0x70,         // LDA ($70,X)  => 0x70 => 0x4321

            // indirect,Y
            0xB1, 0xFF,         // LDA ($FF),Y  => 0x1234+0xF0 => 0x1324
            0xB1, 0x7F,         // LDA ($7F),Y  => 0x4321+0xF0 => 0x4411
        ])
        w8(0x0002, 0x01); w8(0x0003, 0x00); w8(0x0080, 0x80); w8(0x00FF, 0x03);
        w8(0x1000, 0x12); w8(0xFFFF, 0x34); w8(0x0021, 0x56);
        w8(0x001F, 0xAA); w8(0x0007, 0x33); w8(0x0087, 0x22);
        copy(0x0200, prog)
        prefetch(0x0200);

        // immediate
        T(2, step()); T(R(A), 0x00); T(tf(Z));
        T(2, step()); T(R(A), 0x01); T(tf(0));
        T(2, step()); T(R(A), 0x00); T(tf(Z));
        T(2, step()); T(R(A), 0x80); T(tf(N));

        // zero page
        T(3, step()); T(R(A), 0x01); T(tf(0));
        T(3, step()); T(R(A), 0x00); T(tf(Z));
        T(3, step()); T(R(A), 0x80); T(tf(N));
        T(3, step()); T(R(A), 0x03); T(tf(0));

        // absolute
        T(4, step()); T(R(A), 0x12); T(tf(0));
        T(4, step()); T(R(A), 0x34); T(tf(0));
        T(4, step()); T(R(A), 0x56); T(tf(0));

        // zero page,X
        T(2, step()); T(R(X), 0x0F); T(tf(0));
        T(4, step()); T(R(A), 0xAA); T(tf(N));
        T(4, step()); T(R(A), 0x33); T(tf(0));
        T(4, step()); T(R(A), 0x22); T(tf(0));

        // absolute,X
        T(5, step()); T(R(A), 0x12); T(tf(0));
        T(4, step()); T(R(A), 0x34); T(tf(0));
        T(4, step()); T(R(A), 0x56); T(tf(0));

        // absolute,Y
        T(2, step()); T(R(Y), 0xF0); T(tf(N));
        T(5, step()); T(R(A), 0x12); T(tf(0));
        T(4, step()); T(R(A), 0x34); T(tf(0));
        T(5, step()); T(R(A), 0x56); T(tf(0));

        // indirect,X
        w8(0x00FF, 0x34); w8(0x0000, 0x12); w16(0x007F, 0x4321);
        w8(0x1234, 0x89); w8(0x4321, 0x8A);
        console.log(debugArray("P1", C64.RAMbank, 0x0200))
        T(6, step()); T(R(A), 0x89); T(tf(N));
        T(6, step()); T(R(A), 0x8A); T(tf(N));

        // indirect,Y (both 6 cycles because page boundary crossed)
        w8(0x1324, 0x98); w8(0x4411, 0xA8);
        T(6, step()); T(R(A), 0x98); T(tf(N));
        T(6, step()); T(R(A), 0xA8); T(tf(N));
    })

    /*
        it("LDX", () => {
            init()

            const prog = new Uint8Array([
                // immediate
                0xA2, 0x00,         // LDX #$00
                0xA2, 0x01,         // LDX #$01
                0xA2, 0x00,         // LDX #$00
                0xA2, 0x80,         // LDX #$80

                // zero page
                0xA6, 0x02,         // LDX $02
                0xA6, 0x03,         // LDX $03
                0xA6, 0x80,         // LDX $80
                0xA6, 0xFF,         // LDX $FF

                // absolute
                0xAE, 0x00, 0x10,   // LDX $1000
                0xAE, 0xFF, 0xFF,   // LDX $FFFF
                0xAE, 0x21, 0x00,   // LDX $0021

                // zero page,Y
                0xA0, 0x0F,         // LDY #$0F
                0xB6, 0x10,         // LDX $10,Y    => 0x1F
                0xB6, 0xF8,         // LDX $FE,Y    => 0x07
                0xB6, 0x78,         // LDX $78,Y    => 0x87

                // absolute,Y
                0xA0, 0xF0,         // LDY #$F0
                0xBE, 0x10, 0x0F,   // LDX $0F10,Y    => 0x1000
                0xBE, 0x0F, 0xFF,   // LDX $FF0F,Y    => 0xFFFF
                0xBE, 0x31, 0xFF,   // LDX $FF31,Y    => 0x0021
            ])
            w8(0x0002, 0x01); w8(0x0003, 0x00); w8(0x0080, 0x80); w8(0x00FF, 0x03);
            w8(0x1000, 0x12); w8(0xFFFF, 0x34); w8(0x0021, 0x56);
            w8(0x001F, 0xAA); w8(0x0007, 0x33); w8(0x0087, 0x22);
            copy(0x0200, prog);
            prefetch(0x0200);

            // immediate
            T(2, step()); T(R(X), 0x00); (tf(Z));
            T(2, step()); T(R(X), 0x01); (tf(0));
            T(2, step()); T(R(X), 0x00); (tf(Z));
            T(2, step()); T(R(X), 0x80); (tf(N));

            // zero page
            T(3, step()); T(R(X), 0x01); T(tf(0));
            T(3, step()); T(R(X), 0x00); T(tf(Z));
            T(3, step()); T(R(X), 0x80); T(tf(N));
            T(3, step()); T(R(X), 0x03); T(tf(0));

            // absolute
            T(4, step()); T(R(X), 0x12); T(tf(0));
            T(4, step()); T(R(X), 0x34); T(tf(0));
            T(4, step()); T(R(X), 0x56); T(tf(0));

            // zero page,Y
            T(2, step()); T(R(Y), 0x0F); T(tf(0));
            T(4, step()); T(R(X), 0xAA); T(tf(N));
            T(4, step()); T(R(X), 0x33); T(tf(0));
            T(4, step()); T(R(X), 0x22); T(tf(0));

            // absolute,X
            T(2, step()); T(R(Y), 0xF0); T(tf(N));
            T(5, step()); T(R(X), 0x12); T(tf(0));
            T(4, step()); T(R(X), 0x34); T(tf(0));
            T(5, step()); T(R(X), 0x56); T(tf(0));
        })

        it("LDY", () => {
            init()

            const prog = new Uint8Array([
                // immediate
                0xA0, 0x00,         // LDY #$00
                0xA0, 0x01,         // LDY #$01
                0xA0, 0x00,         // LDY #$00
                0xA0, 0x80,         // LDY #$80

                // zero page
                0xA4, 0x02,         // LDY $02
                0xA4, 0x03,         // LDY $03
                0xA4, 0x80,         // LDY $80
                0xA4, 0xFF,         // LDY $FF

                // absolute
                0xAC, 0x00, 0x10,   // LDY $1000
                0xAC, 0xFF, 0xFF,   // LDY $FFFF
                0xAC, 0x21, 0x00,   // LDY $0021

                // zero page,X
                0xA2, 0x0F,         // LDX #$0F
                0xB4, 0x10,         // LDY $10,X    => 0x1F
                0xB4, 0xF8,         // LDY $FE,X    => 0x07
                0xB4, 0x78,         // LDY $78,X    => 0x87

                // absolute,X
                0xA2, 0xF0,         // LDX #$F0
                0xBC, 0x10, 0x0F,   // LDY $0F10,X    => 0x1000
                0xBC, 0x0F, 0xFF,   // LDY $FF0F,X    => 0xFFFF
                0xBC, 0x31, 0xFF,   // LDY $FF31,X    => 0x0021
            ])
            w8(0x0002, 0x01); w8(0x0003, 0x00); w8(0x0080, 0x80); w8(0x00FF, 0x03);
            w8(0x1000, 0x12); w8(0xFFFF, 0x34); w8(0x0021, 0x56);
            w8(0x001F, 0xAA); w8(0x0007, 0x33); w8(0x0087, 0x22);
            copy(0x0200, prog);
            prefetch(0x0200);

            // immediate
            T(2, step()); T(R(Y), 0x00); T(tf(Z));
            T(2, step()); T(R(Y), 0x01); T(tf(0));
            T(2, step()); T(R(Y), 0x00); T(tf(Z));
            T(2, step()); T(R(Y), 0x80); T(tf(N));

            // zero page
            T(3, step()); T(R(Y), 0x01); T(tf(0));
            T(3, step()); T(R(Y), 0x00); T(tf(Z));
            T(3, step()); T(R(Y), 0x80); T(tf(N));
            T(3, step()); T(R(Y), 0x03); T(tf(0));

            // absolute
            T(4, step()); T(R(Y), 0x12); T(tf(0));
            T(4, step()); T(R(Y), 0x34); T(tf(0));
            T(4, step()); T(R(Y), 0x56); T(tf(0));

            // zero page,Y
            T(2, step()); T(R(X), 0x0F); T(tf(0));
            T(4, step()); T(R(Y), 0xAA); T(tf(N));
            T(4, step()); T(R(Y), 0x33); T(tf(0));
            T(4, step()); T(R(Y), 0x22); T(tf(0));

            // absolute,X
            T(2, step()); T(R(X), 0xF0); T(tf(N));
            T(5, step()); T(R(Y), 0x12); T(tf(0));
            T(4, step()); T(R(Y), 0x34); T(tf(0));
            T(5, step()); T(R(Y), 0x56); T(tf(0));
        })

        it("STA", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x23,             // LDA #$23
                0xA2, 0x10,             // LDX #$10
                0xA0, 0xC0,             // LDY #$C0
                0x85, 0x10,             // STA $10
                0x8D, 0x34, 0x12,       // STA $1234
                0x95, 0x10,             // STA $10,X
                0x9D, 0x00, 0x20,       // STA $2000,X
                0x99, 0x00, 0x20,       // STA $2000,Y
                0x81, 0x10,             // STA ($10,X)
                0x91, 0x20,             // STA ($20),Y
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(R(A), 0x23);
            T(2, step()); T(R(X), 0x10);
            T(2, step()); T(R(Y), 0xC0);
            T(3, step()); T(mem[0x0010], 0x23);
            T(4, step()); T(mem[0x1234], 0x23);
            T(4, step()); T(mem[0x0020], 0x23);
            T(5, step()); T(mem[0x2010], 0x23);
            T(5, step()); T(mem[0x20C0], 0x23);
            w16(0x0020, 0x4321);
            T(6, step()); T(mem[0x4321], 0x23);
            T(6, step()); T(mem[0x43E1], 0x23);
        })

        it("STX", () => {
            init()

            const prog = new Uint8Array([
                0xA2, 0x23,             // LDX #$23
                0xA0, 0x10,             // LDY #$10

                0x86, 0x10,             // STX $10
                0x8E, 0x34, 0x12,       // STX $1234
                0x96, 0x10,             // STX $10,Y
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(R(X), 0x23);
            T(2, step()); T(R(Y), 0x10);
            T(3, step()); T(mem[0x0010], 0x23);
            T(4, step()); T(mem[0x1234], 0x23);
            T(4, step()); T(mem[0x0020], 0x23);
        })

        it("STY", () => {
            init()

            const prog = new Uint8Array([
                0xA0, 0x23,             // LDY #$23
                0xA2, 0x10,             // LDX #$10

                0x84, 0x10,             // STX $10
                0x8C, 0x34, 0x12,       // STX $1234
                0x94, 0x10,             // STX $10,Y
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(R(Y), 0x23);
            T(2, step()); T(R(X), 0x10);
            T(3, step()); T(mem[0x0010], 0x23);
            T(4, step()); T(mem[0x1234], 0x23);
            T(4, step()); T(mem[0x0020], 0x23);
        })

        it("TAX/TXA", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x00,     // LDA #$00
                0xA2, 0x10,     // LDX #$10
                0xAA,           // TAX
                0xA9, 0xF0,     // LDA #$F0
                0x8A,           // TXA
                0xA9, 0xF0,     // LDA #$F0
                0xA2, 0x00,     // LDX #$00
                0xAA,           // TAX
                0xA9, 0x01,     // LDA #$01
                0x8A,           // TXA
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(R(A), 0x00); T(tf(Z));
            T(2, step()); T(R(X), 0x10); T(tf(0));
            T(2, step()); T(R(X), 0x00); T(tf(Z));
            T(2, step()); T(R(A), 0xF0); T(tf(N));
            T(2, step()); T(R(A), 0x00); T(tf(Z));
            T(2, step()); T(R(A), 0xF0); T(tf(N));
            T(2, step()); T(R(X), 0x00); T(tf(Z));
            T(2, step()); T(R(X), 0xF0); T(tf(N));
            T(2, step()); T(R(A), 0x01); T(tf(0));
            T(2, step()); T(R(A), 0xF0); T(tf(N));
        })

        it("TAY/TYA", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x00,     // LDA #$00
                0xA0, 0x10,     // LDY #$10
                0xA8,           // TAY
                0xA9, 0xF0,     // LDA #$F0
                0x98,           // TYA
                0xA9, 0xF0,     // LDA #$F0
                0xA0, 0x00,     // LDY #$00
                0xA8,           // TAY
                0xA9, 0x01,     // LDA #$01
                0x98,           // TYA
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(R(A), 0x00); T(tf(Z));
            T(2, step()); T(R(Y), 0x10); T(tf(0));
            T(2, step()); T(R(Y), 0x00); T(tf(Z));
            T(2, step()); T(R(A), 0xF0); T(tf(N));
            T(2, step()); T(R(A), 0x00); T(tf(Z));
            T(2, step()); T(R(A), 0xF0); T(tf(N));
            T(2, step()); T(R(Y), 0x00); T(tf(Z));
            T(2, step()); T(R(Y), 0xF0); T(tf(N));
            T(2, step()); T(R(A), 0x01); T(tf(0));
            T(2, step()); T(R(A), 0xF0); T(tf(N));
        })

        it("DEX/INX/DEY/INY", () => {
            init()

            const prog = new Uint8Array([
                0xA2, 0x01,     // LDX #$01
                0xCA,           // DEX
                0xCA,           // DEX
                0xE8,           // INX
                0xE8,           // INX
                0xA0, 0x01,     // LDY #$01
                0x88,           // DEY
                0x88,           // DEY
                0xC8,           // INY
                0xC8,           // INY
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(R(X), 0x01); T(tf(0));
            T(2, step()); T(R(X), 0x00); T(tf(Z));
            T(2, step()); T(R(X), 0xFF); T(tf(N));
            T(2, step()); T(R(X), 0x00); T(tf(Z));
            T(2, step()); T(R(X), 0x01); T(tf(0));
            T(2, step()); T(R(Y), 0x01); T(tf(0));
            T(2, step()); T(R(Y), 0x00); T(tf(Z));
            T(2, step()); T(R(Y), 0xFF); T(tf(N));
            T(2, step()); T(R(Y), 0x00); T(tf(Z));
            T(2, step()); T(R(Y), 0x01); T(tf(0));
        })

        it("TXS/TSX", () => {
            init()

            const prog = new Uint8Array([
                0xA2, 0xAA,     // LDX #$AA
                0xA9, 0x00,     // LDA #$00
                0x9A,           // TXS
                0xAA,           // TAX
                0xBA,           // TSX
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(R(X), 0xAA); T(tf(N));
            T(2, step()); T(R(A), 0x00); T(tf(Z));
            T(2, step()); T(R(S), 0xAA); T(tf(Z));
            T(2, step()); T(R(X), 0x00); T(tf(Z));
            T(2, step()); T(R(X), 0xAA); T(tf(N));
        })

        it("ORA", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x00,         // LDA #$00
                0xA2, 0x01,         // LDX #$01
                0xA0, 0x02,         // LDY #$02
                0x09, 0x00,         // ORA #$00
                0x05, 0x10,         // ORA $10
                0x15, 0x10,         // ORA $10,X
                0x0d, 0x00, 0x10,   // ORA $1000
                0x1d, 0x00, 0x10,   // ORA $1000,X
                0x19, 0x00, 0x10,   // ORA $1000,Y
                0x01, 0x22,         // ORA ($22,X)
                0x11, 0x20,         // ORA ($20),Y
            ])
            copy(0x0200, prog);
            w16(0x0020, 0x1002);
            w16(0x0023, 0x1003);
            w8(0x0010, (1 << 0));
            w8(0x0011, (1 << 1));
            w8(0x1000, (1 << 2));
            w8(0x1001, (1 << 3));
            w8(0x1002, (1 << 4));
            w8(0x1003, (1 << 5));
            w8(0x1004, (1 << 6));
            prefetch(0x0200);

            T(2, step()); T(R(A), 0x00); T(tf(Z));
            T(2, step()); T(R(X), 0x01); T(tf(0));
            T(2, step()); T(R(Y), 0x02); T(tf(0));
            T(2, step()); T(R(A), 0x00); T(tf(Z));
            T(3, step()); T(R(A), 0x01); T(tf(0));
            T(4, step()); T(R(A), 0x03); T(tf(0));
            T(4, step()); T(R(A), 0x07); T(tf(0));
            T(4, step()); T(R(A), 0x0F); T(tf(0));
            T(4, step()); T(R(A), 0x1F); T(tf(0));
            T(6, step()); T(R(A), 0x3F); T(tf(0));
            T(5, step()); T(R(A), 0x7F); T(tf(0));
        })

        it("AND", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0xFF,         // LDA #$FF
                0xA2, 0x01,         // LDX #$01
                0xA0, 0x02,         // LDY #$02
                0x29, 0xFF,         // AND #$FF
                0x25, 0x10,         // AND $10
                0x35, 0x10,         // AND $10,X
                0x2d, 0x00, 0x10,   // AND $1000
                0x3d, 0x00, 0x10,   // AND $1000,X
                0x39, 0x00, 0x10,   // AND $1000,Y
                0x21, 0x22,         // AND ($22,X)
                0x31, 0x20,         // AND ($20),Y
            ])
            copy(0x0200, prog);
            w16(0x0020, 0x1002);
            w16(0x0023, 0x1003);
            w8(0x0010, 0x7F);
            w8(0x0011, 0x3F);
            w8(0x1000, 0x1F);
            w8(0x1001, 0x0F);
            w8(0x1002, 0x07);
            w8(0x1003, 0x03);
            w8(0x1004, 0x01);
            prefetch(0x0200);

            T(2, step()); T(R(A), 0xFF); T(tf(N));
            T(2, step()); T(R(X), 0x01); T(tf(0));
            T(2, step()); T(R(Y), 0x02); T(tf(0));
            T(2, step()); T(R(A), 0xFF); T(tf(N));
            T(3, step()); T(R(A), 0x7F); T(tf(0));
            T(4, step()); T(R(A), 0x3F); T(tf(0));
            T(4, step()); T(R(A), 0x1F); T(tf(0));
            T(4, step()); T(R(A), 0x0F); T(tf(0));
            T(4, step()); T(R(A), 0x07); T(tf(0));
            T(6, step()); T(R(A), 0x03); T(tf(0));
            T(5, step()); T(R(A), 0x01); T(tf(0));
        })

        it("EOR", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0xFF,         // LDA #$FF
                0xA2, 0x01,         // LDX #$01
                0xA0, 0x02,         // LDY #$02
                0x49, 0xFF,         // EOR #$FF
                0x45, 0x10,         // EOR $10
                0x55, 0x10,         // EOR $10,X
                0x4d, 0x00, 0x10,   // EOR $1000
                0x5d, 0x00, 0x10,   // EOR $1000,X
                0x59, 0x00, 0x10,   // EOR $1000,Y
                0x41, 0x22,         // EOR ($22,X)
                0x51, 0x20,         // EOR ($20),Y
            ])
            copy(0x0200, prog);
            w16(0x0020, 0x1002);
            w16(0x0023, 0x1003);
            w8(0x0010, 0x7F);
            w8(0x0011, 0x3F);
            w8(0x1000, 0x1F);
            w8(0x1001, 0x0F);
            w8(0x1002, 0x07);
            w8(0x1003, 0x03);
            w8(0x1004, 0x01);
            prefetch(0x0200);

            T(2, step()); T(R(A), 0xFF); T(tf(N));
            T(2, step()); T(R(X), 0x01); T(tf(0));
            T(2, step()); T(R(Y), 0x02); T(tf(0));
            T(2, step()); T(R(A), 0x00); T(tf(Z));
            T(3, step()); T(R(A), 0x7F); T(tf(0));
            T(4, step()); T(R(A), 0x40); T(tf(0));
            T(4, step()); T(R(A), 0x5F); T(tf(0));
            T(4, step()); T(R(A), 0x50); T(tf(0));
            T(4, step()); T(R(A), 0x57); T(tf(0));
            T(6, step()); T(R(A), 0x54); T(tf(0));
            T(5, step()); T(R(A), 0x55); T(tf(0));
        })

        it("NOP", () => {
            init()

            const prog = new Uint8Array([
                0xEA,       // NOP
            ])
            copy(0x0200, prog);
            prefetch(0x0200);
            T(2, step());
        })

        it("PHA/PLA/PHP/PLP", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x23,     // LDA #$23
                0x48,           // PHA
                0xA9, 0x32,     // LDA #$32
                0x68,           // PLA
                0x08,           // PHP
                0xA9, 0x00,     // LDA #$00
                0x28,           // PLP
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(R(A), 0x23); T(R(S), 0xBD);
            T(3, step()); T(R(S), 0xBC); T(mem[0x01BD], 0x23);
            T(2, step()); T(R(A), 0x32);
            T(4, step()); T(R(A), 0x23); T(R(S), 0xBD); T(tf(0));
            T(3, step()); T(R(S), 0xBC); T(mem[0x01BD], (U | B | I));
            T(2, step()); T(tf(Z));
            T(4, step()); T(R(S), 0xBD); T(tf(0));
        })

        it("CLC/SEC/CLI/SEI/CLV/CLD/SED", () => {
            init()

            const prog = new Uint8Array([
                0xB8,       // CLV
                0x78,       // SEI
                0x58,       // CLI
                0x38,       // SEC
                0x18,       // CLC
                0xF8,       // SED
                0xD8,       // CLD
            ])
            copy(0x0200, prog);
            // R(P) |= V;
            prefetch(0x0200);

            T(2, step()); T(tf(Z));
            T(2, step()); //T(tf(Z | I));   // FIXME: interrupt bit is ignored in tf()
            T(2, step()); T(tf(Z));
            T(2, step()); T(tf(Z | C));
            T(2, step()); T(tf(Z));
            T(2, step()); T(tf(Z | D));
            T(2, step()); T(tf(Z));
        })

        it("INC/DEC", () => {
            init()

            const prog = new Uint8Array([
                0xA2, 0x10,         // LDX #$10
                0xE6, 0x33,         // INC $33
                0xF6, 0x33,         // INC $33,X
                0xEE, 0x00, 0x10,   // INC $1000
                0xFE, 0x00, 0x10,   // INC $1000,X
                0xC6, 0x33,         // DEC $33
                0xD6, 0x33,         // DEC $33,X
                0xCE, 0x00, 0x10,   // DEC $1000
                0xDE, 0x00, 0x10,   // DEC $1000,X
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(0x10, R(X));
            T(5, step()); T(0x01, mem[0x0033]); T(tf(0));
            T(6, step()); T(0x01, mem[0x0043]); T(tf(0));
            T(6, step()); T(0x01, mem[0x1000]); T(tf(0));
            T(7, step()); T(0x01, mem[0x1010]); T(tf(0));
            T(5, step()); T(0x00, mem[0x0033]); T(tf(Z));
            T(6, step()); T(0x00, mem[0x0043]); T(tf(Z));
            T(6, step()); T(0x00, mem[0x1000]); T(tf(Z));
            T(7, step()); T(0x00, mem[0x1010]); T(tf(Z));
        })

        it("ADC/SBC", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x01,         // LDA #$01
                0x85, 0x10,         // STA $10
                0x8D, 0x00, 0x10,   // STA $1000
                0xA9, 0xFC,         // LDA #$FC
                0xA2, 0x08,         // LDX #$08
                0xA0, 0x04,         // LDY #$04
                0x18,               // CLC
                0x69, 0x01,         // ADC #$01
                0x65, 0x10,         // ADC $10
                0x75, 0x08,         // ADC $8,X
                0x6D, 0x00, 0x10,   // ADC $1000
                0x7D, 0xF8, 0x0F,   // ADC $0FF8,X
                0x79, 0xFC, 0x0F,   // ADC $0FFC,Y
                // FIXME: ADC (zp,X) and ADC (zp),X
                0xF9, 0xFC, 0x0F,   // SBC $0FFC,Y
                0xFD, 0xF8, 0x0F,   // SBC $0FF8,X
                0xED, 0x00, 0x10,   // SBC $1000
                0xF5, 0x08,         // SBC $8,X
                0xE5, 0x10,         // SBC $10
                0xE9, 0x01,         // SBC #$10
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(0x01, R(A));
            T(3, step()); T(0x01, mem[0x0010]);
            T(4, step()); T(0x01, mem[0x1000]);
            T(2, step()); T(0xFC, R(A));
            T(2, step()); T(0x08, R(X));
            T(2, step()); T(0x04, R(Y));
            T(2, step());  // CLC
            // ADC
            T(2, step()); T(0xFD, R(A)); T(tf(N));
            T(3, step()); T(0xFE, R(A)); T(tf(N));
            T(4, step()); T(0xFF, R(A)); T(tf(N));
            T(4, step()); T(0x00, R(A)); T(tf(Z | C));
            T(5, step()); T(0x02, R(A)); T(tf(0));
            T(5, step()); T(0x03, R(A)); T(tf(0));
            // SBC
            T(5, step()); T(0x01, R(A)); T(tf(C));
            T(5, step()); T(0x00, R(A)); T(tf(Z | C));
            T(4, step()); T(0xFF, R(A)); T(tf(N));
            T(4, step()); T(0xFD, R(A)); T(tf(N | C));
            T(3, step()); T(0xFC, R(A)); T(tf(N | C));
            T(2, step()); T(0xFB, R(A)); T(tf(N | C));
        })

        it("CMP/CPX/CPY", () => {
            init()

            // FIXME: non-immediate addressing modes
            const prog = new Uint8Array([
                0xA9, 0x01,     // LDA #$01
                0xA2, 0x02,     // LDX #$02
                0xA0, 0x03,     // LDY #$03
                0xC9, 0x00,     // CMP #$00
                0xC9, 0x01,     // CMP #$01
                0xC9, 0x02,     // CMP #$02
                0xE0, 0x01,     // CPX #$01
                0xE0, 0x02,     // CPX #$02
                0xE0, 0x03,     // CPX #$03
                0xC0, 0x02,     // CPY #$02
                0xC0, 0x02,     // CPY #$03
                0xC0, 0x03,     // CPY #$04
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(0x01, R(A));
            T(2, step()); T(0x02, R(X));
            T(2, step()); T(0x03, R(Y));
            T(2, step()); T(tf(C));
            T(2, step()); T(tf(Z | C));
            T(2, step()); T(tf(N));
            T(2, step()); T(tf(C));
            T(2, step()); T(tf(Z | C));
            T(2, step()); T(tf(N));
        })

        it("ASL", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x81,     // LDA #$81
                0xA2, 0x01,     // LDX #$01
                0x85, 0x10,     // STA $10
                0x06, 0x10,     // ASL $10
                0x16, 0x0F,     // ASL $0F,X
                0x0A,           // ASL
                0x0A,           // ASL
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(0x81, R(A));
            T(2, step()); T(0x01, R(X));
            T(3, step()); T(0x81, mem[0x0010]);
            T(5, step()); T(0x02, mem[0x0010]); T(tf(C));
            T(6, step()); T(0x04, mem[0x0010]); T(tf(0));
            T(2, step()); T(0x02, R(A)); T(tf(C));
            T(2, step()); T(0x04, R(A)); T(tf(0));
        })

        it("LSR", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x81,     // LDA #$81
                0xA2, 0x01,     // LDX #$01
                0x85, 0x10,     // STA $10
                0x46, 0x10,     // LSR $10
                0x56, 0x0F,     // LSR $0F,X
                0x4A,           // LSR
                0x4A,           // LSR
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(0x81, R(A));
            T(2, step()); T(0x01, R(X));
            T(3, step()); T(0x81, mem[0x0010]);
            T(5, step()); T(0x40, mem[0x0010]); T(tf(C));
            T(6, step()); T(0x20, mem[0x0010]); T(tf(0));
            T(2, step()); T(0x40, R(A)); T(tf(C));
            T(2, step()); T(0x20, R(A)); T(tf(0));
        })

        it("ROR/ROL", () => {
            init()

            // FIXME: more adressing modes
            const prog = new Uint8Array([
                0xA9, 0x81,     // LDA #$81
                0xA2, 0x01,     // LDX #$01
                0x85, 0x10,     // STA $10
                0x26, 0x10,     // ROL $10
                0x36, 0x0F,     // ROL $0F,X
                0x76, 0x0F,     // ROR $0F,X
                0x66, 0x10,     // ROR $10
                0x6A,           // ROR
                0x6A,           // ROR
                0x2A,           // ROL
                0x2A,           // ROL
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(0x81, R(A));
            T(2, step()); T(0x01, R(X));
            T(3, step()); T(0x81, mem[0x0010]);
            T(5, step()); T(0x02, mem[0x0010]); T(tf(C));
            T(6, step()); T(0x05, mem[0x0010]); T(tf(0));
            T(6, step()); T(0x02, mem[0x0010]); T(tf(C));
            T(5, step()); T(0x81, mem[0x0010]); T(tf(N));
            T(2, step()); T(0x40, R(A)); T(tf(C));
            T(2, step()); T(0xA0, R(A)); T(tf(N));
            T(2, step()); T(0x40, R(A)); T(tf(C));
            T(2, step()); T(0x81, R(A)); T(tf(N));
        })

        it("BIT", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x00,         // LDA #$00
                0x85, 0x1F,         // STA $1F
                0xA9, 0x80,         // LDA #$80
                0x85, 0x20,         // STA $20
                0xA9, 0xC0,         // LDA #$C0
                0x8D, 0x00, 0x10,   // STA $1000
                0x24, 0x1F,         // BIT $1F
                0x24, 0x20,         // BIT $20
                0x2C, 0x00, 0x10    // BIT $1000
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(0x00, R(A));
            T(3, step()); T(0x00, mem[0x001F]);
            T(2, step()); T(0x80, R(A));
            T(3, step()); T(0x80, mem[0x0020]);
            T(2, step()); T(0xC0, R(A));
            T(4, step()); T(0xC0, mem[0x1000]);
            T(3, step()); T(tf(Z));
            T(3, step()); T(tf(N));
            T(4, step()); T(tf(N | V));
        })

        it("BNE/BEQ", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x10,         // LDA #$10
                0xC9, 0x10,         // CMP #$10
                0xF0, 0x02,         // BEQ eq
                0xA9, 0x0F,         // ne: LDA #$0F
                0xC9, 0x0F,         // eq: CMP #$0F
                0xD0, 0xFA,         // BNE ne -> executed 2x, second time not taken
                0xEA,
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(0x10, R(A));
            T(2, step()); T(tf(Z | C));
            T(3, step()); T(R(PC), 0x0208);
            T(2, step()); T(tf(C));
            T(3, step()); T(R(PC), 0x0206);
            T(2, step()); T(0x0F, R(A));
            T(2, step()); T(tf(Z | C));
            T(2, step()); T(R(PC), 0x020C);

            // patch jump target, and test jumping across 256 bytes page
            prefetch(0x0200);
            w8(0x0205, 0xC0);
            T(2, step()); T(0x10, R(A));
            T(2, step()); T(tf(Z | C));
            T(4, step()); T(R(PC), 0x01C6);

            // FIXME: test the other branches
        })

        it("JMP", () => {
            init()

            const prog = new Uint8Array([
                0x4C, 0x00, 0x10,   // JMP $1000
            ])
            copy(0x0200, prog);
            prefetch(0x0200);
            T(3, step()); T(R(PC), 0x1000);
        })

        it("JMP indirect samepage", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x33,         // LDA #$33
                0x8D, 0x10, 0x21,   // STA $2110
                0xA9, 0x22,         // LDA #$22
                0x8D, 0x11, 0x21,   // STA $2111
                0x6C, 0x10, 0x21,   // JMP ($2110)
            ])
            copy(0x0200, prog);
            prefetch(0x0200);
            T(2, step()); T(R(A), 0x33);
            T(4, step()); T(mem[0x2110], 0x33);
            T(2, step()); T(R(A), 0x22);
            T(4, step()); T(mem[0x2111], 0x22);
            T(5, step()); T(R(PC), 0x2233);
        })

        it("JMP indirect wrap", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x33,         // LDA #$33
                0x8D, 0xFF, 0x21,   // STA $21FF
                0xA9, 0x22,         // LDA #$22
                0x8D, 0x00, 0x21,   // STA $2100    // note: wraps around!
                0x6C, 0xFF, 0x21,   // JMP ($21FF)
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(2, step()); T(R(A), 0x33);
            T(4, step()); T(mem[0x21FF], 0x33);
            T(2, step()); T(R(A), 0x22);
            T(4, step()); T(mem[0x2100], 0x22);
            T(5, step()); T(R(PC), 0x2233);
        })

        it("JSR/RTS", () => {
            init()

            const prog = new Uint8Array([
                0x20, 0x05, 0x03,   // JSR fun
                0xEA, 0xEA,         // NOP, NOP
                0xEA,               // fun: NOP
                0x60,               // RTS
            ])
            copy(0x0200, prog);
            prefetch(0x0300);

            T(R(S), 0xBD);
            T(6, step()); T(R(PC), 0x0305); T(R(S), 0xBB); T(r16(0x01BC), 0x0302);
            T(2, step());
            T(6, step()); T(R(PC), 0x0303); T(R(S), 0xBD);
        })

        it("RTI", () => {
            init()

            const prog = new Uint8Array([
                0xA9, 0x11,     // LDA #$11
                0x48,           // PHA
                0xA9, 0x22,     // LDA #$22
                0x48,           // PHA
                0xA9, 0x33,     // LDA #$33
                0x48,           // PHA
                0x40,           // RTI
            ])
            copy(0x0200, prog);
            prefetch(0x0200);

            T(R(S), 0xBD);
            T(2, step()); T(R(A), 0x11);
            T(3, step()); T(R(S), 0xBC);
            T(2, step()); T(R(A), 0x22);
            T(3, step()); T(R(S), 0xBB);
            T(2, step()); T(R(A), 0x33);
            T(3, step()); T(R(S), 0xBA);
            T(6, step()); T(R(S), 0xBD); T(R(PC), 0x1122); T(tf(Z | C));
        })
*/
})
