using Avalonia.Data.Converters;
using System;
using System.Globalization;

namespace RpcsxUI.Converters;

public class GamesCountToStringConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is not int count)
            return $"Invalid value type {targetType}";

        // TODO: use selected culture from string resources
        return $"{count} Games Installed";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
