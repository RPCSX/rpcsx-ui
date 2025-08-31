package net.rpcsx.extensionloader

import androidx.annotation.Keep
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL


class ExtensionLoaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExtensionLoader")

    AsyncFunction("loadExtension") { path: String, promise: Promise ->
      promise.resolve(loadExtension(path))
    }

    AsyncFunction("unloadExtension") { id: Int, promise: Promise ->
      unloadExtension(id)
      promise.resolve()
    }

    AsyncFunction("call") { extension: Int, method: String, params: ByteArray, promise: Promise ->
      promise.resolve(call(extension, method, params))
    }

    AsyncFunction("notify") { extension: Int, notification: String, params: ByteArray, promise: Promise ->
      notify(extension, notification, params)
      promise.resolve()
    }

    AsyncFunction("sendResponse") { methodId: Int, body: ByteArray, promise: Promise ->
      sendResponse(methodId, body)
      promise.resolve()
    }
  }

  private external fun loadExtension(path: String): Int
  private external fun unloadExtension(id: Int)
  private external fun call(extension: Int, method: String, params: ByteArray): ByteArray
  private external fun notify(extension: Int, notification: String, params: ByteArray)
  private external fun sendResponse(methodId: Int, body: ByteArray)

  companion object {
    @Keep
    @JvmStatic
    fun call(methodId: Int, method: String, params: ByteArray) {
      // FIXME: implement
    }

    @Keep
    @JvmStatic
    fun notify(method: String, params: ByteArray) {
      // FIXME: implement
    }

    init {
      System.loadLibrary("extension-loader")
    }
  }
}
