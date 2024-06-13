declare global {
    interface Number {
        _toString: Function;
    }
}

Number.prototype._toString = Number.prototype.toString;
Number.prototype.toString = function (radix?: number | undefined): string {
    return `${this._toString.call(this, radix).toUpperCase()}`
}

export class UnsignedChar extends Uint8Array {
    Ptr(offset: number, length?: number): UnsignedChar {
        const start = offset * this.BYTES_PER_ELEMENT
        const end = start + (length || this.length)
        return this.subarray(start, end) as UnsignedChar
        // console.log("UnsignedChar::Ptr", offset, length, this.length, this.BYTES_PER_ELEMENT)
        // return new UnsignedChar(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class Char extends Int8Array {
    Ptr(offset: number, length?: number): Char {
        // const start = offset * this.BYTES_PER_ELEMENT
        // const end = start + (length || this.length)
        // return this.subarray(start, end) as Char
        return new Char(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class UnsignedShort extends Uint16Array {
    Ptr(offset: number, length?: number): UnsignedShort {
        // const start = offset * this.BYTES_PER_ELEMENT
        // const end = start + (length || this.length)
        // return this.subarray(start, end) as UnsignedShort
        return new UnsignedShort(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class Short extends Int16Array {
    Ptr(offset: number, length?: number): Short {
        // const start = offset * this.BYTES_PER_ELEMENT
        // const end = start + (length || this.length)
        // return this.subarray(start, end) as Short
        return new Short(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class UnsignedInt extends Uint32Array {
    Ptr(offset: number, length?: number): UnsignedInt {
        // const start = offset * this.BYTES_PER_ELEMENT
        // const end = start + (length || this.length)
        // return this.subarray(start, end) as UnsignedInt
        return new UnsignedInt(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class Int extends Int32Array {
    Ptr(offset: number, length?: number): Int {
        // const start = offset * this.BYTES_PER_ELEMENT
        // const end = start + (length || this.length)
        // return this.subarray(start, end) as Int
        return new Int(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}

const Reset = "\x1b[0m"
const Bright = "\x1b[1m"
const Dim = "\x1b[2m"
const Underscore = "\x1b[4m"
const Blink = "\x1b[5m"
const Reverse = "\x1b[7m"
const Hidden = "\x1b[8m"

const FgBlack = "\x1b[30m"
const FgRed = "\x1b[31m"
const FgGreen = "\x1b[32m"
const FgYellow = "\x1b[33m"
const FgBlue = "\x1b[34m"
const FgMagenta = "\x1b[35m"
const FgCyan = "\x1b[36m"
const FgWhite = "\x1b[37m"
const FgGray = "\x1b[90m"

const BgBlack = "\x1b[40m"
const BgRed = "\x1b[41m"
const BgGreen = "\x1b[42m"
const BgYellow = "\x1b[43m"
const BgBlue = "\x1b[44m"
const BgMagenta = "\x1b[45m"
const BgCyan = "\x1b[46m"
const BgWhite = "\x1b[47m"
const BgGray = "\x1b[100m"

export const debugArray = (name: string, array: Uint8Array | Int16Array | Int32Array | Int | UnsignedShort, length?: number): string => {
    return `${name}(${length || array.length})\t[ ${array.subarray(0, length || array.length).join(", ")} ]`
    // return `${Dim}${name}(${length || array.length})${Reset}\t[ ${FgYellow}${array.subarray(0, length || array.length).join(", ")}${Reset} ]`
}
