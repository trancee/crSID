const _BIT0_SR_CARRY = 1 << 0
const _BIT1_SR_ZERO = 1 << 1
const _BIT3_SR_DECIMAL = 1 << 3
const _BIT6_SR_OVERFLOW = 1 << 6
const _BIT7_SR_NEGATIVE = 1 << 7

const adc = (_AC, _memTemp, _SR) => {
    console.log(`A:${_AC.toString(16)} v:${_memTemp.toString(16)} C:${_SR & _BIT0_SR_CARRY} V:${(_SR & _BIT6_SR_OVERFLOW) >> 6} N:${(_SR & _BIT7_SR_NEGATIVE) >> 7} Z:${(_SR & _BIT1_SR_ZERO) >> 1}`)
    let _TR = _AC + _memTemp + (_SR & _BIT0_SR_CARRY);
    if ((_SR & _BIT3_SR_DECIMAL) == 1) {
        if (((_AC ^ _memTemp ^ _TR) & 0x10) == 0x10) {
            _TR += 0x06;
        }
        if ((_TR & 0xf0) > 0x90) {
            _TR += 0x60;
        }
    }
    _SR |= ((_AC ^ _TR) & (_memTemp ^ _TR) & 0x80) === 0x80 ? _BIT6_SR_OVERFLOW : 0;
    _SR |= (_TR & 0x100) == 0x100 ? 1 : 0;
    _SR |= _TR == 0 ? _BIT1_SR_ZERO : 0;
    _SR |= _TR & _BIT7_SR_NEGATIVE;

    _AC = _TR & 0xff;
    console.log(`A:${_AC.toString(16)} v:${_memTemp.toString(16)} C:${_SR & _BIT0_SR_CARRY} V:${(_SR & _BIT6_SR_OVERFLOW) >> 6} N:${(_SR & _BIT7_SR_NEGATIVE) >> 7} Z:${(_SR & _BIT1_SR_ZERO) >> 1}`)
    console.log()
}

adc(0x00, 0x00, 0x00)
adc(0x00, 0x00, _BIT0_SR_CARRY)
adc(0x01, 0xFE, 0x00)
adc(0x02, 0xFF, 0x00)
adc(0x01, 0xFF, 0x00) // C
adc(0x7F, 0x01, 0x00) // N|V
adc(0x80, 0xFF, 0x00) // V|C
