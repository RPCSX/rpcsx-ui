using CommunityToolkit.Mvvm.DependencyInjection;
using ReactiveUI;
using RpcsxUI.States;
using System;
using System.Reactive;
using System.Reactive.Disposables;

namespace RpcsxUI.ViewModels;

public class MainViewModel : ViewModelBase, IScreen
{
    

    public RoutingState Router { get; } = new RoutingState();

    public ReactiveCommand<Unit, IRoutableViewModel> GoToSettingsCommand { get; }

    public ReactiveCommand<Unit, Unit> GoBack { get; }

    public ReactiveCommand<Unit, Unit> SetListViewCommand { get; }

    public ReactiveCommand<Unit, Unit> SetGridViewCommand { get; }

    

    public MainViewModel(ApplicationState state) : base(state)
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

        SetListViewCommand = ReactiveCommand.Create(() =>
        {
            State.IsListView = true;
            State.IsGridView = false;
        });

        SetGridViewCommand = ReactiveCommand.Create(() =>
        {
            State.IsListView = false;
            State.IsGridView = true;
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
            State.IsGoBackVisible = false;
            State.IsGridViewVisible = true;
            State.IsListViewVisible = true;
            State.IsSettingsVisible = true;
        }
        else if (Router.NavigationStack[^1] is SettingsViewModel)
        {
            State.IsGoBackVisible = true;
            State.IsGridViewVisible = false;
            State.IsListViewVisible = false;
            State.IsSettingsVisible = false;
        }
    }
}
