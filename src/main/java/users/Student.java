package users;

public class Student extends User{
    static String[] normalAttributes = new String[]{"id","last_name","first_name","enrollment_year"};
    static String[] encryptedAttributes = new String[]{"gender","identification_number","address","email","phone","guardian_id","guardian_relation"};
    public Student(String ID) {
        super(ID);
        this.type = "Student";
    }

}
