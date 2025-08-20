using RpcsxUI.States;

namespace RpcsxUI.ViewModels;

public class LogsViewModel(ApplicationState state) : ViewModelBase(state)
{
    public string Text { get; set; } = "Logs are here...";
}
