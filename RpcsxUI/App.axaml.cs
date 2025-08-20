using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using CommunityToolkit.Mvvm.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using ReactiveUI;
using RpcsxUI.Auxiliary;
using RpcsxUI.States;
using RpcsxUI.ViewModels;
using RpcsxUI.Views;

namespace RpcsxUI;

public partial class App : Application
{
    public override void Initialize() 
        => AvaloniaXamlLoader.Load(this);

    public override void OnFrameworkInitializationCompleted()
    {
        // Create a new service collection
        var services = new ServiceCollection();

        // Register view models
        services.AddViewModels();

        // Register core services
        services.AddCoreServices();

        // Register infrastructure providers
        services.AddProviders();

        // Register app state
        services.AddSingleton<ApplicationState>();

        // Build the service provider 
        Ioc.Default.ConfigureServices(services.BuildServiceProvider());

        // Set up the main view
        switch (ApplicationLifetime)
        {
            case IClassicDesktopStyleApplicationLifetime desktop:
                desktop.MainWindow = new MainWindow();
                break;
            case ISingleViewApplicationLifetime singleViewPlatform:
                singleViewPlatform.MainView = new MainView();
                break;
        }

        base.OnFrameworkInitializationCompleted();
    }
}
