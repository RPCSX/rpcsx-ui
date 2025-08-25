#include "./sfo.hpp"
#include "rpcsx/ui/log.hpp"
#include <rpcsx/ui/extension.hpp>
#include <thread>

using namespace rpcsx::ui;

static std::size_t calcDirectorySize(const std::filesystem::path &path) {
  std::uint64_t result = 0;

  for (auto dir : std::filesystem::recursive_directory_iterator(path)) {
    if (dir.is_regular_file()) {
      result += std::filesystem::file_size(dir);
    }
  }

  return result;
}

static std::optional<ExplorerItem>
tryFetchFw(const std::filesystem::directory_entry &entry) {
  if (!std::filesystem::is_regular_file(entry.path() / "mini-syscore.elf")) {
    return {};
  }

  if (!std::filesystem::is_regular_file(entry.path() / "safemode.elf")) {
    return {};
  }

  if (!std::filesystem::is_regular_file(entry.path() / "system" / "sys" /
                                        "SceSysCore.elf")) {
    return {};
  }

  if (!std::filesystem::is_regular_file(entry.path() / "system" / "sys" /
                                        "orbis_audiod.elf")) {
    return {};
  }

  if (std::filesystem::is_regular_file(entry.path() / "system" / "sys" /
                                       "GnmCompositor.elf")) {
    return ExplorerItem{
        .type = "firmware",
        .name = {LocalizedString{
            .text = "PS4 Firmware",
        }},
        .location = "file://" + entry.path().string(),
        .size = calcDirectorySize(entry.path()),
        .launcher =
            LauncherInfo{
                .type = "dir-ps4-fw",
            },
    };
  }

  if (std::filesystem::is_regular_file(entry.path() / "system" / "sys" /
                                       "AgcCompositor.elf")) {
    return ExplorerItem{
        .type = "firmware",
        .name = {LocalizedString{
            .text = "PS5 Firmware",
        }},
        .location = "file://" + entry.path().string(),
        .size = calcDirectorySize(entry.path()),
        .launcher =
            LauncherInfo{
                .type = "dir-ps5-fw",
            },
    };
  }

  return {};
}

static std::optional<ExplorerItem>
tryFetchGame(const std::filesystem::directory_entry &entry) {
  if (!entry.is_directory()) {
    return {};
  }

  auto sysPath = entry.path() / "sce_sys";
  auto paramSfoPath = sysPath / "param.sfo";

  if (!std::filesystem::is_regular_file(entry.path() / "eboot.bin")) {
    return {};
  }

  if (!std::filesystem::is_regular_file(paramSfoPath)) {
    return {};
  }

  auto data = sfo::load(paramSfoPath.string());
  if (data.errc != sfo::error::ok) {
    elog("%s: error %d", entry.path().c_str(), data.errc);
    return {};
  }

  auto category = sfo::get_string(data.sfo, "CATEGORY");

  if (category == "gdd" || category == "gdf" || category == "gdp" ||
      category == "gdg") {
    return {};
  }

  ExplorerItem info;
  info.type = "game";

  auto name = sfo::get_string(data.sfo, "TITLE");
  if (name.empty()) {
    name = sfo::get_string(data.sfo, "TITLE_ID");

    if (name.empty()) {
      return {};
    }
  }

  info.name = {LocalizedString{.text = std::string(name)}};

  info.titleId = sfo::get_string(data.sfo, "TITLE_ID");
  info.version = sfo::get_string(data.sfo, "APP_VER");

  if (info.version->empty()) {
    info.version = sfo::get_string(data.sfo, "VERSION", "1.0");
  }

  if (std::filesystem::is_regular_file(sysPath / "icon0.png")) {
    info.icon = {
        LocalizedIcon{.uri = "file://" + (sysPath / "icon0.png").string()}};
  }

  info.size = calcDirectorySize(entry.path());
  info.type = "game";
  info.launcher = LauncherInfo{
      .type = "fself-ps4-orbis" // FIXME: self/elf? ps3? ps5?
                                // "fself-ps5-prospero"
  };
  info.location = "file://" + entry.path().string();
  return std::move(info);
}

struct ExplorerExtension : rpcsx::ui::Extension<rpcsx::ui::Explorer> {
  std::thread explorerThread;
  std::vector<std::string> locations;
  std::atomic<bool> cancelled{ false };

  using Base::Base;

  Response<Initialize> handle(const Request<Initialize> &) override {
    return {};
  }

  Response<Activate> handle(const Request<Activate> &request) override {
    std::fprintf(stderr, "activate request, settings = %s\n",
                 json(request.settings).dump().c_str());

    settingsGet({.path = "/"},
                [](const rpcsx::ui::SettingsGetResponse &response) {
                  std::fprintf(stderr, "settings: schema: %s\n",
                               nlohmann::json(response.schema).dump().c_str());
                  std::fprintf(stderr, "settings: value: %s\n",
                               response.value.dump().c_str());
                });

    if (!request.settings.contains("locations")) {
      return {};
    }

    locations = request.settings.at("locations");

    explorerThread = std::thread([this] {
      ExplorerItem batchItems[8];
      std::size_t batchSize = 0;

      auto flush = [&] {
        if (batchSize > 0) {
          this->explorerAdd({.items = {batchItems, batchItems + batchSize}});
          batchSize = 0;
        }
      };

      auto submit = [&](ExplorerItem item) {
        if (batchSize >= std::size(batchItems)) {
          flush();
        }

        batchItems[batchSize++] = std::move(item);
      };

      for (auto &location : locations) {
        for (auto &entry :
             std::filesystem::recursive_directory_iterator(location)) {
          if (cancelled) {
            return;
          }

          if (auto game = tryFetchGame(entry)) {
            submit(std::move(*game));
            continue;
          }

          if (auto fw = tryFetchFw(entry)) {
            submit(std::move(*fw));
            continue;
          }
        }
      }

      flush();
    });

    return {};
  }

  Response<Shutdown> handle(const Request<Shutdown> &) override {
    cancelled = true;
    explorerThread.join();
    return {};
  }
};

auto extension_main() {
  return rpcsx::ui::createExtension<ExplorerExtension>();
}
