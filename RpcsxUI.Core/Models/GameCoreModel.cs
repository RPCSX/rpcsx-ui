using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RpcsxUI.Core.Models;

public class GameCoreModel
{
    public string ImagePath { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Serial { get; set; } = string.Empty;

    public string Version { get; set; } = string.Empty;

    public string Region { get; set; } = string.Empty;

    public string Path { get; set; } = string.Empty;

    public ulong Size { get; set; }
}
