#include <fmt/core.h>
#include <iostream>
using namespace std;

#define uint8_t unsigned char
#define uint16_t unsigned short

namespace CPU::MOS6502Esque
{
    /*
    The list of registers that can be accessed via @c value_of(Register) and @c set_value_of(Register, value).
    */
    enum Register
    {
        LastOperationAddress,
        ProgramCounter,
        StackPointer,
        Flags,
        A,
        X,
        Y,

        // These exist on a 65816 only.
        EmulationFlag,
        DataBank,
        ProgramBank,
        Direct
    };

    /*
        Flags as defined on the 6502; can be used to decode the result of @c value_of(Flags) or to form a value for
        the corresponding set.
    */
    enum Flag : uint8_t
    {
        Sign = 0x80,
        Overflow = 0x40,
        Always = 0x20,
        Break = 0x10,
        Decimal = 0x08,
        Interrupt = 0x04,
        Zero = 0x02,
        Carry = 0x01,

        // These are available on a 65816 only.
        MemorySize = 0x20,
        IndexSize = 0x10,
    };

    struct LazyFlags
    {
        /// Bit 7 is set if the negative flag is set; otherwise it is clear.
        uint8_t negative_result = 0;

        /// Non-zero if the zero flag is clear, zero if it is set.
        uint8_t zero_result = 0;

        /// Contains Flag::Carry.
        uint8_t carry = 0;

        /// Contains Flag::Decimal.
        uint8_t decimal = 0;

        /// Contains Flag::Overflow.
        uint8_t overflow = 0;

        /// Contains Flag::Interrupt, complemented.
        uint8_t inverse_interrupt = 0;

        /// Sets N and Z flags per the 8-bit value @c value.
        void set_nz(uint8_t value)
        {
            zero_result = negative_result = value;
        }

        /// Sets N and Z flags per the 8- or 16-bit value @c value; @c shift should be 0 to indicate an 8-bit value or 8 to indicate a 16-bit value.
        void set_nz(uint16_t value, int shift)
        {
            // negative_result = uint8_t(value >> shift);
            // zero_result = uint8_t(value | (value >> shift));
        }

        /// Sets the Z flag per the 8- or 16-bit value @c value; @c shift should be 0 to indicate an 8-bit value or 8 to indicate a 16-bit value.
        void set_z(uint16_t value, int shift)
        {
            // zero_result = uint8_t(value | (value >> shift));
        }

        /// Sets the N flag per the 8- or 16-bit value @c value; @c shift should be 0 to indicate an 8-bit value or 8 to indicate a 16-bit value.
        void set_n(uint16_t value, int shift)
        {
            // negative_result = uint8_t(value >> shift);
        }

        void set(uint8_t flags)
        {
            carry = flags & Flag::Carry;
            negative_result = flags & Flag::Sign;
            zero_result = (~flags) & Flag::Zero;
            overflow = flags & Flag::Overflow;
            inverse_interrupt = (~flags) & Flag::Interrupt;
            decimal = flags & Flag::Decimal;
        }

        uint8_t get() const
        {
            return carry | overflow | (inverse_interrupt ^ Flag::Interrupt) | (negative_result & 0x80) | (zero_result ? 0 : Flag::Zero) | Flag::Always | Flag::Break | decimal;
        }

        LazyFlags()
        {
            // Only the interrupt flag is defined upon reset but get_flags isn't going to
            // mask the other flags so we need to do that, at least.
            carry &= Flag::Carry;
            decimal &= Flag::Decimal;
            overflow &= Flag::Overflow;
        }
    };
}

namespace CPU::MOS6502
{
    using Register = CPU::MOS6502Esque::Register;
    using Flag = CPU::MOS6502Esque::Flag;
}

namespace Numeric
{

    /// @returns @c true if from @c bit there was:
    /// 	• carry after calculating @c lhs + @c rhs if @c is_add is true; or
    /// 	• borrow after calculating @c lhs - @c rhs if @c is_add is false;
    /// producing @c result.
    template <bool is_add, int bit, typename IntT>
    bool carried_out(IntT lhs, IntT rhs, IntT result)
    {
        // Additive:
        //
        // 0 and 0 => didn't.
        // 0 and 1 or 1 and 0 => did if 0.
        // 1 and 1 => did.
        //
        // Subtractive:
        //
        // 1 and 0 => didn't
        // 1 and 1 or 0 and 0 => did if 1.
        // 0 and 1 => did.
        if constexpr (!is_add)
        {
            rhs = ~rhs;
        }
        const bool carry = IntT(1 << bit) & (lhs | rhs) & ((lhs & rhs) | ~result);
        if constexpr (!is_add)
        {
            return !carry;
        }
        else
        {
            return carry;
        }
    }

    /// @returns @c true if there was carry into @c bit when computing either:
    /// 	• @c lhs + @c rhs; or
    /// 	• @c lhs - @c rhs;
    ///	producing @c result.
    template <int bit, typename IntT>
    bool carried_in(IntT lhs, IntT rhs, IntT result)
    {
        // 0 and 0 or 1 and 1 => did if 1.
        // 0 and 1 or 1 and 0 => did if 0.
        return IntT(1 << bit) & (lhs ^ rhs ^ result);
    }
}

// /* 0x6d ADC abs */		AbsoluteRead(OperationADC),
const uint8_t OperationADC = 0x6D;

uint8_t a_, x_, y_, s_ = 0;
CPU::MOS6502Esque::LazyFlags flags_;

uint8_t operation_, operand_;

void adc(uint8_t a_, uint8_t operand_, CPU::MOS6502Esque::LazyFlags flags_)
{
    cout << "A:" << fmt::format("{:#04x}", a_) << " v:" << fmt::format("{:#04x}", operand_) << " C:" << fmt::format("{:#04x}", flags_.carry) << " V:" << fmt::format("{:#04x}", flags_.overflow) << " N:" << fmt::format("{:#04x}", flags_.negative_result) << " Z:" << fmt::format("{:#04x}", flags_.zero_result) << endl;

    const uint16_t result = /*uint16_t*/ (a_) + /*uint16_t*/ (operand_) + /*uint16_t*/ (flags_.carry);
    flags_.overflow = (((result ^ a_) & (result ^ operand_)) & 0x80) >> 1;
    flags_.set_nz(a_ = /*uint8_t*/ (result));
    flags_.carry = (result >> 8) & 1;

    cout << "A:" << fmt::format("{:#04x}", a_) << " v:" << fmt::format("{:#04x}", operand_) << " C:" << fmt::format("{:#04x}", flags_.carry) << " V:" << fmt::format("{:#04x}", flags_.overflow) << " N:" << fmt::format("{:#04x}", flags_.negative_result) << " Z:" << fmt::format("{:#04x}", flags_.zero_result) << " result:" << fmt::format("{:#04x}", result) << endl << endl;
}

int main()
{
    {
        CPU::MOS6502Esque::LazyFlags flags_;
        adc(0x00, 0x00, flags_);
    }

    {
        CPU::MOS6502Esque::LazyFlags flags_;
        flags_.carry = 1;
        adc(0x00, 0x00, flags_);
    }

    {
        CPU::MOS6502Esque::LazyFlags flags_;
        adc(0x01, 0xFE, flags_);
    }
}
