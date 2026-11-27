package dev.oliverhardman.anothertodo.images

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.media.ExifInterface
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.roundToInt

private const val SAMPLE_SIZE = 32
private const val DECODE_SIZE = 256

class AnotherToDoImagesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AnotherToDoImages")

    AsyncFunction("averageColor") { url: String, from: Double, to: Double ->
      averageColor(URL(url).openStream().use { it.readBytes() }, from, to)
    }
  }

  private fun averageColor(data: ByteArray, from: Double, to: Double): String? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(data, 0, data.size, bounds)
    val options = BitmapFactory.Options().apply {
      inSampleSize = maxOf(1, maxOf(bounds.outWidth, bounds.outHeight) / DECODE_SIZE)
    }
    val decoded = BitmapFactory.decodeByteArray(data, 0, data.size, options) ?: return null
    val sample = Bitmap.createScaledBitmap(decoded, SAMPLE_SIZE, SAMPLE_SIZE, true)
    val orientation = ExifInterface(data.inputStream())
      .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    val first = floor(from * SAMPLE_SIZE).toInt()
    val last = ceil(to * SAMPLE_SIZE).toInt()
    var red = 0
    var green = 0
    var blue = 0
    for (row in first until last) {
      for (column in 0 until SAMPLE_SIZE) {
        val (x, y) = stored(column, row, orientation)
        val pixel = sample.getPixel(x, y)
        red += Color.red(pixel)
        green += Color.green(pixel)
        blue += Color.blue(pixel)
      }
    }
    val count = ((last - first) * SAMPLE_SIZE).toDouble()
    return "#%02x%02x%02x".format(
      (red / count).roundToInt(),
      (green / count).roundToInt(),
      (blue / count).roundToInt(),
    )
  }

  private fun stored(column: Int, row: Int, orientation: Int): Pair<Int, Int> {
    val end = SAMPLE_SIZE - 1
    return when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> Pair(end - column, row)
      ExifInterface.ORIENTATION_ROTATE_180 -> Pair(end - column, end - row)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> Pair(column, end - row)
      ExifInterface.ORIENTATION_TRANSPOSE -> Pair(row, column)
      ExifInterface.ORIENTATION_ROTATE_90 -> Pair(row, end - column)
      ExifInterface.ORIENTATION_TRANSVERSE -> Pair(end - row, end - column)
      ExifInterface.ORIENTATION_ROTATE_270 -> Pair(end - row, column)
      else -> Pair(column, row)
    }
  }
}
