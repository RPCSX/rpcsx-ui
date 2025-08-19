using RpcsxUI.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RpcsxUI.Core.Providers;

public interface IGamesProvider
{
    Task<GameCoreModel[]> GetGamesAsync();
}
