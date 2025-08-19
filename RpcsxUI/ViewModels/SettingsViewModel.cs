using ReactiveUI;

namespace RpcsxUI.ViewModels;

public class SettingsViewModel(IScreen screen) : ViewModelBase, IRoutableViewModel
{
    /// <inheritdoc/>
    public IScreen HostScreen { get; } = screen;

    /// <summary>
    /// Unique identifier for the routable view model.
    /// </summary>
    public string UrlPathSegment { get; } = nameof(SettingsViewModel);
}
