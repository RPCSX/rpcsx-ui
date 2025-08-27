#pragma once

#include "Transport.hpp"
#include "json.hpp"
#include <functional>
#include <rpcsx-ui.hpp>
#include <string_view>

namespace rpcsx::ui {
struct ExtensionBase;

struct InterfaceBuilder {
  virtual ~InterfaceBuilder() = default;
  virtual void addMethodHandler(std::string_view method,
                                json (*handler)(void *, const json &)) = 0;
  virtual void addNotificationHandler(std::string_view notification,
                                      void (*handler)(void *,
                                                      const json &)) = 0;
};

using ProtocolObject = std::unique_ptr<void, void (*)(void *)>;

class Protocol {
  Transport *mTransport = nullptr;
  ExtensionBase *mHandlers = nullptr;
  std::vector<const char *> mComponents;

public:
  Protocol() = default;
  Protocol(Transport *transport) : mTransport(transport) {}

  template <typename... Components> void registerComponents() {
    (mComponents.push_back(Components::name), ...);
  }

  void setHandlers(ExtensionBase *handlers) { mHandlers = handlers; }
  ExtensionBase &getHandlers() { return *mHandlers; }

  virtual ~Protocol() = default;

  virtual void call(std::string_view method, json params,
                    std::function<void(json)> responseHandler) = 0;
  virtual void notify(std::string_view method, json params) = 0;
  virtual void onEvent(std::string_view method,
                       std::function<void(json)> eventHandler) = 0;
  virtual int processMessages() = 0;
  virtual void sendLogMessage(LogLevel level, std::string_view message) = 0;

  virtual void sendResponse(std::size_t id, json result) = 0;
  virtual void sendErrorResponse(std::size_t id, ErrorInstance error) = 0;
  virtual void sendErrorResponse(ErrorInstance error) = 0;

  virtual void addMethodHandler(
      std::string_view method,
      std::function<void(std::size_t id, json body)> handler) = 0;

  virtual void
  addNotificationHandler(std::string_view notification,
                         std::function<void(json body)> handler) = 0;

  virtual void addObject(std::string_view interfaceName,
                         void (*builder)(InterfaceBuilder &builder),
                         unsigned id, ProtocolObject object) = 0;

  static Protocol *getDefault() { return *getImpl(); }
  static void setDefault(Protocol *protocol) { *getImpl() = protocol; }

  Transport *getTransport() { return mTransport; }

private:
  static Protocol **getImpl() {
    static Protocol *protocol = nullptr;
    return &protocol;
  }
};
} // namespace rpcsx::ui
