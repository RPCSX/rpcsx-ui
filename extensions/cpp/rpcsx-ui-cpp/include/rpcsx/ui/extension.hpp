#pragma once

#include "Protocol.hpp" // IWYU pragma: export
#include <expected>
#include <rpcsx-ui.hpp>

namespace rpcsx::ui {
template <typename T>
using Response = std::expected<typename T::Response, ErrorInstance>;
template <typename T> using Request = T::Request;

struct ExtensionBase {
  virtual ~ExtensionBase() = default;
  virtual Response<Initialize> handle(const Request<Initialize> &) {
    return {};
  }
  virtual Response<Activate> handle(const Request<Activate> &) { return {}; }
  virtual Response<Shutdown> handle(const Request<Shutdown> &) { return {}; }
};

template <typename... Components>
class Extension
    : public ExtensionBase,
      public Core::instance<Extension<Components...>>,
      public Components::template instance<Extension<Components...>>... {
  Protocol *m_protocol = nullptr;

public:
  using Base = Extension;
  Extension() = default;
  Extension(Protocol *protocol) : m_protocol(protocol) {
    m_protocol->template registerComponents<Components...>();
    m_protocol->setHandlers(this);
  }

  Protocol &getProtocol() const { return *m_protocol; }
};

using ExtensionBuilder =
    std::function<std::unique_ptr<ExtensionBase>(Protocol *)>;

template <typename T> ExtensionBuilder createExtension() {
  auto builder = [](Protocol *protocol) {
    return std::make_unique<T>(protocol);
  };

  return builder;
}
} // namespace rpcsx::ui
