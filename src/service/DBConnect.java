package service;

import javax.sql.DataSource;
import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetProvider;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

@Service
public class DBConnect {

    @Autowired
    private DataSource dataSource;

    // 供现有代码静态访问的“软单例”，由 Spring 初始化时赋值
    public static DBConnect dbConnector;

    @Autowired
    public void setSelf() {
        dbConnector = this;
    }

    public void executeUpdate(String sql, String[] params) throws SQLException {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                pstmt.setString(i + 1, params[i]);
            }
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.out.println("Failed to execute SQL update: " + e.getMessage());
            throw e;
        }
    }

    public ResultSet executeQuery(String sql, String[] params) throws SQLException {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                pstmt.setString(i + 1, params[i]);
            }
            CachedRowSet crs = RowSetProvider.newFactory().createCachedRowSet();
            try (ResultSet rs = pstmt.executeQuery()) {
                crs.populate(rs);
            }
            return crs;
        } catch (SQLException e) {
            System.out.println("Failed to execute SQL query: " + e.getMessage());
            throw e;
        }
    }

    public ResultSet executeQuery(String sql) throws SQLException {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            CachedRowSet crs = RowSetProvider.newFactory().createCachedRowSet();
            try (ResultSet rs = pstmt.executeQuery()) {
                crs.populate(rs);
            }
            return crs;
        } catch (SQLException e) {
            System.out.println("Failed to execute SQL query: " + e.getMessage());
            throw e;
        }
    }
}
