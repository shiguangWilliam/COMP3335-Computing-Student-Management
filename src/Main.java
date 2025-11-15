
import java.io.IOException;
import java.net.InetSocketAddress;
import java.sql.SQLException;
import java.util.concurrent.Executors;

import com.mysql.cj.x.protobuf.MysqlxDatatypes;
import com.sun.net.httpserver.HttpServer;

public class Main {
    public static void main(String[] args) throws IOException {
        System.out.println("Hello, World!");
//        HttpServer server = HttpServer.create(new InetSocketAddress(3335),0);
//        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());

        try {
            service.DBConnect.dbConnector.closeConnection();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }
}