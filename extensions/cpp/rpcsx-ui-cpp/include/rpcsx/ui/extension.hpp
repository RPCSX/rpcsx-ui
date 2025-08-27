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
  virtual Response<Deactivate> handle(const Request<Deactivate> &) {
    return {};
  }
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

  template <typename ObjectType, typename... Args>
    requires requires {
      std::string_view(ObjectType::kInterfaceId);
      typename ObjectType::Builder;
      typename ObjectType::InterfaceType;
    }
  void createObject(std::string_view name, Args &&...args)
    requires requires { ObjectType(std::forward<Args>(args)...); }
  {
    using InterfaceType = typename ObjectType::InterfaceType;
    this->objectCreate(
        {
            .name = std::string(name),
            .interface = std::string(ObjectType::kInterfaceId),
        },
        [this, args = std::forward_as_tuple<Args...>(std::forward<Args>(
                   args)...)](const ObjectCreateResponse &response) {
          auto object = std::unique_ptr<InterfaceType, void (*)(void *)>(
              static_cast<InterfaceType *>(std::apply(
                  [](auto &&...args) {
                    return new ObjectType(std::forward<Args>(args)...);
                  },
                  args)),
              [](void *object) {
                delete static_cast<ObjectType *>(
                    static_cast<InterfaceType *>(object));
              });

          m_protocol->addObject(
              ObjectType::kInterfaceId,
              &ObjectType::Builder::template build<InterfaceBuilder>,
              response.object, std::move(object));
        });
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
