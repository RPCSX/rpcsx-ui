#include <jni.h>
#include <unordered_map>
#include <utility>
#include <dlfcn.h>
#include <string_view>
#include <string>

struct ExtensionOps {
    std::string (*call)(std::string_view method, std::string_view params);
    void (*notify)(std::string_view method, std::string_view params);
};

class Extension {
    void *handle = nullptr;
    ExtensionOps ops{};

public:
    Extension(void *handle, ExtensionOps ops) : handle(handle), ops(ops) {}

    Extension() = default;
    Extension(const Extension &) = delete;
    Extension& operator=(const Extension &) = delete;
    Extension(Extension &&other) noexcept { other.swap(*this); }
    Extension& operator=(Extension &&other) noexcept {
        other.swap(*this);
        return *this;
    }

    void swap(Extension &other) noexcept {
        std::swap(handle, other.handle);
        std::swap(ops, other.ops);
    }

    ~Extension() {
        if (handle != nullptr) {
            dlclose(handle);
        }
    }

    std::string call(std::string_view method, std::string_view params) {
        return ops.call(method, params);
    }

    void notify(std::string_view method, std::string_view params) {
        ops.notify(method, params);
    }
};


static std::string handle_call(std::string_view method, std::string_view params) {
    return {};
}

static void handle_notify(std::string_view method, std::string_view params) {

}

static ExtensionOps selfOps = {
        .call = handle_call,
        .notify = handle_notify,
};

static std::unordered_map<jint, Extension> extensions;
static jint nextExtensionId = 0;

static std::string unwrap(JNIEnv *env, jstring string) {
    auto resultBuffer = env->GetStringUTFChars(string, nullptr);
    std::string result(resultBuffer);
    env->ReleaseStringUTFChars(string, resultBuffer);
    return result;
}
static jstring wrap(JNIEnv *env, const std::string &string) {
    return env->NewStringUTF(string.c_str());
}
static jstring wrap(JNIEnv *env, const char *string) {
    return env->NewStringUTF(string);
}
static jbyteArray createByteArray(JNIEnv *env, const jbyte *bytes, std::size_t size) {
    jbyteArray newArray = env->NewByteArray(size);
    env->SetByteArrayRegion(newArray, 0, size, bytes);
    return newArray;
}
static jbyteArray createByteArray(JNIEnv *env, std::string_view string) {
    return createByteArray(env, reinterpret_cast<const jbyte *>(string.data()), string.length());
}

extern "C"
JNIEXPORT jint JNICALL
Java_net_rpcsx_extensionloader_ExtensionLoaderModule_loadExtension(JNIEnv *env, jobject thiz,
                                                                   jstring path) {
    void* handle = dlopen(unwrap(env, path).c_str(), RTLD_LOCAL | RTLD_NOW);
    if (handle == nullptr) {
        return -1;
    }

    auto rpcsx_ui__extension_initialize= dlsym(handle, "rpcsx_ui__extension_initialize");
    auto rpcsx_ui__extension_call= dlsym(handle, "rpcsx_ui__extension_call");
    auto rpcsx_ui__extension_notify= dlsym(handle, "rpcsx_ui__extension_notify");

    if (rpcsx_ui__extension_initialize == nullptr ||
        rpcsx_ui__extension_call == nullptr ||
        rpcsx_ui__extension_notify == nullptr) {
        ::dlclose(handle);
        return -1;
    }

    auto rpcsx_ui__extension_initialize_fn = reinterpret_cast<void(*)(ExtensionOps *)>(rpcsx_ui__extension_initialize);

    ExtensionOps extensionOps {
        .call = reinterpret_cast<decltype(ExtensionOps::call)>(rpcsx_ui__extension_call),
        .notify = reinterpret_cast<decltype(ExtensionOps::notify)>(rpcsx_ui__extension_notify),
    };

    rpcsx_ui__extension_initialize_fn(&selfOps);

    auto id = nextExtensionId++;
    extensions[id] = Extension( handle, extensionOps );
    return id;
}

extern "C"
JNIEXPORT void JNICALL
Java_net_rpcsx_extensionloader_ExtensionLoaderModule_unloadExtension(JNIEnv *env, jobject thiz,
                                                                     jint id) {
    extensions.erase(id);
}
extern "C"
JNIEXPORT jbyteArray JNICALL
Java_net_rpcsx_extensionloader_ExtensionLoaderModule_call(JNIEnv *env, jobject thiz, jint extension,
                                                          jstring method, jbyteArray params) {
    auto it = extensions.find(extension);
    if (it == extensions.end()) {
      return createByteArray(env, R"json({ "error": { "code": -326001, "message": "Extension not found" } })json");
    }

    jbyte* paramsBytes = env->GetByteArrayElements(params, nullptr);
    jsize paramsLength = env->GetArrayLength(params);
    auto result = it->second.call(unwrap(env, method), std::string_view(reinterpret_cast<const char *>(paramsBytes), paramsLength));
    env->ReleaseByteArrayElements( params, paramsBytes, 0);

    return createByteArray(env, result);
}
extern "C"
JNIEXPORT void JNICALL
Java_net_rpcsx_extensionloader_ExtensionLoaderModule_notify(JNIEnv *env, jobject thiz,
                                                            jint extension, jstring notification,
                                                            jbyteArray params) {
    auto it = extensions.find(extension);
    if (it == extensions.end()) {
        return;
    }

    jbyte* paramsBytes = env->GetByteArrayElements(params, nullptr);
    jsize paramsLength = env->GetArrayLength(params);
    it->second.notify(unwrap(env, notification), std::string_view(reinterpret_cast<const char *>(paramsBytes), paramsLength));
    env->ReleaseByteArrayElements( params, paramsBytes, 0);
}
extern "C"
JNIEXPORT void JNICALL
Java_net_rpcsx_extensionloader_ExtensionLoaderModule_sendResponse(JNIEnv *env, jobject thiz,
                                                                  jint method_id, jbyteArray body) {
    // TODO: implement sendResponse()
}
