package users;

import service.DBConnect;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetProvider;
import java.sql.ResultSet;
import java.sql.SQLException;

public abstract class User {
    String ID, type;
    public User(String ID) {
        this.ID = ID;
    }
    public void update(String[] att, String[] val, boolean encrypted) throws SQLException {
        StringBuilder sql = new StringBuilder("UPDATE %s SET ".formatted(this.type + (encrypted?"_encrypted":"")));
        String[] params = new String[val.length+1];
        for (int i = 0; i < att.length; i++) {
            sql.append(i == att.length - 1 ? "%s = ? WHERE id = ?" : "%s = ?, ".formatted(att[i]));
            params[i] = val[i];
        }
        params[val.length] = this.ID;
        DBConnect.dbConnector.executeUpdate(sql.toString(), params);
    }
    public ResultSet query(String[] att, boolean encrypted) throws SQLException {
        StringBuilder sql = new StringBuilder("SELECT ");
        for (int i = 0; i < att.length; i++) {
            sql.append(i == att.length - 1 ? "%s FROM %s WHERE id = ?".formatted(att[i], this.type + (encrypted?"_encrypted":"")) : "%s, ".formatted(att[i]));
        }
        String[] params = {this.ID};
        try(ResultSet rs = DBConnect.dbConnector.executeQuery(sql.toString(), params)) {;
            CachedRowSet crs = RowSetProvider.newFactory().createCachedRowSet();
            crs.populate(rs);
            return crs;
        } catch(SQLException e) {
            System.out.println("Failed to execute SQL query: " + e.getMessage());
            throw e;
        }
    }
    public static User checkLogin(String ID, String passwdHash, String userType) throws SQLException {
        String sql = "SELECT COUNT(*) AS count FROM %s_encrypted WHERE id = ? AND passwd_hash = ?".formatted(userType);
        String[] params = {ID, passwdHash};
        try (ResultSet rs = DBConnect.dbConnector.executeQuery(sql, params)) {
            if (rs.next() && rs.getInt("count") > 0) {
                switch (userType) {
                    case "Student":
                        return new Student(ID);
                    case "Guardian":
                        return new Guardian(ID);
                    case "Staff":
                        String staffTypeSql = "SELECT role FROM staffs WHERE id = ?";
                        String[] staffTypeParams = {ID};
                        try(ResultSet staffRs = DBConnect.dbConnector.executeQuery(staffTypeSql, staffTypeParams)){
                            if (staffRs.next()) {
                                String staffType = staffRs.getString("staff_type");
                                switch (staffType) {
                                    case "ARO":
                                        return new ARO(ID);
                                    case "DRO":
                                        return new DRO(ID);
                                }
                            }
                        }
                    default:
                        return null;
                }
            } else {
                return null;
            }
        } catch (SQLException e) {
            System.out.println("Failed to execute SQL query: " + e.getMessage());
            throw e;
        }
    }
}
