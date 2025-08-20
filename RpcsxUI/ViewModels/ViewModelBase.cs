using ReactiveUI;
using RpcsxUI.States;
using System;
using System.Reactive.Disposables;

namespace RpcsxUI.ViewModels;

/// <summary>
/// Base class for view models. All the view models must be inherited from this!
/// </summary>
public class ViewModelBase(ApplicationState state) : ReactiveObject, IDisposable
{
    private bool _disposed;

    protected readonly CompositeDisposable Disposables = [];

    public ApplicationState State { get; } = state;

    /// <summary>
    /// Disposes managed and/or unmanaged resources
    /// </summary>
    /// <param name="disposing">Disposing flag</param>
    protected virtual void Dispose(bool disposing)
    {
        if (_disposed)
            return;

        if (disposing)
            Disposables.Dispose();

        _disposed = true;
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}
