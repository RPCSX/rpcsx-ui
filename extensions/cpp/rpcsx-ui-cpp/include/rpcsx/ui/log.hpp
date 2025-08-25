#pragma once
#include "Protocol.hpp"
#include <format>

namespace rpcsx::ui {
template <typename... Args>
void log(LogLevel level, std::format_string<Args...> fmt, Args &&...args) {
  Protocol::getDefault()->sendLogMessage(
      level, std::vformat(fmt.get(), std::make_format_args(args...)));
}

template <typename... Args>
void ilog(std::format_string<Args...> fmt, Args &&...args) {
  Protocol::getDefault()->sendLogMessage(
      LogLevel::Info, std::vformat(fmt.get(), std::make_format_args(args...)));
}

template <typename... Args>
void elog(std::format_string<Args...> fmt, Args &&...args) {
  Protocol::getDefault()->sendLogMessage(
      LogLevel::Error, std::vformat(fmt.get(), std::make_format_args(args...)));
}

template <typename... Args>
void wlog(std::format_string<Args...> fmt, Args &&...args) {
  Protocol::getDefault()->sendLogMessage(
      LogLevel::Warning,
      std::vformat(fmt.get(), std::make_format_args(args...)));
}

template <typename... Args>
[[noreturn]] void fatal(std::format_string<Args...> fmt, Args &&...args) {
  Protocol::getDefault()->sendLogMessage(
      LogLevel::Fatal, std::vformat(fmt.get(), std::make_format_args(args...)));

  std::exit(1);
}
} // namespace rpcsx::ui
