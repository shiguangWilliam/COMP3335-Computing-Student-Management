package app;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
// 使用自定义可重读封装，确保后续过滤器能读取原始 Body

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CachingRequestBodyFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
                System.out.println("[Debug] CachingRequestBodyFilter started");
        HttpServletRequest req = (HttpServletRequest) request;
        CachedBodyHttpServletRequest wrapped = new CachedBodyHttpServletRequest(req);
        System.out.println("[Debug] CachingRequestBodyFilter started");
        chain.doFilter(wrapped, response);
    }
}