using RpcsxUI.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RpcsxUI.Core.Services.Abstractions;

public interface IGamesService
{
    Task<GameCoreModel[]> GetGamesAsync();
}
