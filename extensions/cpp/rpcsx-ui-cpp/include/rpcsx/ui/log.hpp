#pragma once
#include "Protocol.hpp"
#include <cstdarg>

namespace rpcsx::ui {
[[gnu::format(__printf__, 2, 3)]]
inline void log(LogLevel level, const char *fmt, ...) {
  char buffer[256];

  va_list args;
  va_start(args, fmt);
  int written = std::vsnprintf(buffer, sizeof(buffer), fmt, args);
  va_end(args);

  buffer[255] = 0;

  Protocol::getDefault()->sendLogMessage(level, buffer);
}

[[gnu::format(__printf__, 1, 2)]]
inline void ilog(const char *fmt, ...) {
  char buffer[256];

  va_list args;
  va_start(args, fmt);
  int written = std::vsnprintf(buffer, sizeof(buffer), fmt, args);
  va_end(args);

  buffer[255] = 0;

  Protocol::getDefault()->sendLogMessage(LogLevel::Info, buffer);
}

[[gnu::format(__printf__, 1, 2)]]
inline void elog(const char *fmt, ...) {
  char buffer[256];

  va_list args;
  va_start(args, fmt);
  int written = std::vsnprintf(buffer, sizeof(buffer), fmt, args);
  va_end(args);

  buffer[255] = 0;

  Protocol::getDefault()->sendLogMessage(LogLevel::Error, buffer);
}

[[gnu::format(__printf__, 1, 2)]] inline void wlog(const char *fmt, ...) {
  char buffer[256];

  va_list args;
  va_start(args, fmt);
  int written = std::vsnprintf(buffer, sizeof(buffer), fmt, args);
  va_end(args);

  buffer[255] = 0;

  Protocol::getDefault()->sendLogMessage(LogLevel::Warning, buffer);
}

[[gnu::format(__printf__, 1, 2), noreturn]] inline void fatal(const char *fmt,
                                                              ...) {
  char buffer[256];

  va_list args;
  va_start(args, fmt);
  int written = std::vsnprintf(buffer, sizeof(buffer), fmt, args);
  va_end(args);

  buffer[255] = 0;

  Protocol::getDefault()->sendLogMessage(LogLevel::Fatal, buffer);

  std::exit(1);
}
} // namespace rpcsx::ui
