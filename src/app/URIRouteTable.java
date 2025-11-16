package app;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
//URI表，存储路由到角色的映射，用于判断当前角色发起的路由是否合法。
public class URIRouteTable {
    private static final Map<String, String[]> routeTable = new HashMap<>();

    private static String key(String method, String path) {
        return (method == null ? "" : method.toUpperCase()) + "|" + path;
    }

    static {
        // profile
        routeTable.put(key("GET", "/API/profile"), new String[]{"student","guardian","ARO","DRO"});
        routeTable.put(key("PUT", "/API/profile"), new String[]{"student","guardian","ARO","DRO"});
        routeTable.put(key("PUT", "/API/modified_Passowrd"), new String[]{"student","guardian","ARO","DRO"});

        // students
        routeTable.put(key("GET", "/API/students"), new String[]{"ARO", "DRO"});

        // guardians
        routeTable.put(key("GET", "/API/guardians"), new String[]{"ARO", "DRO"});

        // courses
        routeTable.put(key("GET", "/API/courses"), new String[]{"ARO", "DRO"});
        routeTable.put(key("POST", "/API/courses"), new String[]{"ARO", "DRO"});
        routeTable.put(key("PUT", "/API/courses"), new String[]{"ARO", "DRO"});
        routeTable.put(key("DELETE", "/API/courses"), new String[]{"ARO", "DRO"});

        // enrollments
        routeTable.put(key("GET", "/API/enrollments"), new String[]{"ARO", "DRO"});
        routeTable.put(key("POST", "/API/enrollments"), new String[]{"ARO", "DRO"});
        routeTable.put(key("DELETE", "/API/enrollments"), new String[]{"ARO", "DRO"});

        // grades
        routeTable.put(key("GET", "/API/grades"), new String[]{"student", "guardian", "ARO"});
        routeTable.put(key("POST", "/API/grades"), new String[]{"ARO"});

        // reports
        routeTable.put(key("POST", "/API/reports"), new String[]{"student", "guardian", "ARO", "DRO"});
        routeTable.put(key("GET", "/API/reports"), new String[]{"student", "guardian", "ARO", "DRO"});

        // admin summary
        routeTable.put(key("GET", "/API/admin-summary"), new String[]{"ARO", "DRO"});

        // disciplinary records
        routeTable.put(key("GET", "/API/disciplinary-records"), new String[]{"DRO"});
        routeTable.put(key("POST", "/API/disciplinary-records"), new String[]{"DRO"});
        routeTable.put(key("PUT", "/API/disciplinary-records"), new String[]{"DRO"});
        routeTable.put(key("DELETE", "/API/disciplinary-records"), new String[]{"DRO"});
    }

    private static final Set<String> publicRoutes = new HashSet<>();
    static {
        publicRoutes.add(key("POST", "/API/login"));
        publicRoutes.add(key("POST", "/API/register"));
        publicRoutes.add(key("POST", "/API/logout"));
        publicRoutes.add(key("GET", "/API/public-key"));
    }

    public static boolean isPublic(String method, String path) {
        return publicRoutes.contains(key(method, path));
    }


    public static String[] rolesFor(String method, String path) {
        return routeTable.get(key(method, path));
    }

}
