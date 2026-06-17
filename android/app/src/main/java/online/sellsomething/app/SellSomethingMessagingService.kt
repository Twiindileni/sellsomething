package online.sellsomething.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class SellSomethingMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        PushTokenStore.token = token
        Log.d(TAG, "FCM token refreshed")
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // When the app is in the foreground, show the notification ourselves.
        // Background / locked screen: FCM displays the notification payload automatically.
        val title = message.notification?.title ?: message.data["title"] ?: "Sell Something"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        if (body.isBlank()) return

        val url = message.data["url"] ?: "/dashboard"
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(MainActivity.EXTRA_OPEN_URL, url)
        }
        val pending = PendingIntent.getActivity(
            this,
            url.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, SellSomethingApp.CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pending)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager?.notify(System.currentTimeMillis().toInt(), notification)
    }

    companion object {
        private const val TAG = "SellSomethingFCM"
    }
}
