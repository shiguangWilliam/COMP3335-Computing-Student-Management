package service;
import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetProvider;
import java.sql.*;

public class DBConnect {
    private Connection conn = null;
    public final static DBConnect dbConnector = new DBConnect("jdbc:mysql://localhost:3306/COMP3335?user=root&password=!testCOMP3335");
    private DBConnect(String url) {
        try {
            conn = DriverManager.getConnection(url);
            System.out.println("Connection established successfully.");
        } catch (SQLException e) {
            System.out.println("Connection failed: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
    public void closeConnection() throws SQLException {
        try {
            if (conn != null && !conn.isClosed()) {
                conn.close();
                System.out.println("Connection closed successfully.");
            }
        } catch (SQLException e) {
            System.out.println("Failed to close connection: " + e.getMessage());
            throw e;
        }
    }
    public void executeUpdate(String sql,String[] params) throws SQLException {
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                pstmt.setString(i + 1, params[i]);
            }
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.out.println("Failed to execute SQL update: " + e.getMessage());
            throw e;
        }
    }
    public ResultSet executeQuery(String sql,String[] params) throws SQLException {
        try(PreparedStatement pstmt = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                pstmt.setString(i + 1, params[i]);
            }
            CachedRowSet crs = RowSetProvider.newFactory().createCachedRowSet();
            crs.populate(pstmt.executeQuery());
            return crs;
        } catch (SQLException e) {
            System.out.println("Failed to execute SQL query: " + e.getMessage());
            throw e;
        }
    }

    public ResultSet executeQuery(String sql) throws SQLException {
        try(PreparedStatement pstmt = conn.prepareStatement(sql)) {

            CachedRowSet crs = RowSetProvider.newFactory().createCachedRowSet();
            crs.populate(pstmt.executeQuery());
            return crs;
        } catch (SQLException e) {
            System.out.println("Failed to execute SQL query: " + e.getMessage());
            throw e;
        }
    }
}
