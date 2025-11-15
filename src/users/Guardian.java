package users;

import service.DBConnect;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;

public class Guardian extends User {
    static String[] normalAttributes = new String[]{"id","last_name","first_name"};
    static String[] encryptedAttributes = new String[]{"email","phone"};
    public Guardian(String ID) {
        super(ID);
        this.type = "Guardian";
    }
    public HashMap[] getChildGrades() throws SQLException{
        ArrayList<HashMap<String,String>> childGrades = new ArrayList<>();
        String sql = "SELECT id FROM students_encrypted WHERE guardian_id = ?";
        String[] params = {this.ID};
        ResultSet rs = DBConnect.dbConnector.executeQuery(sql,params);
        while(rs.next()){
            String studentID = rs.getString("id");
            ArrayList<HashMap<String,String>> grades = tables.Grades.getStudentGrades(studentID);
            childGrades.addAll(grades);
        }
        return childGrades.toArray(new HashMap[0]);
    }
    public HashMap[] getChildDisciplinary() throws SQLException{
        ArrayList<HashMap<String,String>> childDisciplinary = new ArrayList<>();
        String sql = "SELECT id FROM students_encrypted WHERE guardian_id = ?";
        String[] params = {this.ID};
        ResultSet rs = DBConnect.dbConnector.executeQuery(sql,params);
        while(rs.next()){
            String studentID = rs.getString("id");
            ArrayList<HashMap<String,String>> disciplinary = tables.Disciplinary.getStudentDisciplinary(studentID);
            childDisciplinary.addAll(disciplinary);
        }
        return childDisciplinary.toArray(new HashMap[0]);
    }
}
