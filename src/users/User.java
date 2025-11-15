package users;

import service.DBConnect;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;

public abstract class User {
    String ID, type;
    static String[] normalAttributes;
    static String[] encryptedAttributes;
    public User(String ID) {
        this.ID = ID;
    }
    public void updateInfo(HashMap<String,String> map) throws SQLException {
        ArrayList<String> attNormal = new ArrayList<>();
        ArrayList<String> attEnc = new ArrayList<>();
        ArrayList<String> valNormal = new ArrayList<>();
        ArrayList<String> valEnc = new ArrayList<>();
        for(String key : map.keySet()){
            if(utils.SecurityUtils.isEncrypted(key)){
                attEnc.add(key);
                valEnc.add(map.get(key));
            } else {
                attNormal.add(key);
                valNormal.add(map.get(key));
            }
        }
        StringBuilder sql = new StringBuilder("UPDATE %s SET ".formatted(this.type));
        StringBuilder sqlEnc = new StringBuilder("UPDATE %s_encrypted SET ".formatted(this.type));
        for(int i=0;i<attNormal.size();i++){
            sql.append(i == attNormal.size() - 1 ? "%s = ? WHERE id = ?".formatted(attNormal.get(i)) : "%s = ?, ".formatted(attNormal.get(i)));
        }
        for(int i=0;i<attEnc.size();i++){
            sqlEnc.append(i == attEnc.size() - 1 ? "%s = ? WHERE id = ?".formatted(attEnc.get(i)) : "%s = ?, ".formatted(attEnc.get(i)));
        }
        valNormal.add(this.ID);
        valEnc.add(this.ID);
        if(valNormal.size() > 1)
            DBConnect.dbConnector.executeUpdate(sql.toString(), valNormal.toArray(new String[0]));
        if(valEnc.size() > 1)
            DBConnect.dbConnector.executeUpdate(sqlEnc.toString(), valEnc.toArray(new String[0]));
    }
    public HashMap<String,String> queryInfo() throws SQLException {
        HashMap<String,String> map = new HashMap<>();
        StringBuilder sql = new StringBuilder("SELECT ");
        StringBuilder sqlEnc = new StringBuilder("SELECT ");
        for(int i=0;i<normalAttributes.length;i++){
            sql.append(i == normalAttributes.length - 1 ? "%s FROM %s WHERE id = ?".formatted(normalAttributes[i],this.type) : "%s, ".formatted(normalAttributes[i]));
        }
        for(int i=0;i<encryptedAttributes.length;i++){
            sqlEnc.append(i == encryptedAttributes.length - 1 ? "%s FROM %s_encrypted WHERE id = ?".formatted(encryptedAttributes[i],this.type) : "%s, ".formatted(encryptedAttributes[i]));
        }
        String[] params = {this.ID};
        try (ResultSet rs = DBConnect.dbConnector.executeQuery(sql.toString(), params)) {
            if (rs.next()) {
                for (String att : normalAttributes) {
                    map.put(att, rs.getString(att));
                }
            }
        } catch (SQLException e) {
            System.out.println("Failed to execute SQL query: " + e.getMessage());
            throw e;
        }
        try (ResultSet rsEnc = DBConnect.dbConnector.executeQuery(sqlEnc.toString(), params)) {
            if (rsEnc.next()) {
                for (String att : encryptedAttributes) {
                    map.put(att, rsEnc.getString(att));
                }
            }
        } catch (SQLException e) {
            System.out.println("Failed to execute SQL query: " + e.getMessage());
            throw e;
        }
        return map;
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
    public static void newUser(String userType, HashMap<String,String> map) throws SQLException {
        StringBuilder sql = new StringBuilder("INSERT INTO %s (".formatted(userType));
        StringBuilder sqlEnc = new StringBuilder("INSERT INTO %s_encrypted (id, ".formatted(userType));
        ArrayList<String> valNormal = new ArrayList<>();
        ArrayList<String> valEnc = new ArrayList<>();
        ArrayList<String> attList = new ArrayList<>();
        ArrayList<String> valList = new ArrayList<>();
        for(String key : map.keySet()){
            attList.add(key);
            valList.add(map.get(key));
        }
        String[] att = attList.toArray(new String[0]);
        String[] val = valList.toArray(new String[0]);
        for(int i=0;i<att.length;i++) {
            if (utils.SecurityUtils.isEncrypted(att[i])) {
                sqlEnc.append(i == att.length - 1 ? "%s) VALUES (".formatted(att[i]) : "%s, ".formatted(att[i]));
                valEnc.add(val[i]);
            } else {
                sql.append(i == att.length - 1 ? "%s) VALUES (".formatted(att[i]) : "%s, ".formatted(att[i]));
                valNormal.add(val[i]);
                if(att[i].equals("id")){
                    valEnc.add(val[i]);
                }
            }
        }
        for(int i=0;i<valNormal.size();i++){
            sql.append(i == valNormal.size() - 1 ? "?)" : "?, ");
        }
        for(int i=0;i<valEnc.size();i++){
            sqlEnc.append(i == valEnc.size() - 1 ? "?)" : "?, ");
        }
        DBConnect.dbConnector.executeUpdate(sql.toString(), valNormal.toArray(new String[0]));
        DBConnect.dbConnector.executeUpdate(sqlEnc.toString(), valEnc.toArray(new String[0]));
    }
}
