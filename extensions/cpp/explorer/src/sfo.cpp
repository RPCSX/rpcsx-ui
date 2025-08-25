#include "sfo.hpp"
#include "rpcsx/ui/file.hpp"
#include "rpcsx/ui/format.hpp"
#include "rpcsx/ui/log.hpp"
#include <cassert>
#include <cstring>
#include <print>
#include <source_location>
#include <span>
#include <utility>

using namespace rpcsx::ui;

template <typename T> using le_t = T;

struct header_t {
  le_t<std::uint32_t> magic;
  le_t<std::uint32_t> version;
  le_t<std::uint32_t> off_key_table;
  le_t<std::uint32_t> off_data_table;
  le_t<std::uint32_t> entries_num;
};

static_assert(sizeof(header_t) == 20);

struct def_table_t {
  le_t<std::uint16_t> key_off;
  le_t<sfo::format> param_fmt;
  le_t<std::uint32_t> param_len;
  le_t<std::uint32_t> param_max;
  le_t<std::uint32_t> data_off;
};
static_assert(sizeof(def_table_t) == 16);

sfo::entry::entry(format type, std::uint32_t max_size, std::string_view value,
                  bool allow_truncate) noexcept
    : m_format(type), m_max_size(max_size), m_value_string(value) {
  assert(type == format::string || type == format::array);
  assert(max_size > (type == format::string ? 1u : 0u));

  if (allow_truncate && value.size() > max(false)) {
    m_value_string.resize(max(false));
  }
}

sfo::entry::entry(std::uint32_t value) noexcept
    : m_format(format::integer), m_max_size(sizeof(std::uint32_t)),
      m_value_integer(value) {}

const std::string &sfo::entry::as_string() const {
  assert(m_format == format::string || m_format == format::array);
  return m_value_string;
}

std::uint32_t sfo::entry::as_integer() const {
  assert(m_format == format::integer);
  return m_value_integer;
}

sfo::entry &sfo::entry::operator=(std::string_view value) {
  assert(m_format == format::string || m_format == format::array);
  m_value_string = value;
  return *this;
}

sfo::entry &sfo::entry::operator=(std::uint32_t value) {
  assert(m_format == format::integer);
  m_value_integer = value;
  return *this;
}

std::uint32_t sfo::entry::size() const {
  switch (m_format) {
  case format::string:
  case format::array:
    return std::min(m_max_size, static_cast<std::uint32_t>(
                                    m_value_string.size() +
                                    (m_format == format::string ? 1 : 0)));

  case format::integer:
    return sizeof(std::uint32_t);
  }

  fatal("sfo: invalid format ({})", m_format);
}

bool sfo::entry::is_valid() const {
  switch (m_format) {
  case format::string:
  case format::array:
    return m_value_string.size() <= this->max(false);

  case format::integer:
    return true;
  }

  return false;
}

