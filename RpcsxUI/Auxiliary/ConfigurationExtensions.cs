using Microsoft.Extensions.DependencyInjection;
using ReactiveUI;
using RpcsxUI.Core.Providers;
using RpcsxUI.Core.Services;
using RpcsxUI.Core.Services.Abstractions;
using RpcsxUI.Infrastructure.Providers;
using RpcsxUI.ViewModels;

namespace RpcsxUI.Auxiliary;

public static class ConfigurationExtensions
{
    public static IServiceCollection AddViewModels(this IServiceCollection services)
    {
        // Main IScreen - the root view in the navigation stack
        services.AddSingleton<IScreen, MainViewModel>();

        //// Common view models
        // TODO: this is AOT-incompatible yet
#if false
        var types = Assembly
            .GetExecutingAssembly()
            .GetTypes()
            .Where(t => t.BaseType == typeof(ViewModelBase) && !t.IsGenericType)
            .ToArray();

        foreach (var type in types)
            services.AddSingleton(type);
#else
        services
            .AddSingleton<MainViewModel>()
            .AddSingleton<GamesViewModel>()
            .AddSingleton<SettingsViewModel>()
            .AddSingleton<LogsViewModel>();
#endif
        return services;
    }

    public static IServiceCollection AddCoreServices(this IServiceCollection services)
        => services
            .AddSingleton<IGamesService, GamesService>();

    public static IServiceCollection AddProviders(this IServiceCollection services)
        => services
            .AddSingleton<IGamesProvider, GamesProvider>();

}
