using RpcsxUI.Core.Models;
using RpcsxUI.Models;

namespace RpcsxUI.Auxiliary;

public static class ModelExtensions
{
    public static GameModel ToObservableModel(this GameCoreModel model) => new()
    {
        ImagePath = model.ImagePath,
        Name = model.Name,
        Region = model.Region,
        Serial = model.Serial,
        Size = model.Size,
        Version = model.Version
    };
}

