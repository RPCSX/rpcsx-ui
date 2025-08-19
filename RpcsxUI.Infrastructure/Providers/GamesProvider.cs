using RpcsxUI.Core.Models;
using RpcsxUI.Core.Providers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RpcsxUI.Infrastructure.Providers;

public class GamesProvider : IGamesProvider
{
    public async Task<GameCoreModel[]> GetGamesAsync()
    {
        // imitate some work
        await Task.Delay(300);

        return
        [
            new GameCoreModel
            {
                Name = "Game 1",
                Path = "/path/to/game1",
                Region = "NTSC-U",
                Serial = "SLUS-12345",
                Version = "1.0",
                Size = 1234567890
            },
            new GameCoreModel
            {
                Name = "Game 2",
                ImagePath = "/images/game2.png",
                Region = "PAL",
                Serial = "SLES-67890",
                Version = "1.1",
                Size = 9876543210
            },
            new GameCoreModel
            {
                Name = "Game 3",
                ImagePath = "/images/game3.png",
                Region = "NTSC-J",
                Serial = "BLJS-34567",
                Version = "1.5",
                Size = 2345234523
            }
        ];
    }
}
