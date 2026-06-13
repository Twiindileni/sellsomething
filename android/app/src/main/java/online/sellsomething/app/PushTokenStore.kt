package online.sellsomething.app

/** Latest FCM registration token — shared between service, WebView bridge, and activity. */
object PushTokenStore {
    @Volatile
    var token: String? = null
}
