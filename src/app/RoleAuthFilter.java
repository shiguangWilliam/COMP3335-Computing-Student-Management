package app;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import app.Session;
import app.URIRouteTable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

//Cookie合法校验后，映射Cookie信息到角色，进行非法路由约束
@Component
@Order(Ordered.HIGHEST_PRECEDENCE+3)
public class RoleAuthFilter implements Filter {
    
    private final SessionStore sessionStore;
    public RoleAuthFilter(SessionStore sessionStore) {
        this.sessionStore = sessionStore;
    }
    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        String method = request.getMethod();
        String uri = request.getRequestURI();

        if (URIRouteTable.isPublic(method, uri)) {
            chain.doFilter(request, response);
            return;
        }

        Session session = (Session) request.getAttribute("session");
        if (session == null) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized: missing session\"}");
            return;
        }
        String sid = session.getSid();

        //过期
        if(session.isExpired()){
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized: session expired\"}");
            return;
        }
        //session
        if(sessionStore.get(sid)==null){
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized: session expired\"}");
            return;
        }
        //合法身份
        String role = session.getRole();
        Set<String> allowed = new HashSet<>(Arrays.asList("student", "guardian", "ARO", "DRO"));
        if (role == null || !allowed.contains(role)) {
            response.setStatus(403);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"forbidden: invalid role\"}");
            return;
        }
        //合法路由
        String[] requiredRoles = URIRouteTable.rolesFor(method, uri);
        if (requiredRoles == null || !Arrays.asList(requiredRoles).contains(role)) {
            response.setStatus(403);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"forbidden: insufficient privileges\"}");
            return;
        }
        
        request.setAttribute("role", role);
        request.setAttribute("userId", session.getUserId());
        chain.doFilter(request, response);
    }
    


}
