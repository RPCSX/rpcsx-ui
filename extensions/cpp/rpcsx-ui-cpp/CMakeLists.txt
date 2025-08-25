add_subdirectory(3rdparty/nlohmann_json)

add_library(
    rpcsx-ui-cpp STATIC

    src/extension.cpp
    src/file.cpp
)

target_include_directories(rpcsx-ui-cpp PUBLIC include)
target_link_libraries(rpcsx-ui-cpp PUBLIC nlohmann::json rpcsx::ui)

string(TOLOWER "${CMAKE_SYSTEM_PROCESSOR}" EXTENSION_TRIPLE_ARCH)
string(TOLOWER "${CMAKE_SYSTEM_NAME}" EXTENSION_TRIPLE_OS)

if("${EXTENSION_TRIPLE_OS}" STREQUAL "windows")
    set(EXTENSION_TRIPLE_FORMAT "pe")
else()
    set(EXTENSION_TRIPLE_FORMAT "elf")
endif()

if("${EXTENSION_TRIPLE_ARCH}" STREQUAL "x86_64")
    set(EXTENSION_TRIPLE_ARCH "x64")
endif()

set(EXTENSION_TARGET "${EXTENSION_TRIPLE_FORMAT}-${EXTENSION_TRIPLE_ARCH}-${EXTENSION_TRIPLE_OS}" PARENT_SCOPE)

function(add_rpcsx_extension name version)
    set(EXTENSION_NAME ${name})
    set(EXTENSION_VERSION ${version})
    set(EXTENSION_EXECUTABLE ${EXTENSION_NAME})

    add_executable(${EXTENSION_EXECUTABLE} ${ARGN})
    target_link_libraries(${EXTENSION_EXECUTABLE} PUBLIC rpcsx-ui-cpp)
    target_compile_definitions(${EXTENSION_EXECUTABLE} PUBLIC EXTENSION_NAME="${EXTENSION_NAME}" EXTENSION_VERSION="${EXTENSION_VERSION}")
    set_target_properties(${EXTENSION_EXECUTABLE} PROPERTIES RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin/${EXTENSION_NAME})
    make_directory(${CMAKE_BINARY_DIR}/bin/${EXTENSION_NAME})
    configure_file(extension.json ${CMAKE_BINARY_DIR}/bin/${EXTENSION_NAME})
endfunction()
