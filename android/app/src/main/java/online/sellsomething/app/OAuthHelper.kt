package online.sellsomething.app

import android.app.Activity
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

object OAuthHelper {

    private val SITE_HOSTS = setOf("www.sellsomething.online", "sellsomething.online")

    /** Google & Supabase OAuth must not load inside WebView (Error 403: disallowed_useragent). */
    fun isOAuthUrl(uri: Uri): Boolean {
        val host = uri.host?.lowercase() ?: return false
        val path = uri.path ?: ""

        if (host == "accounts.google.com") return true
        if (host.endsWith("google.com") && (path.contains("oauth") || path.contains("signin"))) {
            return true
        }
        if (host.contains("supabase.co") && path.contains("/auth/v1/")) return true

        return false
    }

    fun isAuthCallback(uri: Uri): Boolean {
        val host = uri.host?.lowercase() ?: return false
        if (host !in SITE_HOSTS) return false
        return uri.path?.startsWith("/auth/callback") == true
    }

    fun openOAuthInCustomTab(activity: Activity, uri: Uri) {
        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
        customTabsIntent.launchUrl(activity, uri)
    }
}
