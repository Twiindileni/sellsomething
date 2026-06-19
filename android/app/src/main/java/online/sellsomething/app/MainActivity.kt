package online.sellsomething.app

import android.annotation.SuppressLint
import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
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
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    companion object {
        const val SITE_URL = "https://www.sellsomething.online"
        const val EXTRA_OPEN_URL = "open_url"
        private val INTERNAL_HOSTS = setOf(
            "www.sellsomething.online",
            "sellsomething.online",
            // Supabase REST only — OAuth URLs open in Chrome Custom Tabs
            "svyivtqdvfigoopwvaly.supabase.co",
        )
    }

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineView: LinearLayout

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris: Array<Uri>? = when {
                result.data?.data != null -> {
                    // Gallery / file picker returned a URI
                    arrayOf(result.data!!.data!!)
                }
                result.data?.clipData != null -> {
                    // Multiple files selected
                    val clip = result.data!!.clipData!!
                    Array(clip.itemCount) { clip.getItemAt(it).uri }
                }
                cameraImageUri != null && result.resultCode == RESULT_OK -> {
                    // Camera returned — image is at cameraImageUri
                    arrayOf(cameraImageUri!!)
                }
                else -> WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            }
            filePathCallback?.onReceiveValue(uris)
            filePathCallback = null
            cameraImageUri = null
        }

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) PushTokenFetcher.fetch { injectPushTokenIntoWebView() }
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

        webView.addJavascriptInterface(PushBridge(), "SellSomethingPush")

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            mediaPlaybackRequiresUserGesture = true
            allowFileAccess = false
            // Required for camera FileProvider content:// URIs returned to WebView
            allowContentAccess = true
        }

        webView.webViewClient = object : WebViewClient() {

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url
                return handleNavigation(url)
            }

            override fun onPageFinished(view: WebView, url: String) {
                swipeRefresh.isRefreshing = false
                progressBar.visibility = View.GONE
                injectPushTokenIntoWebView()
                injectNativeFlags()
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
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

            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams,
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback

                val acceptTypes = params.acceptTypes.joinToString(",")
                val wantsImage = acceptTypes.contains("image") || acceptTypes.isBlank()
                val captureEnabled = params.isCaptureEnabled

                return try {
                    if (wantsImage || captureEnabled) {
                        // Build camera intent via FileProvider (required for Android 7+)
                        val photoFile = createTempImageFile()
                        val photoUri = FileProvider.getUriForFile(
                            this@MainActivity,
                            "${applicationContext.packageName}.fileprovider",
                            photoFile,
                        )
                        cameraImageUri = photoUri

                        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                            putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
                            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                        }

                        // Gallery / file picker fallback
                        val galleryIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                            type = "image/*"
                            addCategory(Intent.CATEGORY_OPENABLE)
                        }

                        val chooser = Intent.createChooser(galleryIntent, "Select or take photo").apply {
                            putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
                        }
                        fileChooserLauncher.launch(chooser)
                    } else {
                        fileChooserLauncher.launch(params.createIntent())
                    }
                    true
                } catch (e: ActivityNotFoundException) {
                    filePathCallback = null
                    cameraImageUri = null
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

        requestPushPermissionAndToken()

        if (savedInstanceState == null) {
            loadInitialUrl(intent)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        loadInitialUrl(intent)
    }

    private fun loadInitialUrl(intent: Intent?) {
        val target = intent?.getStringExtra(EXTRA_OPEN_URL) ?: intent?.data?.toString()
        when {
            target != null -> {
                val fullUrl = if (target.startsWith("http")) target else "$SITE_URL$target"
                webView.loadUrl(fullUrl)
            }
            webView.url.isNullOrBlank() -> webView.loadUrl(SITE_URL)
        }
    }

    /** Route OAuth to Chrome Custom Tab; keep site + auth callback in WebView. */
    private fun handleNavigation(uri: Uri): Boolean {
        val scheme = uri.scheme ?: return false

        if (scheme != "http" && scheme != "https") {
            openExternal(uri)
            return true
        }

        if (OAuthHelper.isOAuthUrl(uri)) {
            OAuthHelper.openOAuthInCustomTab(this, uri)
            return true
        }

        if (OAuthHelper.isAuthCallback(uri)) {
            return false
        }

        val host = uri.host ?: return false
        return if (host in INTERNAL_HOSTS) {
            false
        } else {
            openExternal(uri)
            true
        }
    }

    private fun requestPushPermissionAndToken() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            when {
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED -> PushTokenFetcher.fetch {
                    injectPushTokenIntoWebView()
                }
                else -> notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        } else {
            PushTokenFetcher.fetch { injectPushTokenIntoWebView() }
        }
    }

    private fun injectPushTokenIntoWebView() {
        val token = PushTokenStore.token ?: return
        val safe = token.replace("\\", "\\\\").replace("'", "\\'")
        webView.evaluateJavascript(
            """
            (function(){
              window.__SELLSOMETHING_FCM_TOKEN__='$safe';
              window.dispatchEvent(new CustomEvent('sellsomething-push-token',{detail:'$safe'}));
            })();
            """.trimIndent(),
            null,
        )
    }

    private fun injectNativeFlags() {
        webView.evaluateJavascript(
            """
            (function(){
              window.__SELLSOMETHING_NATIVE_APP__=true;
            })();
            """.trimIndent(),
            null,
        )
    }

    private fun createTempImageFile(): File {
        val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val dir = File(cacheDir, "captured_images").apply { mkdirs() }
        return File(dir, "IMG_$stamp.jpg")
    }

    private fun openExternal(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
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
