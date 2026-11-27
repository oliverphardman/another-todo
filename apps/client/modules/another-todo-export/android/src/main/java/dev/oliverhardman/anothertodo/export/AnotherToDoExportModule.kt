package dev.oliverhardman.anothertodo.export

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val CREATE_DOCUMENT = 41720

private class PendingSave(val contents: ByteArray, val promise: Promise)

private class SaveException(cause: Throwable? = null) :
  CodedException("The file could not be saved", cause)

class AnotherToDoExportModule : Module() {
  private var pending: PendingSave? = null

  override fun definition() = ModuleDefinition {
    Name("AnotherToDoExport")

    AsyncFunction("save") { name: String, contentType: String, base64: String, promise: Promise ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      if (pending != null) {
        throw SaveException()
      }
      pending = PendingSave(Base64.decode(base64, Base64.DEFAULT), promise)
      val intent = Intent(Intent.ACTION_CREATE_DOCUMENT)
        .addCategory(Intent.CATEGORY_OPENABLE)
        .setType(contentType)
        .putExtra(Intent.EXTRA_TITLE, name)
      try {
        activity.startActivityForResult(intent, CREATE_DOCUMENT)
      } catch (error: Exception) {
        pending = null
        throw SaveException(error)
      }
    }

    OnActivityResult { _, result ->
      val save = pending
      if (result.requestCode != CREATE_DOCUMENT || save == null) {
        return@OnActivityResult
      }
      pending = null
      val target = result.data?.data
      if (result.resultCode != Activity.RESULT_OK || target == null) {
        save.promise.resolve(false)
      } else {
        write(save, target)
      }
    }
  }

  private fun write(save: PendingSave, target: Uri) {
    try {
      val resolver = appContext.reactContext!!.contentResolver
      resolver.openOutputStream(target, "wt")!!.use { it.write(save.contents) }
      save.promise.resolve(true)
    } catch (error: Exception) {
      save.promise.reject(SaveException(error))
    }
  }
}
