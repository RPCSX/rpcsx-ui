using Avalonia.Controls;
using CommunityToolkit.Mvvm.DependencyInjection;
using RpcsxUI.Abstractions;
using RpcsxUI.ViewModels;

namespace RpcsxUI.Views;

/// <summary>
/// This is a bse class for common user controls (no routing support). Automatically resolves the data context.
/// </summary>
/// <typeparam name="TViewModel">View model type</typeparam>
public class UserControlBase<TViewModel> : UserControl
    where TViewModel : ViewModelBase
{
    public TViewModel ViewModel { get; }

    protected UserControlBase()
    {
        ViewModel = Ioc.Default.GetRequiredService<TViewModel>();
        DataContext = ViewModel;
    }

    protected override void OnInitialized()
    {
        base.OnInitialized();

        if (ViewModel is ISupportsInitialized appearing)
            appearing.OnInitialized();
    }
}
