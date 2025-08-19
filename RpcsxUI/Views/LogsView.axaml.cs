using Avalonia;
using Avalonia.Controls;
using Avalonia.Markup.Xaml;
using RpcsxUI.ViewModels;
using RpcsxUI.Views;

namespace RpcsxUI.Views;

public partial class LogsView : UserControlBase<LogsViewModel>
{
    public LogsView()
    {
        InitializeComponent();
    }
}