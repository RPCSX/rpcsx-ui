using RpcsxUI.Core.Models;
using RpcsxUI.Core.Providers;
using RpcsxUI.Core.Services.Abstractions;

namespace RpcsxUI.Core.Services;

public class GamesService(IGamesProvider provider) : IGamesService
{
    public Task<GameCoreModel[]> GetGamesAsync()
        => provider.GetGamesAsync();
}
