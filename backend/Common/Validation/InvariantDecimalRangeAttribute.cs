using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace backend.Common.Validation
{
    [AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
    public sealed class InvariantDecimalRangeAttribute : ValidationAttribute
    {
        private readonly decimal _minimum;
        private readonly decimal _maximum;

        public InvariantDecimalRangeAttribute(string minimum, string maximum)
        {
            _minimum = decimal.Parse(minimum, NumberStyles.Number, CultureInfo.InvariantCulture);
            _maximum = decimal.Parse(maximum, NumberStyles.Number, CultureInfo.InvariantCulture);
        }

        public override bool IsValid(object? value)
        {
            if (value == null) return true;
            return TryConvert(value, out var decimalValue) &&
                   decimalValue >= _minimum &&
                   decimalValue <= _maximum;
        }

        public override string FormatErrorMessage(string name)
        {
            return ErrorMessage ??
                   $"{name} må være mellom {Format(_minimum)} og {Format(_maximum)}.";
        }

        private static bool TryConvert(object value, out decimal decimalValue)
        {
            switch (value)
            {
                case decimal decimalInput:
                    decimalValue = decimalInput;
                    return true;
                case int intInput:
                    decimalValue = intInput;
                    return true;
                case long longInput:
                    decimalValue = longInput;
                    return true;
                case double doubleInput when double.IsFinite(doubleInput):
                    decimalValue = (decimal)doubleInput;
                    return true;
                case float floatInput when float.IsFinite(floatInput):
                    decimalValue = (decimal)floatInput;
                    return true;
                case string stringInput:
                    return decimal.TryParse(
                               stringInput,
                               NumberStyles.Number,
                               CultureInfo.InvariantCulture,
                               out decimalValue) ||
                           decimal.TryParse(
                               stringInput,
                               NumberStyles.Number,
                               CultureInfo.CurrentCulture,
                               out decimalValue);
                default:
                    decimalValue = 0;
                    return false;
            }
        }

        private static string Format(decimal value)
        {
            return value.ToString("0.##", CultureInfo.InvariantCulture);
        }
    }
}
