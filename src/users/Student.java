package users;

import tables.Grades;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;

public class Student extends User{
    private static final String[] NORMAL_ATTRIBUTES = new String[]{"id","last_name","first_name","enrollment_year"};
    private static final String[] ENCRYPTED_ATTRIBUTES = new String[]{"gender","identification_number","address","email","phone","guardian_id","guardian_relation"};
    public Student(String ID) {
        super(ID);
        this.type = "Students";
    }
    @Override
    protected String[] getNormalAttributes() {
        return NORMAL_ATTRIBUTES;
    }
    @Override
    protected String[] getEncryptedAttributes() {
        return ENCRYPTED_ATTRIBUTES;
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
