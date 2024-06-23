// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators
// https://stackoverflow.com/questions/1436438/how-do-you-set-clear-and-toggle-a-single-bit-in-javascript

export class UnsignedChar extends Uint8Array {
    Ptr(offset: number = 0, length?: number): UnsignedChar {
        const start = offset * this.BYTES_PER_ELEMENT
        const end = start + (length ?? this.length)
        return this.subarray(start, end) as UnsignedChar
        // console.log("UnsignedChar::Ptr", offset, length, this.length, this.BYTES_PER_ELEMENT)
        // return new UnsignedChar(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class Char extends Int8Array {
    Ptr(offset: number = 0, length?: number): Char {
        // const start = offset * this.BYTES_PER_ELEMENT
        // const end = start + (length || this.length)
        // return this.subarray(start, end) as Char
        return new Char(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class UnsignedShort extends Uint16Array {
    Ptr(offset: number = 0, length?: number): UnsignedShort {
        // const start = offset * this.BYTES_PER_ELEMENT
        // const end = start + (length || this.length)
        // return this.subarray(start, end) as UnsignedShort
        return new UnsignedShort(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class Short extends Int16Array {
    Ptr(offset: number = 0, length?: number): Short {
        // const start = offset * this.BYTES_PER_ELEMENT
        // const end = start + (length || this.length)
        // return this.subarray(start, end) as Short
        return new Short(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class UnsignedInt extends Uint32Array {
    Ptr(offset: number = 0, length?: number): UnsignedInt {
        // const start = offset * this.BYTES_PER_ELEMENT
        // const end = start + (length || this.length)
        // return this.subarray(start, end) as UnsignedInt
        return new UnsignedInt(this.buffer, offset * this.BYTES_PER_ELEMENT, length)
    }
}
export class Int extends Int32Array {
    Ptr(offset: number = 0, length?: number): Int {
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

const cols = 0x20

export const debugArray = (name: string, array: Uint8Array | Int16Array | Int32Array | Int | UnsignedShort, length?: number, offset?: number): string => {
    const b = array.subarray(offset, (offset || 0) + (length || array.length))
    console.log(`b:${b.length} r:${b.length % cols}`)
    let _ = ``
    let s = `    ${Dim}${Underscore}`
    for (let c = 0; c < cols; c++) {
        s += `${c.toString(16).padStart(2, "0")} `
    }
    _ += s
    for (let r = 0; r < b.length / cols; r++) {
        let s = `${Reset}\n${Dim}${(r * cols).toString(16).padStart(3, "0")}|${Reset}${BgBlack}`
        for (let c = 0; c < cols; c++) {
            const v = b[c + r * cols]
            if (v === 0) s += `${FgGray}`
            else s += `${FgWhite}`
            s += `${v.toString(16).padStart(2, "0")} `
        }
        _ += s + `${Reset}`
    }
    return _
    return `${Dim}${name}(${length || array.length})${Reset}\t[ ${FgYellow}${[...array.subarray(offset, (offset || 0) + (length || array.length))]
        .map((x, i) => `${i.toString(16).padStart(2, "0")}|` + x.toString(16).padStart(2, "0"))
        .join(" ")
        .replaceAll("00", `  `)
        .toUpperCase()}${Reset} ]`
    // return `${name}(${length || array.length})\t[ ${array.subarray(offset, (offset || 0) + (length || array.length)).join(", ")} ]`
    // return `${Dim}${name}(${length || array.length})${Reset}\t[ ${FgYellow}${array.subarray(offset, (offset || 0) + (length || array.length)).join(", ")}${Reset} ]`
}
