package com.digitalvirgo.galaxytv

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.util.DisplayMetrics
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.databaseEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.loadWithOverviewMode = false
            settings.useWideViewPort = true

            val dm = resources.displayMetrics
            val scale = (dm.widthPixels.toDouble() / (1920.0 * dm.density) * 100.0).toInt()
            setInitialScale(scale)

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean = false

                override fun onPageFinished(view: WebView?, url: String?) {
                    val js = """
                        (function(){
                          var s=document.createElement('style');
                          s.textContent='video,video *{background:black!important}video::-webkit-media-controls,video::-webkit-media-controls-panel,video::-webkit-media-controls-start-playback-button,video::-webkit-media-controls-overlay-enclosure,video::-webkit-media-controls-enclosure{display:none!important;opacity:0!important;-webkit-appearance:none!important}';
                          document.head.appendChild(s);
                          new MutationObserver(function(muts){
                            muts.forEach(function(m){
                              m.addedNodes.forEach(function(n){
                                if(n.nodeName==='VIDEO'){n.removeAttribute('poster');n.controls=false;}
                                if(n.querySelectorAll){n.querySelectorAll('video').forEach(function(v){v.removeAttribute('poster');v.controls=false;});}
                              });
                            });
                          }).observe(document.body,{childList:true,subtree:true});
                          document.querySelectorAll('video').forEach(function(v){v.removeAttribute('poster');v.controls=false;});
                        })();
                    """.trimIndent()
                    view?.evaluateJavascript(js, null)
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    request?.grant(request.resources)
                }

                override fun getDefaultVideoPoster(): Bitmap {
                    return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888).apply {
                        eraseColor(Color.BLACK)
                    }
                }
            }
        }

        setContentView(webView)
        webView.loadUrl("https://tv-vod.blast.dvbuilder.com/")
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
