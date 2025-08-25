#pragma once

#include "rpcsx/ui/file.hpp"
#include "rpcsx/ui/refl.hpp"
#include <cstddef>
#include <cstdint>
#include <format>
#include <functional>
#include <map>
#include <source_location>
#include <string>
#include <string_view>
#include <vector>

namespace sfo {
enum sound_format_flag : std::int32_t {
  lpcm_2 = 1 << 0,   // Linear PCM 2 Ch.
  lpcm_5_1 = 1 << 2, // Linear PCM 5.1 Ch.
  lpcm_7_1 = 1 << 4, // Linear PCM 7.1 Ch.
  ac3 = 1 << 8,      // Dolby Digital 5.1 Ch.
  dts = 1 << 9,      // DTS 5.1 Ch.
};

enum resolution_flag : std::int32_t {
  _480 = 1 << 0,
  _576 = 1 << 1,
  _720 = 1 << 2,
  _1080 = 1 << 3,
  _480_16_9 = 1 << 4,
  _576_16_9 = 1 << 5,
};

enum class format : std::uint16_t {
  array = 0x0004, // claimed to be a non-NTS string (char array)
  string = 0x0204,
  integer = 0x0404,
};

enum class error {
  ok,
  stream,
  not_psf,
  corrupt,
};

class entry final {
  format m_format{};
  std::uint32_t
      m_max_size{}; // Entry max size (supplementary info, stored in PSF format)
  std::uint32_t m_value_integer{}; // TODO: is it really unsigned?
  std::string m_value_string{};

public:
  // Construct string entry, assign the value
  entry(format type, std::uint32_t max_size, std::string_view value,
        bool allow_truncate = false) noexcept;

  // Construct integer entry, assign the value
  entry(std::uint32_t value) noexcept;

  ~entry() = default;

  const std::string &as_string() const;
  std::uint32_t as_integer() const;

  entry &operator=(std::string_view value);
  entry &operator=(std::uint32_t value);

  format type() const { return m_format; }
  std::uint32_t max(bool with_nts) const {
    return m_max_size - (!with_nts && m_format == format::string ? 1 : 0);
  }
  std::uint32_t size() const;
  bool is_valid() const;
};

// Define PSF registry as a sorted map of entries:
using registry = std::map<std::string, entry, std::less<>>;

struct load_result_t {
  registry sfo;
  error errc;

  explicit operator bool() const { return !sfo.empty(); }
};

// Load PSF registry from SFO binary format
load_result_t load(rpcsx::ui::ReadableByteStream data,
                   std::string_view filename);
load_result_t load(const std::string &filename);
inline registry load_object(rpcsx::ui::ReadableByteStream data,
                            std::string_view filename) {
  return load(data, filename).sfo;
}

inline registry load_object(const std::string &filename) {
  return load(filename).sfo;
}

// Convert PSF registry to SFO binary format
std::vector<std::uint8_t>
save_object(const registry &,
            std::vector<std::uint8_t> &&init = std::vector<std::uint8_t>{});

// Get string value or default value
std::string_view get_string(const registry &psf, std::string_view key,
                            std::string_view def = {});

// Get integer value or default value
std::uint32_t get_integer(const registry &psf, std::string_view key,
                          std::uint32_t def = 0);

bool check_registry(
    const registry &psf,
    std::function<bool(bool ok, const std::string &key, const entry &value)>
        validate = {},
    std::source_location src_loc = std::source_location::current());

// Assign new entry
inline void assign(registry &psf, std::string_view key, entry &&_entry) {
  const auto found = psf.find(key);

  if (found == psf.end()) {
    psf.emplace(key, std::move(_entry));
    return;
  }

  found->second = std::move(_entry);
  return;
}

// Make string entry
inline entry string(std::uint32_t max_size, std::string_view value,
                    bool allow_truncate = false) {
  return {format::string, max_size, value, allow_truncate};
}

// Make string entry (from char[N])
template <std::size_t CharN>
inline entry string(std::uint32_t max_size, char (&value_array)[CharN],
                    bool allow_truncate = false) {
  std::string_view value{value_array, CharN};
  value = value.substr(
      0, std::min<std::size_t>(value.find_first_of('\0'), value.size()));
  return string(max_size, value, allow_truncate);
}

// Make array entry
inline entry array(std::uint32_t max_size, std::string_view value) {
  return {format::array, max_size, value};
}

// Checks if of HDD category (assumes a valid category is being passed)
constexpr bool is_cat_hdd(std::string_view cat) {
  return cat.size() == 2u && cat[1] != 'D' && cat != "DG" && cat != "MS";
}
} // namespace sfo

template <> struct std::formatter<sfo::format> {
  constexpr std::format_parse_context::iterator
  parse(std::format_parse_context &ctx) {
    return ctx.begin();
  }

  constexpr std::format_context::iterator
  format(sfo::format format, std::format_context &ctx) const {
    std::string_view name;
    switch (format) {
    case sfo::format::array:
      name = rpcsx::ui::getNameOf<sfo::format::array>();
      break;
    case sfo::format::string:
      name = rpcsx::ui::getNameOf<sfo::format::string>();
      break;
    case sfo::format::integer:
      name = rpcsx::ui::getNameOf<sfo::format::integer>();
      break;
    }

    if (name.empty()) {
      std::format_to(ctx.out(), "({}){:#x}",
                     rpcsx::ui::getNameOf<sfo::format>(),
                     std::to_underlying(format));
      return ctx.out();
    }

    std::format_to(ctx.out(), "{}", name);
    return ctx.out();
  }
};

template <> struct std::formatter<std::source_location> {
  constexpr std::format_parse_context::iterator
  parse(std::format_parse_context &ctx) {
    return ctx.begin();
  }

  constexpr std::format_context::iterator
  format(const std::source_location &location, std::format_context &ctx) const {
    std::format_to(ctx.out(), "{}:{}", location.file_name(), location.line());
    return ctx.out();
  }
};

template <> struct std::formatter<sfo::registry> {
  constexpr std::format_parse_context::iterator
  parse(std::format_parse_context &ctx) {
    return ctx.begin();
  }

  constexpr std::format_context::iterator
  format(const sfo::registry &registry, std::format_context &ctx) const {
    for (const auto &entry : registry) {
      if (entry.second.type() == sfo::format::array) {
        // Format them last
        continue;
      }

      std::format_to(ctx.out(), "{}: ", entry.first);

      const sfo::entry &data = entry.second;

      if (data.type() == sfo::format::integer) {
        std::format_to(ctx.out(), "0x{:x}\n", data.as_integer());
      } else {
        std::format_to(ctx.out(), "\"{}\"\n", data.as_string());
      }
    }

    for (const auto &entry : registry) {
      if (entry.second.type() != sfo::format::array) {
        // Formatted before
        continue;
      }

      std::format_to(ctx.out(), "{}: [", entry.first);

      for (bool first = true; auto byte : std::span<const std::uint8_t>(
                                  reinterpret_cast<const std::uint8_t *>(
                                      entry.second.as_string().data()),
                                  entry.second.size())) {
        if (first) {
          first = false;
        } else {
          std::format_to(ctx.out(), ", ");
        }

        std::format_to(ctx.out(), "{:x}", byte);
      }

      std::format_to(ctx.out(), "]\n");
    }

    return ctx.out();
  }
};
