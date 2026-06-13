package online.sellsomething.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    companion object {
        const val SITE_URL = "https://www.sellsomething.online"
        private val INTERNAL_HOSTS = setOf(
            "www.sellsomething.online",
            "sellsomething.online",
            "svyivtqdvfigoopwvaly.supabase.co",
            "accounts.google.com",
        )
    }

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineView: LinearLayout

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            filePathCallback?.onReceiveValue(uris)
            filePathCallback = null
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        progressBar = findViewById(R.id.progressBar)
        offlineView = findViewById(R.id.offlineView)
        val retryButton: Button = findViewById(R.id.retryButton)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true          // required for Supabase auth session
            databaseEnabled = true
            loadsImagesAutomatically = true
            mediaPlaybackRequiresUserGesture = true
            allowFileAccess = false
            allowContentAccess = false
        }

        webView.webViewClient = object : WebViewClient() {

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url
                val scheme = url.scheme ?: return false

                // mailto:, tel:, whatsapp:, intent: → hand off to other apps
                if (scheme != "http" && scheme != "https") {
                    openExternal(url)
                    return true
                }

                // Keep our site + auth flows inside the app, everything else in browser
                return if (url.host in INTERNAL_HOSTS) {
                    false
                } else {
                    openExternal(url)
                    true
                }
            }

            override fun onPageFinished(view: WebView, url: String) {
                swipeRefresh.isRefreshing = false
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                // Only treat main-frame failures as "offline"
                if (request.isForMainFrame) {
                    offlineView.visibility = View.VISIBLE
                    webView.visibility = View.GONE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {

            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
            }

            // Image upload for listings / avatars
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams,
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                return try {
                    fileChooserLauncher.launch(params.createIntent())
                    true
                } catch (e: ActivityNotFoundException) {
                    filePathCallback = null
                    false
                }
            }
        }

        swipeRefresh.setColorSchemeResources(R.color.accent)
        swipeRefresh.setOnRefreshListener { webView.reload() }

        retryButton.setOnClickListener {
            offlineView.visibility = View.GONE
            webView.visibility = View.VISIBLE
            webView.reload()
        }

        // Hardware back navigates web history before exiting the app
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        if (savedInstanceState == null) {
            // Support deep links (https://www.sellsomething.online/...)
            val deepLink = intent?.data?.toString()
            webView.loadUrl(deepLink ?: SITE_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    private fun openExternal(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            // No app can handle the link — ignore
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
