import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

export const packagerConfig = {
  asar: true,
  extraResource: [
    "extensions"
  ]
};
export const rebuildConfig = {};
export const makers = [
  {
    name: '@electron-forge/maker-zip',
  },
  {
    name: '@electron-forge/maker-squirrel',
    config: {},
  },
  {
    name: '@electron-forge/maker-dmg',
    config: {
      icon: '../rpcsx-ui/assets/images/rpcsx-logo.png'
    }
  },
  {
    name: '@reforged/maker-appimage',
    config: {
      options: {
        categories: ['Utility'],
      },
    },
  },
  {
    name: '@electron-forge/maker-wix'
  }
];
export const plugins = [
  {
    name: '@electron-forge/plugin-auto-unpack-natives',
    config: {},
  },
  // Fuses are used to enable/disable various Electron functionality
  // at package time, before code signing the application
  new FusesPlugin({
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  }),
];
