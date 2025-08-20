using Microsoft.Extensions.DependencyInjection;
using ReactiveUI;
using RpcsxUI.Core.Providers;
using RpcsxUI.Core.Services;
using RpcsxUI.Core.Services.Abstractions;
using RpcsxUI.Infrastructure.Providers;
using RpcsxUI.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;



namespace RpcsxUI.Auxiliary;

public static class ConfigurationExtensions
{
    public static IServiceCollection AddViewModels(this IServiceCollection services)
    {
        // Main IScreen - the root view in the navigation stack
        services.AddSingleton<IScreen, MainViewModel>();

        // Common view models
#if NO_AOT
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
    {
        // TODO: this is AOT-incompatible yet
#if NO_AOT
        services.AddImplementations<IServicesBase>();
#else
        services.AddSingleton<IGamesService, GamesService>();
#endif
        return services;
    }

    public static IServiceCollection AddProviders(this IServiceCollection services)
    {
        // TODO: this is AOT-incompatible yet
#if NO_AOT

#pragma warning disable CS0219
        // create an unused instance to enforce the RpcsxUI.Infrastructure assembly loading
        GamesProvider? gamesProvider = null;
#pragma warning restore CS0219
        services.AddImplementations<IProvidersBase>();
#else
        services.AddSingleton<IGamesService, GamesService>();
#endif
        return services;
    }

#if NO_AOT
    private static IServiceCollection AddImplementations<T>(this IServiceCollection services)
    {
        var types = AppDomain.CurrentDomain.GetAssemblies().SelectMany(x => x.GetTypes())
            .Where(t => t.IsAssignableTo(typeof(T)) && !t.IsGenericType && t != typeof(T))
            .ToArray() ?? [];

        // key is interface, value is implementation
        var dict = new Dictionary<Type, Type>();
        foreach (var type in types)
        {
            if (type.IsInterface && !dict.ContainsKey(type))
            {
                var impl = types.FirstOrDefault(x => !x.IsInterface && x.IsAssignableTo(type));
                if (impl != null)
                    dict[type] = impl;
            }
        }

        foreach (var (abstr, impl) in dict)
            services.AddSingleton(abstr, impl);

        return services;
    }
#endif
}
