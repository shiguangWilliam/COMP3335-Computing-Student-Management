package app;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE+2)
public class SessionFilter implements Filter {
    private static final Logger log = LoggerFactory.getLogger(SessionFilter.class);

    private final SessionStore sessionStore;

    private static final Set<String> PUBLIC_PATHS = new HashSet<>(Arrays.asList(
            "/API/public-key",
            "/API/login",
            "/API/logout"
    ));

    public SessionFilter(SessionStore sessionStore) {
        this.sessionStore = sessionStore;
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String uri = request.getRequestURI();

        // 公共接口允许匿名访问
        if (PUBLIC_PATHS.contains(uri)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 受保护接口：必须存在有效 sid
        String sid = readSidCookie(request);
        if (sid == null || sid.isBlank()) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized: missing sid\"}");
            return;
        }

        Session session = sessionStore.get(sid);
        if (session == null) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized: invalid or expired sid\"}");
            return;
        }

        //确认会话未过期
        if (session.isExpired()) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized: session expired\"}");
            return;
        }

        //未过期会话，绑定session的请求属性方便调用（解码多cookie）
        request.setAttribute("session", session);
        filterChain.doFilter(request, response);
    }

    private String readSidCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if ("sid".equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }
}