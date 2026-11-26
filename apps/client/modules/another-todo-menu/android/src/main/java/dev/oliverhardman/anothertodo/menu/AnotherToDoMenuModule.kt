package dev.oliverhardman.anothertodo.menu

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.text.SpannableString
import android.text.style.ForegroundColorSpan
import android.view.Menu
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.PopupMenu
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

private const val DESTRUCTIVE_COLOR = "#d13438"

class AnotherToDoMenuModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AnotherToDoMenu")

    AsyncFunction("show") { items: String, x: Double, y: Double, promise: Promise ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      present(activity, JSONArray(items), x, y, promise)
    }.runOnQueue(Queues.MAIN)
  }

  private fun present(activity: Activity, items: JSONArray, x: Double, y: Double, promise: Promise) {
    val root = activity.findViewById<ViewGroup>(android.R.id.content)
    val density = activity.resources.displayMetrics.density
    val anchor = View(activity)
    val position = FrameLayout.LayoutParams(1, 1).apply {
      leftMargin = (x * density).toInt()
      topMargin = (y * density).toInt()
    }
    root.addView(anchor, position)
    val popup = PopupMenu(activity, anchor)
    val keys = mutableListOf<String>()
    var chosen: String? = null
    populate(popup.menu, items, keys)
    popup.setOnMenuItemClickListener { item ->
      if (!item.hasSubMenu()) {
        chosen = keys[item.itemId]
      }
      true
    }
    popup.setOnDismissListener {
      anchor.post { root.removeView(anchor) }
      anchor.post { promise.resolve(chosen) }
    }
    anchor.post { popup.show() }
  }

  private fun populate(menu: Menu, items: JSONArray, keys: MutableList<String>) {
    var group = 0
    for (index in 0 until items.length()) {
      val entry = items.getJSONObject(index)
      val kind = entry.getString("kind")
      if (kind == "separator") {
        group += 1
        continue
      }
      val id = keys.size
      keys.add(entry.getString("key"))
      val label = entry.getString("label")
      if (kind == "submenu") {
        populate(menu.addSubMenu(group, id, Menu.NONE, label), entry.getJSONArray("children"), keys)
        continue
      }
      val title = SpannableString(label)
      if (entry.optBoolean("destructive")) {
        title.setSpan(ForegroundColorSpan(Color.parseColor(DESTRUCTIVE_COLOR)), 0, title.length, 0)
      }
      val item = menu.add(group, id, Menu.NONE, title)
      item.isEnabled = !entry.optBoolean("disabled")
      if (entry.optBoolean("checked")) {
        item.isCheckable = true
        item.isChecked = true
      }
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      menu.setGroupDividerEnabled(true)
    }
  }
}
