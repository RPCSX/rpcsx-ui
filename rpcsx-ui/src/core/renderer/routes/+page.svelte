<script lang="ts">
  import { unmount, mount, type ComponentProps } from "svelte";
  import Views from "$/Views.svelte";
  import Frame from "$/Frame.svelte";

  type ViewInstance = ComponentProps<Frame>;
  let viewStack: ViewInstance[] = [];
  let containerRoot: HTMLElement;
  let views: Views;

  function viewSet(name: string, props: any) {
    viewStack.forEach((x) => unmount(x));
    viewStack = [views.viewFactories[name](props)];
  }

  function viewPush(name: string, props: any) {
    if (viewStack.length > 0) {
      viewStack[viewStack.length - 1].shown = false;
    }

    viewStack.push(views.viewFactories[name](props));
  }

  function viewPop() {
    if (viewStack.length < 1) {
      return;
    }

    const hideView = viewStack.pop();
    if (!hideView) {
      return;
    }


    const showView = viewStack[viewStack.length - 1];
    hideView.shown = false;
    unmount(hideView);
    showView.shown = true;
    mount(Frame, {
      target: containerRoot,
      props: {
        component: showView.component,
        props: showView.props,
        shown: true
      }
    });
  }

  if (window.electron) {
    window.electron.ipcRenderer.on("view/push", (name: string, props: any) =>
      viewPush(name, props),
    );

    window.electron.ipcRenderer.on("view/pop", () => viewPop());

    window.electron.ipcRenderer.on("view/set", (name: string, props: any) =>
      viewSet(name, props),
    );

    window.electron.ipcRenderer.send("frame/initialized");
  }
</script>

<div bind:this={containerRoot} class="min-h-full h-full"></div>
<Views bind:this={views} bind:containerRoot></Views>
