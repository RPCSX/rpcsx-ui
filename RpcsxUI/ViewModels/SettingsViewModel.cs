using ReactiveUI;
using RpcsxUI.States;

namespace RpcsxUI.ViewModels;

public class SettingsViewModel(ApplicationState state, IScreen screen) : ViewModelBase(state), IRoutableViewModel
{
    /// <inheritdoc/>
    public IScreen HostScreen { get; } = screen;

    /// <summary>
    /// Unique identifier for the routable view model.
    /// </summary>
    public string UrlPathSegment { get; } = nameof(SettingsViewModel);
}
