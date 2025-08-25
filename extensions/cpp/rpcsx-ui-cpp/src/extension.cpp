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
#include <utility>

using namespace rpcsx::ui;
using namespace nlohmann;

struct StdioTransport : Transport {
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

    auto result = protocol->getHandlers().handle(request);
    if (!result.has_value()) {
      protocol->sendErrorResponse(id, result.error());
      return;
    }

    protocol->sendResponse(id, json(result.value()));
  };
};

template <typename T, typename Protocol>
static auto createNotifyHandler(Protocol *protocol) {
  return [=](json params) {
    typename T::Request request;
    try {
      request = params;
    } catch (const std::exception &) {
      protocol->sendErrorResponse({ErrorCode::InvalidParams});
      return;
    }

    protocol->getHandlers().handle(request);
  };
};

static std::span<const std::byte> asBytes(std::string_view text) {
  return {reinterpret_cast<const std::byte *>(text.data()), text.size()};
}

struct JsonRpcProtocol : Protocol {
  JsonRpcProtocol(Transport *transport) : Protocol(transport) {
    mMethodHandlers["$/initialize"] =
        createMethodHandler<rpcsx::ui::Initialize>(this);
    mMethodHandlers["$/activate"] =
        createMethodHandler<rpcsx::ui::Activate>(this);
    // mMethodHandlers["$/deactivate"] =
    // createMethodHandler<rpcsx::ui::Deactivate>(this);
    mNotifyHandlers["$/shutdown"] =
        createNotifyHandler<rpcsx::ui::Shutdown>(this);
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

  void addNotificationHandler(std::string_view notification,
                              std::function<void(json)> handler) override {
    mNotifyHandlers[std::string(notification)] = std::move(handler);
  }

  void
  addMethodHandler(std::string_view method,
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

        sendErrorResponse(id, {ErrorCode::MethodNotFound});
        return;
      }

      if (auto it = mNotifyHandlers.find(method); it != mNotifyHandlers.end()) {
        it->second(params);
        return;
      }

      sendErrorResponse({ErrorCode::MethodNotFound});
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

  std::map<std::string, std::function<void(std::size_t, json)>> mMethodHandlers;
  std::map<std::string, std::function<void(json)>> mNotifyHandlers;
  std::map<std::string, std::vector<std::function<void(json)>>> mEventHandlers;
  std::map<std::size_t, std::function<void(json)>> mExpectedResponses;
  std::size_t mNextId = 1;
};

ExtensionBuilder extension_main();

int main(int argc, const char *argv[]) {
  auto extensionBuilder = extension_main();

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
  auto exptension = extensionBuilder(protocol.get());
  return protocol->processMessages();
}

