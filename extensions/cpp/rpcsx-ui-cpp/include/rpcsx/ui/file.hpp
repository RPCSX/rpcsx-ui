#pragma once

#include <cstring>
#include <expected>
#include <filesystem>
#include <ios>
#include <span>
#include <string>
#include <string_view>
#include <system_error>
#include <utility>
#include <vector>

namespace rpcsx::ui {
struct ReadableByteStream : std::span<const std::byte> {
  using base = std::span<const std::byte>;
  using base::base;
  using base::operator=;

  bool read(void *dest, std::size_t bytes) {
    if (size() < bytes) {
      return false;
    }

    std::memcpy(dest, data(), bytes);
    *this = subspan(bytes);
    return true;
  }

  template <typename T>
    requires std::is_trivially_copyable_v<T>
  bool read(T &target) {
    return read(&target, sizeof(target));
  }

  template <typename T>
    requires std::is_trivially_copyable_v<T>
  bool read(std::vector<T> &target, std::size_t count) {
    target.resize(count);
    return read(target.data(), sizeof(T) * count);
  }

  bool read(std::string &target, std::size_t count) {
    target.resize(count);
    return read(target.data(), count);
  }
};

struct FileData : std::span<std::byte> {
  struct Impl;

  FileData() = default;
  FileData(const FileData &) = delete;
  FileData &operator=(const FileData &) = delete;
  FileData(FileData &&other) : std::span<std::byte>(other), m_impl(std::exchange(other.m_impl, nullptr)) {
    static_cast<std::span<std::byte> &>(other) = std::span<std::byte>{};
  }

  FileData &operator=(FileData &&other) {
    std::swap(m_impl, other.m_impl);
    std::swap(static_cast<std::span<std::byte> &>(*this),
              static_cast<std::span<std::byte> &>(other));
    return *this;
  }
  ~FileData();

  FileData(Impl *i, std::span<std::byte> data)
      : std::span<std::byte>(data), m_impl(i) {}

private:
  Impl *m_impl = nullptr;
};

struct FileStat {};

struct File {
  struct Impl;

  File() = default;
  File(const File &) = delete;
  File &operator=(const File &) = delete;
  File(File &&other) : m_impl(std::exchange(other.m_impl, nullptr)) {}
  File &operator=(File &&other) {
    std::swap(m_impl, other.m_impl);
    return *this;
  }
  ~File();

  std::expected<FileData, std::error_code> map();

  static std::expected<File, std::error_code>
  open(const std::filesystem::path &path,
       std::ios::openmode mode = std::ios::binary | std::ios::in);

private:
  Impl *m_impl = nullptr;
};
} // namespace rpcsx::ui
