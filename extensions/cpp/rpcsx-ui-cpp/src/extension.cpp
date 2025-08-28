#include "rpcsx/ui/extension.hpp"
#include "rpcsx/ui/Protocol.hpp"
#include "rpcsx/ui/Transport.hpp"
#include <charconv>
#include <cstddef>
#include <cstdio>
#include <exception>
#include <functional>
#include <map>
#include <memory>
#include <nlohmann/json.hpp>
#include <rpcsx-ui.hpp>
#include <string>
#include <string_view>
#include <unordered_map>
#include <utility>

#ifdef _WIN32
#include <fcntl.h>
#include <io.h>
#endif

using namespace rpcsx::ui;
using namespace nlohmann;

struct StdioTransport : Transport {
#ifdef _WIN32
  StdioTransport() {
    _setmode(_fileno(stdin), _O_BINARY);
    _setmode(_fileno(stdout), _O_BINARY);
    _setmode(_fileno(stderr), _O_BINARY);
  }
#endif

  void write(std::span<const std::byte> bytes) override {
    while (true) {
      auto count = std::fwrite(bytes.data(), 1, bytes.size(), stdout);

      if (count <= 0) {
        break;
      }

      if (count == bytes.size()) {
        break;
      }

      bytes = bytes.subspan(count);
    }
  }

  void read(std::span<std::byte> &bytes) override {
    auto count = std::fread(bytes.data(), 1, bytes.size(), stdin);
    bytes = bytes.subspan(0, count);
  }

  void flush() override { std::fflush(stdout); }
};

template <typename T, typename Protocol>
static auto createMethodHandler(Protocol *protocol) {
  return [=](std::size_t id, json params) {
    typename T::Request request;
    try {
      request = params;
    } catch (const std::exception &) {
      protocol->sendErrorResponse(id, {ErrorCode::InvalidParams});
      return;
    }

    auto result = protocol->handle(request);
    if (!result.has_value()) {
      protocol->sendErrorResponse(id, result.error());
      return;
    }

    protocol->sendResponse(id, json(result.value()));
  };
};

template <typename T, typename Protocol>
  requires(!requires { typename T::Response; })
static auto createNotifyHandler(Protocol *protocol) {
  return [=](json params) {
    typename T::Request request;
    try {
      request = params;
    } catch (const std::exception &) {
      protocol->sendErrorResponse({ErrorCode::InvalidParams});
      return;
    }

    protocol->handle(request);
  };
};

static std::span<const std::byte> asBytes(std::string_view text) {
  return {reinterpret_cast<const std::byte *>(text.data()), text.size()};
}

struct JsonRpcInterface {
  std::map<std::string_view, json (*)(void *, const json &)> methods;
  std::map<std::string_view, void (*)(void *, const json &)> notifications;

  json call(ProtocolObject &object, std::string_view method,
            const json &params) {
    auto methodPtr = methods.at(method);

    return methodPtr(object.get(), params);
  }
  void notify(ProtocolObject &object, std::string_view notification,
              const json &params) {
    auto methodPtr = notifications.at(notification);

    methodPtr(object.get(), params);
  }
};

struct JsonRpcInterfaceBuilder : InterfaceBuilder {
  JsonRpcInterface &result;

  JsonRpcInterfaceBuilder(JsonRpcInterface &interface) : result(interface) {}

  void addMethodHandler(std::string_view method,
                        json (*handler)(void *, const json &)) {
    result.methods[method] = handler;
  }

  void addNotificationHandler(std::string_view notification,
                              void (*handler)(void *, const json &)) {
    result.notifications[notification] = handler;
  }
};

struct JsonRpcProtocol : Protocol {
  std::map<std::string_view, JsonRpcInterface> interfaces;
  std::unordered_map<unsigned, std::pair<ProtocolObject, JsonRpcInterface *>>
      objects;

  JsonRpcProtocol(Transport *transport) : Protocol(transport) {
    mMethodHandlers["$/initialize"] = createMethodHandler<Initialize>(this);
    mMethodHandlers["$/activate"] = createMethodHandler<Activate>(this);
    mMethodHandlers["$/deactivate"] = createMethodHandler<Deactivate>(this);
    mMethodHandlers["$/shutdown"] = createMethodHandler<Shutdown>(this);

    mMethodHandlers["$/object/call"] = createMethodHandler<ObjectCall>(this);
    mNotifyHandlers["$/object/notify"] =
        createNotifyHandler<ObjectNotify>(this);
    mMethodHandlers["$/object/destroy"] =
        createMethodHandler<ObjectDestroy>(this);
  }

