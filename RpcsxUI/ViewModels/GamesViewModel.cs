using DynamicData;
using ReactiveUI;
using RpcsxUI.Abstractions;
using RpcsxUI.Auxiliary;
using RpcsxUI.Core.Services;
using RpcsxUI.Core.Services.Abstractions;
using RpcsxUI.Models;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Reactive;
using System.Threading.Tasks;

namespace RpcsxUI.ViewModels;

public class GamesViewModel : ViewModelBase, ISupportsInitialized
{
    private readonly IGamesService _gamesService;

    public ObservableCollection<GameModel> Games { get; } = [];

    public ReactiveCommand<Unit, Unit> ReloadCommand { get; }

    public GamesViewModel(IGamesService gamesService)
    {
        _gamesService = gamesService;
        ReloadCommand = ReactiveCommand.CreateFromTask(ReloadGamesAsync);
    }

    public void OnInitialized()
    {
        _ = ReloadGamesAsync();
    }

    private async Task ReloadGamesAsync()
    {
        // TODO: handle errors
        var games = await _gamesService.GetGamesAsync();
        var models = games.Select(x => x.ToObservableModel());

        // Clear the list first
        Games.Clear();

        // Add games to the list
        Games.AddRange(models);
    }
}
