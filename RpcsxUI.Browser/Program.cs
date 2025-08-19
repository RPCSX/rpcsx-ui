using Avalonia;
using Avalonia.Browser;
using Avalonia.ReactiveUI;
using Projektanker.Icons.Avalonia;
using Projektanker.Icons.Avalonia.MaterialDesign;
using RpcsxUI;
using System.Threading.Tasks;

internal sealed partial class Program
{
    private static Task Main(string[] args) => BuildAvaloniaApp()
            .WithInterFont()
            .UseReactiveUI()
            .StartBrowserAppAsync("out");

    public static AppBuilder BuildAvaloniaApp()
    {
        IconProvider.Current
            .Register<MaterialDesignIconProvider>();

        return AppBuilder.Configure<App>();
    }
}
