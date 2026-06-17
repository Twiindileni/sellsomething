package online.sellsomething.app

import android.webkit.JavascriptInterface

/** Exposes the FCM token to the embedded website (window.SellSomethingPush). */
class PushBridge {
    @JavascriptInterface
    fun getToken(): String? = PushTokenStore.token
}
