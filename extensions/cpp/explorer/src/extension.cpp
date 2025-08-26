#include "./sfo.hpp"
#include "rpcsx/ui/log.hpp"
#include <rpcsx/ui/extension.hpp>
#include <thread>

using namespace rpcsx::ui;

enum class LanguageCode {
  ja,
  en,
  fr,
  es,
  de,
  it,
  nl,
  pt,
  ru,
  ko,
  ch,
  zh,
  fi,
  sv,
  da,
  no,
  pl,
  br,
  gb,
  tr,
  la,
  ar,
  ca,
  cs,
  hu,
  el,
  ro,
  th,
  vi,
  in,
  uk,

  _count
};

static std::string languageCodeToString(LanguageCode code) {
  switch (code) {
  case LanguageCode::ja:
    return "ja";
  case LanguageCode::en:
    return "en";
  case LanguageCode::fr:
    return "fr";
  case LanguageCode::es:
    return "es";
  case LanguageCode::de:
    return "de";
  case LanguageCode::it:
    return "it";
  case LanguageCode::nl:
    return "nl";
  case LanguageCode::pt:
    return "pt";
  case LanguageCode::ru:
    return "ru";
  case LanguageCode::ko:
    return "ko";
  case LanguageCode::ch:
    return "ch";
  case LanguageCode::zh:
    return "zh";
  case LanguageCode::fi:
    return "fi";
  case LanguageCode::sv:
    return "sv";
  case LanguageCode::da:
    return "da";
  case LanguageCode::no:
    return "no";
  case LanguageCode::pl:
    return "pl";
  case LanguageCode::br:
    return "br";
  case LanguageCode::gb:
    return "gb";
  case LanguageCode::tr:
    return "tr";
  case LanguageCode::la:
    return "la";
  case LanguageCode::ar:
    return "ar";
  case LanguageCode::ca:
    return "ca";
  case LanguageCode::cs:
    return "cs";
  case LanguageCode::hu:
    return "hu";
  case LanguageCode::el:
    return "el";
  case LanguageCode::ro:
    return "ro";
  case LanguageCode::th:
    return "th";
  case LanguageCode::vi:
    return "vi";
  case LanguageCode::in:
    return "in";
  case LanguageCode::uk:
    return "uk";
  default:
    return "en";
  }
}

static std::vector<LocalizedString>
fetchLocalizedString(const sfo::registry &registry, const std::string &key) {
  if (!registry.contains(key)) {
    return {};
  }

  std::vector<LocalizedString> result;
  result.push_back({.text = registry.at(key).as_string()});

  for (std::size_t i = 0; i < static_cast<int>(LanguageCode::_count); ++i) {
    std::string keyWithSuffix = key + (i < 10 ? "_0" : "_");
    keyWithSuffix += std::to_string(i);

    if (!registry.contains(keyWithSuffix)) {
      continue;
    }

    result.push_back(
        {.text = registry.at(keyWithSuffix).as_string(),
         .lang = languageCodeToString(static_cast<LanguageCode>(i))});
  }

  return result;
}

static std::vector<LocalizedResource>
fetchLocalizedResourceFile(const std::filesystem::path &path,
                        const std::string &name, const std::string &ext) {
  std::vector<LocalizedResource> result;

  if (std::filesystem::is_regular_file(path / (name + ext))) {
    result.push_back(LocalizedResource{
        .uri = "file://" + (path / (name + ext)).string(),
    });
  } else {
    return {};
  }

  for (std::size_t i = 0; i < static_cast<int>(LanguageCode::_count); ++i) {
    std::string suffix = (i < 10 ? "_0" : "_");
    suffix += std::to_string(i);

    if (auto testPath = path / (name + suffix + ext);
        std::filesystem::is_regular_file(testPath)) {
      result.push_back(LocalizedResource{
          .uri = "file://" + testPath.string(),
          .lang = languageCodeToString(static_cast<LanguageCode>(i)),
      });
    }
  }

  return result;
}

