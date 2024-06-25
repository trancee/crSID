import { B, C, D, I, N, NO_FLAGS, _, V, Z, CPU } from "../../src/CPU"

export const prepareTest = (cpu: CPU, input: any) => {
    if ("A" in input) cpu.A = input.A
    if ("X" in input) cpu.X = input.X
    if ("Y" in input) cpu.Y = input.Y

    if ("flags" in input) {
        cpu.P = input.flags

        if (input.flags > NO_FLAGS) cpu.P |= input.flags
        if (input.flags < NO_FLAGS) cpu.P &= input.flags
    }
}

export const compareTest = (cpu: CPU, output: any) => {
    if ("A" in output) expect(cpu.A).toEqual(output.A)
    if ("X" in output) expect(cpu.X).toEqual(output.X)
    if ("Y" in output) expect(cpu.Y).toEqual(output.Y)

    const P = cpu.P
    const f = output.flags

    expect(P & N).toEqual((f || NO_FLAGS) & N)
    expect(P & V).toEqual((f || NO_FLAGS) & V)
    expect(P & _).toEqual((f || NO_FLAGS) & _)
    expect(P & B).toEqual((f || NO_FLAGS) & B)
    expect(P & D).toEqual((f || NO_FLAGS) & D)
    expect(P & I).toEqual((f || NO_FLAGS) & I)
    expect(P & Z).toEqual((f || NO_FLAGS) & Z)
    expect(P & C).toEqual((f || NO_FLAGS) & C)
}