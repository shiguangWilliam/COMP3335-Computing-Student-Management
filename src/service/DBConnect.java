package service;
import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetProvider;
import java.io.IOException;
import java.io.InputStream;
import java.sql.*;
import java.util.Properties;

public class DBConnect {
    private static final String DEFAULT_URL;
    static {
        String urlFromProps = null;
        try (InputStream in = DBConnect.class.getClassLoader().getResourceAsStream("application.properties")) {
            if (in != null) {
                Properties props = new Properties();
                props.load(in);
                urlFromProps = props.getProperty("spring.datasource.url");
            }
        } 
        catch (IOException e) {
            System.out.println("Failed to load DB url from application.properties: " + e.getMessage());//异常提示
        }
        if (urlFromProps == null || urlFromProps.isBlank()) {
            urlFromProps = "jdbc:mysql://localhost:3306/COMP3335?user=root&password=!testCOMP3335";//如果读取失败，使用默认值
        }
        DEFAULT_URL = urlFromProps;
    }

    private final String url;
    private Connection conn = null;

    public static final DBConnect dbConnector = new DBConnect(DEFAULT_URL);

    private DBConnect(String url) {
        this.url = url;
    }

    private synchronized void ensureConnection() throws SQLException {
        try {
            if (this.conn != null && !this.conn.isClosed()) {
                return;
            }
        } catch (SQLException e) {
        }
        try {
            this.conn = DriverManager.getConnection(this.url);
            System.out.println("Connection established successfully.");
        } catch (SQLException e) {
            System.out.println("Connection failed: " + e.getMessage());
            throw e;
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
        ensureConnection();
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
        ensureConnection();
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
        ensureConnection();
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
