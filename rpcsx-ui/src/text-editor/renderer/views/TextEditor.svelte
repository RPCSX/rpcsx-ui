<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import * as monaco from "monaco-editor";
  import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

  export let text: string;
  export let submitCommand: string;

  let editorElement: HTMLElement;
  let editor: monaco.editor.IStandaloneCodeEditor;
  let model: monaco.editor.ITextModel;

  onMount(async () => {
    self.MonacoEnvironment = {
      getWorker: function (_: any, label: string) {
        return new editorWorker();
      },
    };
    editor = monaco.editor.create(editorElement, {
      automaticLayout: true,
      theme: "vs-dark",
    });
    model = monaco.editor.createModel(text);
    editor.setModel(model);
    editor.addAction({
      id: "document.save",
      label: "Save document",
      keybindings: [monaco.KeyCode.Ctrl, monaco.KeyCode.KeyS],
      run: () => {
        console.log("save!!", text);
        if (window.electron) {
          window.electron.ipcRenderer.send(submitCommand, { text });
        }
      },
    });
  });

  onDestroy(() => {
    monaco?.editor.getModels().forEach((model) => model.dispose());
    editor?.dispose();
  });
</script>

<div class="flex-grow" bind:this={editorElement}></div>
