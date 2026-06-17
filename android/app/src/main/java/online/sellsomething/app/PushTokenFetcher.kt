package online.sellsomething.app

import com.google.firebase.messaging.FirebaseMessaging

object PushTokenFetcher {
    fun fetch(onReady: (() -> Unit)? = null) {
        try {
            FirebaseMessaging.getInstance().token
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        PushTokenStore.token = task.result
                    }
                    onReady?.invoke()
                }
        } catch (_: Exception) {
            onReady?.invoke()
        }
    }
}
