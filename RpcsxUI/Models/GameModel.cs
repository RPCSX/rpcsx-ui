using CommunityToolkit.Mvvm.ComponentModel;

namespace RpcsxUI.Models;

public partial class GameModel : ObservableObject
{
    [ObservableProperty]
    private string _imagePath = string.Empty;

    [ObservableProperty]
    private string _name = string.Empty;

    [ObservableProperty]
    private string _serial = string.Empty;

    [ObservableProperty]
    private string _version = string.Empty;

    [ObservableProperty]
    private string _region = string.Empty;

    [ObservableProperty]
    private ulong _size;
}
