using ReactiveUI;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace RpcsxUI.States;

/// <summary>
/// Shared state between view models
/// </summary>
public class ApplicationState : ReactiveObject
{
    private bool _isGoBackVisible = false;
    private bool _isGridViewVisible = true;
    private bool _isListViewVisible = true;
    private bool _isSettingsVisible = true;
    private bool _isListView = true;
    private bool _isGridView = false;

    public bool IsGoBackVisible
    {
        get => _isGoBackVisible;
        set => this.RaiseAndSetIfChanged(ref _isGoBackVisible, value);
    }

    public bool IsGridViewVisible
    {
        get => _isGridViewVisible;
        set => this.RaiseAndSetIfChanged(ref _isGridViewVisible, value);
    }

    public bool IsListViewVisible
    {
        get => _isListViewVisible;
        set => this.RaiseAndSetIfChanged(ref _isListViewVisible, value);
    }

    public bool IsSettingsVisible
    {
        get => _isSettingsVisible;
        set => this.RaiseAndSetIfChanged(ref _isSettingsVisible, value);
    }

    public bool IsListView
    {
        get => _isListView;
        set => this.RaiseAndSetIfChanged(ref _isListView, value);
    }

    public bool IsGridView
    {
        get => _isGridView;
        set => this.RaiseAndSetIfChanged(ref _isGridView, value);
    }
}
