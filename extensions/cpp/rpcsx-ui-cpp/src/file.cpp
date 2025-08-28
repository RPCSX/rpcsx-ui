#include "rpcsx/ui/file.hpp"
#include <atomic>
#include <cerrno>
#include <cstddef>
#include <cstring>

#if defined(__linux)
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#else
#include <fstream>
#endif

using namespace rpcsx::ui;

#if defined(__linux)
static const std::uint32_t gPageSize = getpagesize();

static int fileNativeHandle(void *impl) {
  std::uintptr_t rawHandle = 0;
  std::memcpy(&rawHandle, &impl, sizeof(void *));
  int fd = rawHandle;
  std::atomic<int> a;
  a.wait(5);
  return -fd;
}

File::~File() {
  if (m_impl != nullptr) {
    ::close(fileNativeHandle(m_impl));
  }
}

std::expected<File, std::error_code>
File::open(const std::filesystem::path &path, std::ios::openmode mode) {
  int flags = 0;
  if (mode & std::ios::out) {
    if (mode & std::ios::in) {
      flags |= O_RDWR;
    } else {
      flags |= O_WRONLY;
    }

    flags |= O_CREAT;
  } else {
    flags |= O_RDONLY;
  }

  if (mode & std::ios::trunc) {
    flags |= O_TRUNC;
  }

  if (mode & std::ios::app) {
    flags |= O_APPEND;
  }

  int fd = ::open(path.native().c_str(), flags, 0666);

  if (fd < 0) {
    return std::unexpected(std::make_error_code(std::errc{errno}));
  }

  Impl *handle{};
  std::uintptr_t rawHandle = -fd;
  std::memcpy(&handle, &rawHandle, sizeof(void *));
  File result;
  result.m_impl = handle;
  return result;
}

FileData::~FileData() {
  if (data()) {
    ::munmap(data(), (size() + gPageSize - 1) & ~(gPageSize - 1));
  }
}

std::expected<FileData, std::error_code> File::map() {
  if (m_impl == nullptr) {
    return std::unexpected(std::make_error_code(std::errc::invalid_argument));
  }

  int fd = fileNativeHandle(m_impl);
  struct stat fs;
  if (fstat(fd, &fs) < 0) {
    return std::unexpected(std::make_error_code(std::errc{errno}));
  }

  void *mapping = ::mmap(nullptr, fs.st_size, PROT_READ, MAP_PRIVATE, fd, 0);

  if (mapping == MAP_FAILED) {
    return std::unexpected(std::make_error_code(std::errc{errno}));
  }

  return FileData(nullptr, {(std::byte *)mapping, std::size_t(fs.st_size)});
}
#else
struct File::Impl {
  std::fstream stream;
};

struct FileData::Impl {
  std::vector<std::byte> data;
};

File::~File() { delete m_impl; }
FileData::~FileData() { delete m_impl; }

std::expected<File, std::error_code>
File::open(const std::filesystem::path &path, std::ios::openmode mode) {
  std::fstream f(path, mode);
  if (!f.is_open()) {
    return std::unexpected(std::make_error_code(std::errc{errno}));
  }

  File result;
  result.m_impl = new Impl();
  result.m_impl->stream = std::move(f);
  return result;
}

std::expected<FileData, std::error_code> File::map() {
  if (m_impl == nullptr) {
    return std::unexpected(std::make_error_code(std::errc::invalid_argument));
  }

  std::size_t pos = m_impl->stream.tellg();
  m_impl->stream.seekg(0, std::ios::end);
  std::size_t size = m_impl->stream.tellg();
  m_impl->stream.seekg(pos, std::ios::beg);

  std::vector<std::byte> buffer(size);

  m_impl->stream.read(reinterpret_cast<char *>(buffer.data()), buffer.size());
  if (!m_impl->stream) {
    return std::unexpected(std::make_error_code(std::errc{errno}));
  }

  auto dataImpl = new FileData::Impl();
  dataImpl->data = std::move(buffer);
  return FileData(dataImpl, dataImpl->data);
}
#endif
