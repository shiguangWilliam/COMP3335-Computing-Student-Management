import java.sql.SQLException;
import service.DBConnect;
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        try {
            DBConnect.dbConnector.closeConnection();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }
}