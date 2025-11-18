package users;

import service.DBConnect;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;

public class DRO extends User{
    private static final String[] NORMAL_ATTRIBUTES = new String[]{"id","last_name","first_name", "department", "role"};
    private static final String[] ENCRYPTED_ATTRIBUTES = new String[]{"gender","email","phone","address","identification_number"};
    public DRO(String ID) {
        super(ID);
        this.type = "staffs";
    }
    @Override
    protected String[] getNormalAttributes() {
        return NORMAL_ATTRIBUTES;
    }
    @Override
    protected String[] getEncryptedAttributes() {
        return ENCRYPTED_ATTRIBUTES;
    }
    public void updateDisciplinary(String ID, HashMap<String, String> map) throws SQLException {
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
        StringBuilder sql = new StringBuilder("UPDATE disciplinary_records SET ");
        StringBuilder sqlEnc = new StringBuilder("UPDATE disciplinary_records_encrypted SET ");
        for(int i=0;i<attNormal.size();i++){
            sql.append(i == attNormal.size() - 1 ? "%s = ? WHERE id = ?".formatted(attNormal.get(i)) : "%s = ?, ".formatted(attNormal.get(i)));
        }
        for(int i=0;i<attEnc.size();i++){
            sqlEnc.append(i == attEnc.size() - 1 ? "%s = ? WHERE id = ?".formatted(attEnc.get(i)) : "%s = ?, ".formatted(attEnc.get(i)));
        }
        valNormal.add(ID);
        valEnc.add(ID);
        if(valNormal.size() > 1)
            DBConnect.dbConnector.executeUpdate(sql.toString(), valNormal.toArray(new String[0]));
        if(valEnc.size() > 1)
            DBConnect.dbConnector.executeUpdate(sqlEnc.toString(), valEnc.toArray(new String[0]));
    }
    public void addDisciplinary(String ID, String studentID, String date, String staffID, String descriptions) throws SQLException {
        String sql = "INSERT INTO disciplinary_records (id, student_id, date, staff_id) VALUES (?, ?, ?, ?)";
        String sqlEnc = "INSERT INTO disciplinary_records_encrypted (id, descriptions) VALUES (?, ?)";
        String[] params = {ID, studentID, date, staffID};
        String[] paramsEnc = {ID, descriptions};
        try {
            DBConnect.dbConnector.executeUpdate(sql, params);
            try {
                DBConnect.dbConnector.executeUpdate(sqlEnc, paramsEnc);
            } catch (SQLException encEx) {
                
                DBConnect.dbConnector.executeUpdate("DELETE FROM disciplinary_records WHERE id = ?", new String[]{ID});
                throw encEx;
            }
        } catch (SQLException e) {
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
    }
    public void deleteDisciplinary(String ID) throws SQLException {
        try {
            String sqlEnc = "DELETE FROM disciplinary_records_encrypted WHERE id = ?";
            String[] params = {ID};
            DBConnect.dbConnector.executeUpdate(sqlEnc, params);
            String sql = "DELETE FROM disciplinary_records WHERE id = ?";
            DBConnect.dbConnector.executeUpdate(sql, params);
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
            throw e;
        }
    }
}
