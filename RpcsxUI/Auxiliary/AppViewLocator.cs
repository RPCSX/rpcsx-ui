using ReactiveUI;
using RpcsxUI.ViewModels;
using RpcsxUI.Views;
using System;

namespace RpcsxUI.Auxiliary;

public class AppViewLocator : IViewLocator
{
    public IViewFor? ResolveView<T>(T? viewModel, string? contract = null) => viewModel switch
    {
        SettingsViewModel settingsViewModel => new SettingsView { DataContext = settingsViewModel },

        _ => throw new ArgumentOutOfRangeException(nameof(viewModel))
    };
}