  Response<Initialize> handle(const Request<Initialize> &request) {
    return getHandlers().handle(request);
  }
  Response<Activate> handle(const Request<Activate> &request) {
    return getHandlers().handle(request);
  }
  Response<Deactivate> handle(const Request<Deactivate> &request) {
    return getHandlers().handle(request);
  }
  Response<Shutdown> handle(const Request<Shutdown> &request) {
    return getHandlers().handle(request);
  }

  std::expected<json, ErrorInstance> handle(const Request<ObjectCall> &request) {
    auto it = objects.find(request.object);
    if (it != objects.end()) {
      auto &[object, interface] = it->second;
      return interface->call(object, request.method, request.params);
    }

    return {};
  }

  void handle(const Request<ObjectNotify> &request) {
    auto it = objects.find(request.object);
    if (it != objects.end()) {
      auto &[object, interface] = it->second;
      interface->notify(object, request.notification, request.params);
    }
  }

  Response<ObjectDestroy> handle(const Request<ObjectDestroy> &request) {
    objects.erase(request.object);
    return {};
  }

  void addObject(std::string_view interfaceName,
                 void (*builder)(InterfaceBuilder &builder), unsigned id,
                 ProtocolObject object) override {
    auto [it, inserted] = interfaces.emplace(interfaceName, JsonRpcInterface{});

    if (inserted) {
      JsonRpcInterfaceBuilder interfaceBuilder(it->second);
      builder(interfaceBuilder);
    }

    objects.emplace(id, std::pair{std::move(object), &it->second});
  }

  void call(std::string_view method, json params,
            std::function<void(json)> responseHandler) override {
    std::size_t id = mNextId++;
    send({
        {"jsonrpc", "2.0"},
        {"method", method},
        {"params", std::move(params)},
        {"id", id},
    });

    mExpectedResponses.emplace(id, std::move(responseHandler));
  }

  void notify(std::string_view method, json params) override {
    send({
        {"jsonrpc", "2.0"},
        {"method", method},
        {"params", std::move(params)},
    });
  }

  void sendResponse(std::size_t id, json result) override {
    send({
        {"jsonrpc", "2.0"},
        {"id", id},
        {"result", std::move(result)},
    });
  }
  void sendErrorResponse(std::size_t id, ErrorInstance error) override {
    send({
        {"jsonrpc", "2.0"},
        {"id", id},
        {"error", error},
    });
  }
  void sendErrorResponse(ErrorInstance error) override {
    send({
        {"jsonrpc", "2.0"},
        {"id", nullptr},
        {"error", error},
    });
  }

  void
  addNotificationHandler(std::string_view notification,
                         std::function<void(json)> handler) override {
    mNotifyHandlers[std::string(notification)] = std::move(handler);
  }

  void addMethodHandler(
      std::string_view method,
      std::function<void(std::size_t, json)> handler) override {
    mMethodHandlers[std::string(method)] = std::move(handler);
  }

  void onEvent(std::string_view method,
               std::function<void(json)> eventHandler) override {
    mEventHandlers[std::string(method)].push_back(std::move(eventHandler));
  }

  void sendLogMessage(LogLevel level, std::string_view message) override {
    // FIXME
    std::fprintf(stderr, "%s\n", std::string(message).c_str());
  }

