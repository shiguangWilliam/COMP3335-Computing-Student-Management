package app;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import app.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

//Cookie合法校验后，映射Cookie信息到角色
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

        Session session = (Session) request.getAttribute("session");
        if (session == null) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized: missing session\"}");
            return;
        }
        String sid = session.getSid();

        //兜底检查过期
        if(session.isExpired()){
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized: session expired\"}");
            return;
        }
        //兜底检查session是否存在
        if(sessionStore.get(sid)==null){
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"unauthorized: session expired\"}");
            return;
        }

        String role = session.getRole();
        Set<String> allowed = new HashSet<>(Arrays.asList("student", "guardian", "ARO", "DRO"));
        if (role == null || !allowed.contains(role)) {
            response.setStatus(403);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"forbidden: invalid role\"}");
            return;
        }
        
        request.setAttribute("role", role);
        request.setAttribute("userId", session.getUserId());
        chain.doFilter(request, response);
    }
    private void rolePrivilegeCheck(HttpServletRequest request, HttpServletResponse response, String role, String[] requiredRoles) throws IOException {
        String uri = request.getRequestURI();
        
        if (!Arrays.asList(requiredRoles).contains(role)) {
            response.setStatus(403);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"forbidden: insufficient privileges\"}");
            return;
        }
    }


}
