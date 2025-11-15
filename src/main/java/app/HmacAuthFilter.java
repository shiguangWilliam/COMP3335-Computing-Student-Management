package app;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.web.util.ContentCachingRequestWrapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE+1)
public class HmacAuthFilter implements Filter {
    private static final Logger log = LoggerFactory.getLogger(HmacAuthFilter.class);

    private byte[] hmacSharedKey;
    private Cache<String, Boolean> nonceCache;//高速TTL缓存

    private static final long NONCE_TTL_MS = 5 * 60 * 1000; // 5 分钟内去重
    private static final long TIMESTAMP_WINDOW_MS = 300_000; // ±300 秒重放
    //校验HMAC，时间戳，Nonce随机数

    public HmacAuthFilter(@Qualifier("gateWayHmacSharedKey") byte[] hmacSharedKey){
        
        this.hmacSharedKey = hmacSharedKey;
        this.nonceCache = Caffeine.newBuilder()
                .expireAfterWrite(NONCE_TTL_MS, TimeUnit.MILLISECONDS)
                .maximumSize(100_000)
                .build();
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        System.out.println("[Debug] HMACAuth started");
        try{
            // 公钥接口不需要 HMAC 校验，直接放行
            String uri = request.getRequestURI();
            if ("/API/public-key".equals(uri)) {
                filterChain.doFilter(request, response);
                return;
            }
            validateHmacHead(request);
            filterChain.doFilter(request,response);
        }
        catch(HmacValidationException exception){
            log.warn("HMAC validation failed: {}", exception.getMessage());
            response.setStatus(exception.getStatusCode());
            response.getWriter().write("{\"error\":\"unAuthorized\"}");
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
        }
    }

    private void validateHmacHead(HttpServletRequest req) throws HmacValidationException{
        String alg = req.getHeader("X-Gateway-Signature-Alg");
        String signature = req.getHeader("X-Gateway-Signature");//base64
        String timestamp = req.getHeader("X-Gateway-Timestamp");
        String nonce = req.getHeader("X-Gateway-Nonce");

        if(alg==null || signature==null || timestamp==null || nonce==null){
            throw new HmacValidationException("Header parameter missing",401);
        }
        System.out.println(alg);
        if(alg.equals("HMAC-SHA256") == false ){
            throw new HmacValidationException("Unsupport algrithom",403);
        }
        //读取时间戳
        long time;
        try{
            time = Long.parseLong(timestamp);
        } catch (NumberFormatException e) {
            throw new HmacValidationException("Invalid timestamp",401);
        }
        //校验时间戳
        long curTime = System.currentTimeMillis();
        if((curTime - time)>TIMESTAMP_WINDOW_MS){
            throw new HmacValidationException("TimeStamp Out of range",401);
        }
        // Nonce 去重（重放）：使用 Caffeine TTL 缓存，原子检查并写入
        Boolean prev = nonceCache.asMap().putIfAbsent(nonce, Boolean.TRUE);
        if (prev != null) {
            throw new HmacValidationException("Replayed nonce", 401);
        }
        // 签名信息构建：使用原始请求体字符串（与前端 JSON.stringify 一致）
        String body = new String(getRequestBody(req), StandardCharsets.UTF_8);

        String method = req.getMethod();//Method
        String pathWithQuery = req.getRequestURI();//API path
        if (req.getQueryString() != null) {//拼接Query参数
            pathWithQuery += "?" + req.getQueryString();
        }
        String canonical = String.join("|",
                method,
                pathWithQuery,
                body != null ? body : "",
                String.valueOf(timestamp),
                nonce
        );
        System.out.println("[Debug] Key:"+new String(hmacSharedKey,StandardCharsets.UTF_8));
        System.out.println("[Debug] Key Length:"+hmacSharedKey.length);
        System.out.println("[Debug] Canonical:"+canonical);
        byte[] expectSignature = hmacSha256(canonical,hmacSharedKey);// 计算期望 HMAC
        byte[] providedSignature;
        try {
            providedSignature = Base64.getDecoder().decode(signature);
            System.out.println("[Debug]:expect:"+expectSignature);
            System.out.println("[Debug]:provide:"+providedSignature);
            System.out.println("[Debug]:Origin:"+signature);
        } catch (IllegalArgumentException e) {
            throw new HmacValidationException("Invalid signature encoding",401);
        }
        if(!MessageDigest.isEqual(expectSignature, providedSignature)){//防御时序攻击（遍历整个数组，返回时间固定）
            throw new HmacValidationException("Invalid Signature",401);
        }


    }
    private byte[] hmacSha256(String context, byte[] key){
        try{
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(key, "HmacSHA256");
            mac.init(keySpec);
            return mac.doFinal(context.getBytes(StandardCharsets.UTF_8));
        } catch(Exception e){
            log.warn("HMAC calculate error:"+e);
            throw new RuntimeException("HMAC Error",e);
        }
    }
    private byte[] getRequestBody(HttpServletRequest request){
            if(request instanceof ContentCachingRequestWrapper){
                byte[] bytes = ((ContentCachingRequestWrapper)request).getContentAsByteArray();
                if (bytes != null) return bytes;
            }
            try {
                return request.getInputStream().readAllBytes();
            } catch (IOException e) {
                log.warn("Failed to read request body: {}", e.toString());
                System.out.println("No cache found for request body");
                return new byte[0];
            }
    }
}