static std::vector<LocalizedImage>
fetchLocalizedImageFile(const std::filesystem::path &path,
                        const std::string &name, const std::string &ext) {
  std::vector<LocalizedImage> result;

  if (std::filesystem::is_regular_file(path / (name + ext))) {
    result.push_back(LocalizedImage{
        .uri = "file://" + (path / (name + ext)).string(),
        .resolution = ImageResolution::Normal,
    });
  }

  if (std::filesystem::is_regular_file(path / (name + "_4k" + ext))) {
    result.push_back(LocalizedImage{
        .uri = "file://" + (path / (name + "_4k" + ext)).string(),
        .resolution = ImageResolution::High,
    });
  }

  for (std::size_t i = 0; i < static_cast<int>(LanguageCode::_count); ++i) {
    std::string suffix = (i < 10 ? "_0" : "_");
    suffix += std::to_string(i);

    if (auto testPath = path / (name + suffix + ext);
        std::filesystem::is_regular_file(testPath)) {
      result.push_back(LocalizedImage{
          .uri = "file://" + testPath.string(),
          .lang = languageCodeToString(static_cast<LanguageCode>(i)),
          .resolution = ImageResolution::Normal,
      });
    }

    if (auto testPath = path / (name + "_4k" + suffix + ext);
        std::filesystem::is_regular_file(testPath)) {
      result.push_back(LocalizedImage{
          .uri = "file://" + testPath.string(),
          .lang = languageCodeToString(static_cast<LanguageCode>(i)),
          .resolution = ImageResolution::High,
      });
    }
  }

  return result;
}
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
    elog("%s: error %d", entry.path().c_str(), static_cast<int>(data.errc));
    return {};
  }

  auto category = sfo::get_string(data.sfo, "CATEGORY");

  if (category == "gdd" || category == "gdf" || category == "gdp" ||
      category == "gdg") {
    return {};
  }

  ExplorerItem info;
  info.type = "game";
  info.name = fetchLocalizedString(data.sfo, "TITLE");

  if (info.name.empty()) {
    return {};
  }

  info.titleId = sfo::get_string(data.sfo, "TITLE_ID");
  info.version = sfo::get_string(data.sfo, "APP_VER");

  if (info.version->empty()) {
    info.version = sfo::get_string(data.sfo, "VERSION", "1.0");
  }

  info.icon = fetchLocalizedImageFile(sysPath, "icon0", ".png");
  info.iconSound = fetchLocalizedResourceFile(sysPath, "snd0", ".at9");
  info.background = fetchLocalizedImageFile(sysPath, "pic1", ".png");
  info.overlayImage = fetchLocalizedImageFile(sysPath, "pic2", ".png");

  info.size = calcDirectorySize(entry.path());
  info.type = "game";
  info.launcher = LauncherInfo{
      .type = "fself-ps4-orbis" // FIXME: self/elf? ps5?
                                // "fself-ps5-prospero"
  };
  info.location = "file://" + entry.path().string();
  return std::move(info);
}

static std::optional<ExplorerItem>
tryFetchPs3Game(const std::filesystem::directory_entry &entry) {
  auto usrdirPath = entry.path() / "USRDIR";
  auto paramSfoPath = entry.path() / "PARAM.SFO";
  auto ebootPath = usrdirPath / "EBOOT.BIN";

  if (!std::filesystem::is_regular_file(ebootPath)) {
    return {};
  }

  if (!std::filesystem::is_regular_file(paramSfoPath)) {
    return {};
  }

  auto data = sfo::load(paramSfoPath.string());
  if (data.errc != sfo::error::ok) {
    elog("%s: error %d", entry.path().c_str(), static_cast<int>(data.errc));
    return {};
  }

  auto titleId = sfo::get_string(data.sfo, "TITLE_ID");
  auto bootable = sfo::get_integer(data.sfo, "BOOTABLE", 0);
  auto category = sfo::get_string(data.sfo, "CATEGORY");

  if (!bootable || titleId.empty()) {
    return {};
  }

  ExplorerItem info;
  info.type = "game";
  info.name = fetchLocalizedString(data.sfo, "TITLE");

  if (info.name.empty()) {
    return {};
  }

  info.version = sfo::get_string(data.sfo, "APP_VER");

  if (info.version->empty()) {
    info.version = sfo::get_string(data.sfo, "VERSION", "1.0");
  }

  info.icon = fetchLocalizedImageFile(entry.path(), "ICON0", ".PNG");
  info.iconSound = fetchLocalizedResourceFile(entry.path(), "SND0", ".AT3");
  info.iconVideo = fetchLocalizedResourceFile(entry.path(), "ICON1", ".PAM");
  info.overlayImageWide = fetchLocalizedImageFile(entry.path(), "PIC0", ".PNG");
  info.background = fetchLocalizedImageFile(entry.path(), "PIC1", ".PNG");
  info.overlayImage = fetchLocalizedImageFile(entry.path(), "PIC2", ".PNG");

  info.size = calcDirectorySize(entry.path());
  info.type = "game";
  info.launcher = LauncherInfo{
      .type = "self-ps3-cellos" // FIXME: fself/elf?
  };
  info.location = "file://" + entry.path().string();

  return info;
}

struct ExplorerExtension : rpcsx::ui::Extension<rpcsx::ui::Explorer> {
  std::thread explorerThread;
  std::vector<std::string> locations;
  std::atomic<bool> cancelled{false};

  using Base::Base;

  Response<Initialize> handle(const Request<Initialize> &) override {
    return Initialize::Response{.extension = {
                                    .name = {{EXTENSION_NAME}},
                                    .version = EXTENSION_VERSION,
                                }};
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

          if (auto game = tryFetchPs3Game(entry)) {
            submit(std::move(*game));
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
    std::exit(0);
    return {};
  }
};

ExtensionBuilder extension_main() {
  return rpcsx::ui::createExtension<ExplorerExtension>();
}
