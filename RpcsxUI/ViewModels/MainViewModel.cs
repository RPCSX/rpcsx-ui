using CommunityToolkit.Mvvm.DependencyInjection;
using ReactiveUI;
using System;
using System.Reactive;
using System.Reactive.Disposables;

namespace RpcsxUI.ViewModels;

public class MainViewModel : ViewModelBase, IScreen
{
    private bool _isGoBackVisible = false;

    private bool _isGridViewVisible = true;

    private bool _isListViewVisible = true;

    private bool _isSettingsVisible = true;

    public RoutingState Router { get; } = new RoutingState();

    public ReactiveCommand<Unit, IRoutableViewModel> GoToSettingsCommand { get; }

    public ReactiveCommand<Unit, Unit> GoBack { get; }

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

    public MainViewModel()
    {
        GoToSettingsCommand = ReactiveCommand.CreateFromObservable(
            () => Router.Navigate.Execute(Ioc.Default.GetRequiredService<SettingsViewModel>())
        );

        GoBack = ReactiveCommand.Create(() =>
        {
            if (Router.NavigationStack.Count > 0)
                Router.NavigateBack.Execute();
            else
                Router.NavigationStack.Clear();

            UpdateNavigationElements();
        });


        Router.Navigate.Subscribe(navigated =>
        {
            UpdateNavigationElements();
        })
        .DisposeWith(Disposables);

        Router.NavigateBack.Subscribe(navigated =>
        {
            UpdateNavigationElements();
        })
        .DisposeWith(Disposables);
    }

    private void UpdateNavigationElements()
    {
        if (Router.NavigationStack.Count == 0)
        {
            IsGoBackVisible = false;
            IsGridViewVisible = true;
            IsListViewVisible = true;
            IsSettingsVisible = true;
        }
        else if (Router.NavigationStack[^1] is SettingsViewModel)
        {
            IsGoBackVisible = true;
            IsGridViewVisible = false;
            IsListViewVisible = false;
            IsSettingsVisible = false;
        }
    }
}
