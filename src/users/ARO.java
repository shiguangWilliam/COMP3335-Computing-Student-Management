package users;

public class ARO extends User{
    static String[] normalAttributes = new String[]{"id","last_name","first_name", "department", "role"};
    static String[] encryptedAttributes = new String[]{"gender","email","phone","address","identification_number"};
    public ARO(String ID) {
        super(ID);
        this.type = "ARO";
    }
}