sfo::load_result_t sfo::load(ReadableByteStream stream,
                             std::string_view filename) {
  load_result_t result{};

#define PSF_CHECK(cond, err)                                                   \
  if (!static_cast<bool>(cond)) {                                              \
    if (true || err != error::stream)                                          \
      elog("sfo: Error loading '{}': {}. {}", filename, err,                   \
           std::source_location::current());                                   \
    result.sfo.clear();                                                        \
    result.errc = err;                                                         \
    return result;                                                             \
  }

  auto originalStream = stream;
  PSF_CHECK(!stream.empty(), error::stream);

  // Get header
  header_t header;
  PSF_CHECK(stream.read(header), error::not_psf);

  // Check magic and version
  le_t<std::uint32_t> expMagic;
  std::memcpy(&expMagic, "\0PSF", sizeof(expMagic));

  PSF_CHECK(header.magic == expMagic, error::not_psf);
  PSF_CHECK(header.version == 0x101u, error::not_psf);
  PSF_CHECK(header.off_key_table >= sizeof(header_t), error::corrupt);
  PSF_CHECK(header.off_key_table <= header.off_data_table, error::corrupt);
  PSF_CHECK(header.off_data_table <= stream.size(), error::corrupt);

  // Get indices
  std::vector<def_table_t> indices;
  PSF_CHECK(stream.read(indices, header.entries_num), error::corrupt);

  // Get keys
  std::string keys;
  PSF_CHECK(originalStream.size() > header.off_key_table, error::corrupt);

  stream = originalStream.subspan(header.off_key_table);
  PSF_CHECK(stream.read(keys, header.off_data_table - header.off_key_table),
            error::corrupt);

  // Load entries
  for (std::uint32_t i = 0; i < header.entries_num; ++i) {
    PSF_CHECK(indices[i].key_off < header.off_data_table - header.off_key_table,
              error::corrupt);

    // Get key name (null-terminated string)
    std::string_view key(keys.data() + indices[i].key_off);

    // Check entry
    PSF_CHECK(!result.sfo.contains(key), error::corrupt);
    PSF_CHECK(indices[i].param_len <= indices[i].param_max, error::corrupt);
    PSF_CHECK(indices[i].data_off <
                  originalStream.size() - header.off_data_table,
              error::corrupt);
    PSF_CHECK(indices[i].param_max <
                  originalStream.size() - indices[i].data_off,
              error::corrupt);

    // Seek data pointer
    PSF_CHECK(originalStream.size() >
                  header.off_data_table + indices[i].data_off,
              error::corrupt);
    stream =
        originalStream.subspan(header.off_data_table + indices[i].data_off);

    if (indices[i].param_fmt == format::integer &&
        indices[i].param_max == sizeof(std::uint32_t) &&
        indices[i].param_len == sizeof(std::uint32_t)) {
      // Integer data
      le_t<std::uint32_t> value;
      PSF_CHECK(stream.read(value), error::corrupt);

      result.sfo.emplace(std::piecewise_construct,
                         std::forward_as_tuple(std::move(key)),
                         std::forward_as_tuple(value));
    } else if (indices[i].param_fmt == format::string ||
               indices[i].param_fmt == format::array) {
      // String/array data
      std::string value;
      PSF_CHECK(stream.read(value, indices[i].param_len), error::corrupt);

      if (indices[i].param_fmt == format::string) {
        // Find null terminator
        value.resize(std::strlen(value.c_str()));
      }

      result.sfo.emplace(
          std::piecewise_construct, std::forward_as_tuple(std::move(key)),
          std::forward_as_tuple(indices[i].param_fmt, indices[i].param_max,
                                std::move(value)));
    } else {
      // Possibly unsupported format, entry ignored
      elog("sfo: Unknown entry format (key='{}', fmt={}, len=0x{:x}, "
           "max=0x{:x})",
           key, indices[i].param_fmt, indices[i].param_len,
           indices[i].param_max);
    }
  }

#undef PSF_CHECK
  return result;
}

sfo::load_result_t sfo::load(const std::string &filename) {
  auto file = File::open(filename);
  if (!file.has_value()) {
    std::println(stderr, "file open error {}", file.error().message());
    return {{}, error::stream};
  }

  auto data = file->map();

  if (!data.has_value()) {
    std::println(stderr, "file map error {}", data.error().message());
    return {{}, error::stream};
  }

  return load(data.value(), filename);
}

std::string_view sfo::get_string(const registry &psf, std::string_view key,
                                 std::string_view def) {
  const auto found = psf.find(key);

  if (found == psf.end() || (found->second.type() != format::string &&
                             found->second.type() != format::array)) {
    return def;
  }

  return found->second.as_string();
}

std::uint32_t sfo::get_integer(const registry &psf, std::string_view key,
                               std::uint32_t def) {
  const auto found = psf.find(key);

  if (found == psf.end() || found->second.type() != format::integer) {
    return def;
  }

  return found->second.as_integer();
}

bool sfo::check_registry(
    const registry &psf,
    std::function<bool(bool ok, const std::string &key, const entry &value)>
        validate,
    std::source_location src_loc) {
  bool psf_ok = true;

  for (const auto &[key, value] : psf) {
    bool entry_ok = value.is_valid();

    if (validate) {
      // Validate against a custom condition as well (forward error)
      if (!validate(entry_ok, key, value)) {
        entry_ok = false;
      }
    }

    if (!entry_ok) {
      if (value.type() == format::string) {
        elog("sfo: {}: Entry '{}' is invalid: string='{}'", src_loc, key,
             value.as_string());
      } else {
        // TODO: Better logging of other types
        elog("sfo: {}: Entry {} is invalid", src_loc, key, value.as_string());
      }
    }

    if (!entry_ok) {
      // Do not break, run over all entries in order to report all errors
      psf_ok = false;
    }
  }

  return psf_ok;
}
