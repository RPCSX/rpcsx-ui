add_library(nlohmann_json INTERFACE)
target_include_directories(nlohmann_json INTERFACE single_include)
add_library(nlohmann::json ALIAS nlohmann_json)
