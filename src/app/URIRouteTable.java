package app;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class URIRouteTable {
    private static final Map<String, String[]> routeTable = new HashMap<>();

    static {
        routeTable.put("/API/profile", new String[]{"ARO","DRO","Guardian","Student"});
        routeTable.put("/API/student", new String[]{"USER", "ADMIN"});
        routeTable.put("/API/teacher", new String[]{"USER", "ADMIN"});
        routeTable.put("/API/course", new String[]{"USER", "ADMIN"});
        routeTable.put("/API/enrollment", new String[]{"USER", "ADMIN"});
    }
    private static final Set<String> publicRoutes = new HashSet<>();
    static {
        publicRoutes.add("/API/login");
        publicRoutes.add("/API/register");
        publicRoutes.add("/API/logout");
        publicRoutes.add("/API/public-key");
    }
}
