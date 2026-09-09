package online.sellsomething.app

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val splashLogo: ImageView = findViewById(R.id.splashLogo)

        // Professional Animation: Fade in and gently scale up
        splashLogo.animate()
            .alpha(1f)
            .scaleX(1.1f)
            .scaleY(1.1f)
            .setDuration(1200)
            .withEndAction {
                // Wait a tiny bit after animation finishes before launching MainActivity
                Handler(Looper.getMainLooper()).postDelayed({
                    startActivity(Intent(this, MainActivity::class.java))
                    overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                    finish()
                }, 500)
            }
            .start()
    }
}
