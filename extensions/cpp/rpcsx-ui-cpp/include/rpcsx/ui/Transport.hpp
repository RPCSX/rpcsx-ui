#pragma once
#include <span>

namespace rpcsx::ui {
class Transport {
public:
  virtual ~Transport() = default;
  virtual void write(std::span<const std::byte> bytes) = 0;
  virtual void read(std::span<std::byte> &bytes) = 0;
  virtual void flush() {}
};
} // namespace rpcsx::ui
