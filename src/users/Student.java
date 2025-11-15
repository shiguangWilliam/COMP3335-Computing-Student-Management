package users;

import tables.Grades;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;

public class Student extends User{
    static String[] normalAttributes = new String[]{"id","last_name","first_name","enrollment_year"};
    static String[] encryptedAttributes = new String[]{"gender","identification_number","address","email","phone","guardian_id","guardian_relation"};
    public Student(String ID) {
        super(ID);
        this.type = "Student";
    }
    public HashMap[] queryAllGrades() throws SQLException {
        ArrayList<HashMap<String,String>> grades = Grades.getStudentGrades(ID);
        return grades.toArray(new HashMap[0]);
    }
    public HashMap[] queryAllDisciplinary() throws SQLException {
        ArrayList<HashMap<String,String>> records = tables.Disciplinary.getStudentDisciplinary(ID);
        return records.toArray(new HashMap[0]);
    }
}