  int processMessages() override {
    std::string header;
    std::vector<std::byte> buffer;

    while (true) {
      header.clear();

      while (true) {
        std::byte b;
        std::span bytes = {&b, 1};
        getTransport()->read(bytes);
        if (!bytes.empty()) {
          header += static_cast<char>(b);
        }

        if (header.ends_with("\r\n\r\n")) {
          break;
        }
      }

      constexpr std::string_view contentLength = "Content-Length:";
      auto contentLengthPos = header.find_first_of(contentLength);
      if (contentLengthPos == std::string_view::npos) {
        continue;
      }

      std::string_view lengthString = std::string_view(header).substr(
          contentLengthPos + contentLength.size());

      auto lineEnd = lengthString.find_first_of("\r\n");
      if (lineEnd == std::string_view::npos) {
        continue;
      }

      lengthString = lengthString.substr(0, lineEnd);

      while (lengthString.starts_with(' ')) {
        lengthString.remove_prefix(1);
      }

      std::size_t length = 0;
      auto [ptr, ec] =
          std::from_chars(lengthString.data(),
                          lengthString.data() + lengthString.size(), length);

      if (ec != std::errc{} ||
          ptr != lengthString.data() + lengthString.size()) {
        continue;
      }

      buffer.resize(length);

      std::span bytes = {buffer};
      getTransport()->read(bytes);

      if (bytes.size() != buffer.size()) {
        std::fprintf(stderr, "input truncated\n");
        std::abort();
      }

      std::string_view content = {
          (char *)buffer.data(),
          buffer.size(),
      };

      handleRequest(json::parse(content));
    }

    return 0;
  }

  void handleRequest(json message) {
    auto handlers = getHandlers();

    if (auto it = message.find("method"); it != message.end()) {
      std::string method = it.value();
      std::size_t id = 0;
      bool hasId = false;

      if (auto it = message.find("id"); it != message.end()) {
        hasId = true;
        id = it.value();
      }

      json params;

      if (auto it = message.find("params"); it != message.end()) {
        params = it.value();
      }

      if (hasId) {
        if (auto it = mMethodHandlers.find(method);
            it != mMethodHandlers.end()) {
          it->second(id, params);
          return;
        }

        sendErrorResponse(id, {ErrorCode::MethodNotFound, method});
        return;
      }

      if (auto it = mNotifyHandlers.find(method); it != mNotifyHandlers.end()) {
        it->second(params);
        return;
      }

      sendErrorResponse({ErrorCode::MethodNotFound, method});
      return;
    }

    if (auto it = message.find("result"); it != message.end()) {
      json result = it.value();
      bool hasId = false;
      std::size_t id = 0;

      if (auto it = message.find("id"); it != message.end()) {
        hasId = true;
        id = it.value();
      }

      if (!hasId) {
        return;
      }

      if (auto it = mExpectedResponses.find(id);
          it != mExpectedResponses.end()) {
        auto impl = std::move(it->second);
        mExpectedResponses.erase(it);
        impl(result);
      }
    }
  }

private:
  void send(json body) {
    std::string bodyText = body.dump();
    std::string header = "Content-Length: ";
    header += std::to_string(bodyText.length());
    header += "\r\n\r\n";

    getTransport()->write(asBytes(header));
    getTransport()->write(asBytes(bodyText));
    getTransport()->flush();
  }

  std::map<std::string, std::function<void(std::size_t, json)>>
      mMethodHandlers;
  std::map<std::string, std::function<void(json)>> mNotifyHandlers;
  std::map<std::string, std::vector<std::function<void(json)>>>
      mEventHandlers;
  std::map<std::size_t, std::function<void(json)>> mExpectedResponses;
  std::size_t mNextId = 1;
};

ExtensionBuilder extension_main(int argc, const char *argv[]);

int main(int argc, const char *argv[]) {
  auto extensionBuilder = extension_main(argc, argv);

  std::string_view transportId;
  std::string_view protocolId;

  for (int i = 1; i < argc - 1; ++i) {
    if (argv[i] == std::string_view("--rpcsx-ui/transport")) {
      transportId = argv[i + 1];
      ++i;

      continue;
    }

    if (argv[i] == std::string_view("--rpcsx-ui/protocol")) {
      protocolId = argv[i + 1];
      ++i;

      continue;
    }
  }

  if (transportId.empty()) {
    transportId = "stdio";
  }

  if (protocolId.empty()) {
    protocolId = "json-rpc";
  }

  std::unique_ptr<Transport> transport;

  if (transportId == "stdio") {
    transport = std::make_unique<StdioTransport>();
  } else {
    return 1;
  }

  std::unique_ptr<Protocol> protocol;

  if (protocolId == "json-rpc") {
    protocol = std::make_unique<JsonRpcProtocol>(transport.get());
  } else {
    return 1;
  }

  Protocol::setDefault(protocol.get());
  auto extension = extensionBuilder(protocol.get());
  return protocol->processMessages();
}
