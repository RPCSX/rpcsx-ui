using Avalonia.Controls;
using Avalonia.ReactiveUI;
using RpcsxUI.ViewModels;

namespace RpcsxUI.Views;

public partial class MainView : UserControlBase<MainViewModel>
{
    public MainView()
    {
        InitializeComponent();
    }
}
