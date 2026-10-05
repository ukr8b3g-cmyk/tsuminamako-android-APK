package com.namakotsumi.prototype;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final String HOST="appassets.androidplatform.net";
    private static final String ENTRY="https://"+HOST+"/assets/site/index.html";
    private WebView web;
    private boolean ready=false,foreground=true;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(10,24,34));
        getWindow().setNavigationBarColor(Color.rgb(10,24,34));
        if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
        else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(10,24,34));
        root.setOnApplyWindowInsetsListener((view,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());view.setPadding(safe.left,safe.top,safe.right,safe.bottom);}
            else{int l=insets.getSystemWindowInsetLeft(),t=insets.getSystemWindowInsetTop(),r=insets.getSystemWindowInsetRight(),b=insets.getSystemWindowInsetBottom();
                if(Build.VERSION.SDK_INT>=28&&insets.getDisplayCutout()!=null){l=Math.max(l,insets.getDisplayCutout().getSafeInsetLeft());t=Math.max(t,insets.getDisplayCutout().getSafeInsetTop());r=Math.max(r,insets.getDisplayCutout().getSafeInsetRight());b=Math.max(b,insets.getDisplayCutout().getSafeInsetBottom());}view.setPadding(l,t,r,b);}
            return insets;
        });
        web=new WebView(this);web.setBackgroundColor(Color.rgb(10,24,34));
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setTextZoom(100);
        if(Build.VERSION.SDK_INT>=33)settings.setAlgorithmicDarkeningAllowed(false);else if(Build.VERSION.SDK_INT>=29)settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        WebView.setWebContentsDebuggingEnabled(true); // Test APK. No remote content or JS-to-Java bridge.
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return localResource(request);}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !ENTRY.equals(request.getUrl().toString());}
            @Override public void onPageFinished(WebView view,String url){ready=true;invoke(foreground?"resume":"pause");}
        });
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);root.requestApplyInsets();
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        web.loadUrl(ENTRY);
    }
    private WebResourceResponse localResource(WebResourceRequest request){
        Uri uri=request.getUrl();
        if(!"https".equals(uri.getScheme())||!HOST.equals(uri.getHost())||!"GET".equals(request.getMethod()))return response("text/plain",403,new byte[0],null);
        String path=uri.getPath();if(path==null||!path.startsWith("/assets/site/"))return response("text/plain",404,new byte[0],null);
        for(String segment:uri.getPathSegments())if(segment.equals("..")||segment.equals(".")||segment.indexOf('\\')>=0)return response("text/plain",403,new byte[0],null);
        String asset=path.substring("/assets/".length());
        try(InputStream stream=getAssets().open(asset)){
            byte[] bytes=read(stream,32*1024*1024);
            if(asset.equals("site/index.html")){String html=new String(bytes,StandardCharsets.UTF_8);html=html.replace("/*NATIVE_LEGACY_DATA*/null",legacyData().toString().replace("<","\\u003c"));bytes=html.getBytes(StandardCharsets.UTF_8);}
            String mime=asset.endsWith(".html")?"text/html":asset.endsWith(".js")?"application/javascript":asset.endsWith(".css")?"text/css":asset.endsWith(".webp")?"image/webp":asset.endsWith(".png")?"image/png":asset.endsWith(".wav")?"audio/wav":"application/json";
            String range=request.getRequestHeaders().get("Range");
            if(range!=null&&range.matches("bytes=\\d+-\\d*")){String[] limits=range.substring(6).split("-",-1);long start=Long.parseLong(limits[0]),end=limits[1].isEmpty()?bytes.length-1L:Math.min(Long.parseLong(limits[1]),bytes.length-1L);if(start>=bytes.length||end<start)return response(mime,416,new byte[0],"bytes */"+bytes.length);return response(mime,206,Arrays.copyOfRange(bytes,(int)start,(int)end+1),"bytes "+start+"-"+end+"/"+bytes.length);}
            return response(mime,200,bytes,null);
        }catch(Exception ignored){return response("text/plain",404,new byte[0],null);}
    }
    private WebResourceResponse response(String mime,int status,byte[] bytes,String range){
        Map<String,String> headers=new HashMap<>();headers.put("Content-Length",Integer.toString(bytes.length));headers.put("Accept-Ranges","bytes");headers.put("Cache-Control","no-cache");headers.put("X-Content-Type-Options","nosniff");if(range!=null)headers.put("Content-Range",range);
        return new WebResourceResponse(mime,mime.startsWith("text/")||mime.contains("javascript")||mime.contains("json")?"UTF-8":null,status,status==200?"OK":status==206?"Partial Content":status==416?"Range Not Satisfiable":"Not Found",headers,new ByteArrayInputStream(bytes));
    }
    private static byte[] read(InputStream input,int maximum)throws Exception{
        ByteArrayOutputStream output=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int count;
        while((count=input.read(buffer))!=-1){if(output.size()+count>maximum)throw new IllegalArgumentException("Oversized asset");output.write(buffer,0,count);}return output.toByteArray();
    }
    private JSONObject legacyData(){
        JSONObject result=new JSONObject();for(String name:new String[]{"namako_cards.cfg","namako_settings.cfg","namako_session.cfg","namako_language.cfg"}){
            File original=findLegacy(getFilesDir(),name,3);if(original!=null)try(InputStream input=new FileInputStream(original)){result.put(name,new String(read(input,1024*1024),StandardCharsets.UTF_8));}catch(Exception ignored){}
        }return result; // Read-only import; retain all original native saves.
    }
    private File findLegacy(File directory,String name,int depth){File exact=new File(directory,name);if(exact.isFile())return exact;if(depth<=0)return null;File[] children=directory.listFiles();if(children!=null)for(File child:children)if(child.isDirectory()&&!child.getName().startsWith(".")){File found=findLegacy(child,name,depth-1);if(found!=null)return found;}return null;}
    private void invoke(String method){if(web!=null&&ready)web.evaluateJavascript("window.TsumiNamakoAndroid && window.TsumiNamakoAndroid."+method+"()",null);}
    private void handleBack(){if(!ready){finish();return;}web.evaluateJavascript("window.TsumiNamakoAndroid && window.TsumiNamakoAndroid.back()",handled->{if(!"true".equals(handled))finish();});}
    @Override public void onBackPressed(){handleBack();}
    @Override protected void onPause(){foreground=false;invoke("pause");if(web!=null)web.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();foreground=true;if(web!=null){web.onResume();invoke("resume");}}
    @Override protected void onDestroy(){if(web!=null){web.stopLoading();web.destroy();web=null;}super.onDestroy();}
}
