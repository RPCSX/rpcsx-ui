# rpcsx-ui

This repo houses an experimental cross-platform UI for RPCSX built using Tauri and Svelte. UI is renderer using OS native browser frameworks, and IPC with the main RPCSX process will be done through the Rust backend.

## Dependencies
- [Rust](https://www.rust-lang.org/tools/install)
- [Bun](https://bun.sh/)

## Build Guide

- `bun install`
- `bun run tauri dev`

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) with the following extensions:
- [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [Tailwind CSS](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
