const adc = (pins, regs) => {
    console.log(pins, regs)

    let o;
    let i = pins.D;
    o = i + regs.A + regs.P.C;
    regs.P.V = ((~(regs.A ^ i)) & (regs.A ^ o) & 0x80) >>> 7;
    regs.P.C = +(o > 0xFF);
    regs.A = o & 0xFF;
    regs.P.Z = +((regs.A) === 0);
    regs.P.N = ((regs.A) & 0x80) >>> 7;
    // Following is auto-generated code for instruction finish
    pins.Addr = regs.PC;
    regs.PC = (regs.PC + 1) & 0xFFFF;

    console.log(pins, regs)
    console.log()
}

adc({ Addr: 0x0000, D: 0x00 }, { A: 0x00, P: { C: 0x00, V: 0x00, Z: 0x00, N: 0x00 }, PC: 0x0000 })
adc({ Addr: 0x0000, D: 0x00 }, { A: 0x00, P: { C: 0x01, V: 0x00, Z: 0x00, N: 0x00 }, PC: 0x0000 })
adc({ Addr: 0x0000, D: 0xFE }, { A: 0x01, P: { C: 0x00, V: 0x00, Z: 0x00, N: 0x00 }, PC: 0x0000 })
