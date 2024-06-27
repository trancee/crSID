// https://github.com/bleroy/6502/blob/main/libs/6502.js#L453

const CARRY = 1 << 0
const ZERO = 1 << 1
const DECIMAL = 1 << 3
const OVERFLOW = 1 << 6
const NEGATIVE = 1 << 7

const adc = (cpu, operand) => {
    console.log(`A:${cpu.A.toString(16)} v:${operand.toString(16)} C:${Number(cpu.C)} V:${Number(cpu.V)} N:${Number(cpu.N)} Z:${Number(cpu.Z)}`)

    const oldA = cpu.A;
    let sum = oldA + operand + (cpu.C ? 1 : 0);
    // console.log(`ADC: A=${oldA}, sum=${sum}`);
    if (cpu.D) {
        if (((oldA & 0xF) + (operand & 0xF) + (cpu.C ? 1 : 0)) > 9) {
            sum += 6;
        }
        if (sum > 0x99) sum += 0x60;
        cpu.N = false;
        cpu.V = false;
        cpu.C = sum > 0x99;
    }
    else {
        cpu.N = (sum & 0x80) != 0;
        cpu.V = !((oldA ^ operand) & 0x80) && ((oldA ^ sum) & 0x80);
        cpu.C = sum > 0xFF;
    }
    sum &= 0xFF;
    cpu.Z = sum == 0;
    cpu.A = sum;

    console.log(`A:${cpu.A.toString(16)} v:${operand.toString(16)} C:${Number(cpu.C)} V:${Number(cpu.V)} N:${Number(cpu.N)} Z:${Number(cpu.Z)}`)
    console.log()
}

adc({ A: 0x00 }, 0x00) // Z
adc({ A: 0x00, C: true }, 0x00) // C
adc({ A: 0x01 }, 0xFE) // N
adc({ A: 0x02 }, 0xFF) // C
adc({ A: 0x01 }, 0xFF) // Z|C
adc({ A: 0x7F }, 0x01) // N|V
adc({ A: 0x80 }, 0xFF) // V|C
