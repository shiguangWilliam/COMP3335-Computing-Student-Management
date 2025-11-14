package users;

public class Student extends User{
    public Student(String ID) {
        super(ID);
        this.type = "Student";
    }
}
