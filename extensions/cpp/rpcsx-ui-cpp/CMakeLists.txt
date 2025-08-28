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
    set(EXTENSION_TRIPLE_OS "win32")
else()
    set(EXTENSION_TRIPLE_FORMAT "elf")
endif()

if( "${EXTENSION_TRIPLE_ARCH}" STREQUAL "x86_64" OR "${EXTENSION_TRIPLE_ARCH}" STREQUAL "amd64" )
    set(EXTENSION_TRIPLE_ARCH "x64")
endif()

set(EXTENSION_TARGET "${EXTENSION_TRIPLE_FORMAT}-${EXTENSION_TRIPLE_ARCH}-${EXTENSION_TRIPLE_OS}" PARENT_SCOPE)

function(add_rpcsx_extension name version)
    set(EXTENSION_NAME ${name})
    set(EXTENSION_VERSION ${version})
    set(EXTENSION_EXECUTABLE ${CMAKE_EXECUTABLE_PREFIX}${EXTENSION_NAME}${CMAKE_EXECUTABLE_SUFFIX})

    add_executable(${EXTENSION_NAME} ${ARGN})
    target_link_libraries(${EXTENSION_NAME} PUBLIC rpcsx-ui-cpp)
    target_compile_definitions(${EXTENSION_NAME} PUBLIC EXTENSION_NAME="${EXTENSION_NAME}" EXTENSION_VERSION="${EXTENSION_VERSION}")
    set_target_properties(${EXTENSION_NAME} PROPERTIES RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin/${EXTENSION_NAME})
    set_target_properties(${EXTENSION_NAME} PROPERTIES RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_BINARY_DIR}/bin/${EXTENSION_NAME})
    set_target_properties(${EXTENSION_NAME} PROPERTIES RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_BINARY_DIR}/bin-debug/${EXTENSION_NAME})
    make_directory(${CMAKE_BINARY_DIR}/bin/${EXTENSION_NAME})
    make_directory(${CMAKE_BINARY_DIR}/bin-debug/${EXTENSION_NAME})
    configure_file(extension.json ${CMAKE_BINARY_DIR}/bin/${EXTENSION_NAME})
    configure_file(extension.json ${CMAKE_BINARY_DIR}/bin-debug/${EXTENSION_NAME})
endfunction()
